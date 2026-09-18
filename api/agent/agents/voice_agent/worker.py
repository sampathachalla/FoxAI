"""Low-latency LiveKit voice worker for FoxAI.

Ears: LiveKit WebRTC -> Silero VAD -> Groq Whisper Large v3 Turbo
Brain: Groq LLM, directly, via LiveKit's own llm_node
Mouth: frontend-selectable Edge / Piper / Deepgram TTS

This worker is a LiveKit Agent — pure realtime transport. It carries no
Hermes dependency and no reasoning of its own beyond the session's own LLM:
for anything heavier than a quick spoken reply it hands the task off to the
separate FastAPI agent process (see ``delegate_to_worker_agent`` below),
which is where FoxAI's real orchestrator — upstream Nous Research Hermes —
lives. TTS streams are cancellation-aware so a barge-in does not leave an old
turn racing the new one.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from typing import AsyncIterable, AsyncIterator, Callable, Optional

from dotenv import load_dotenv

import aiohttp
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    RunContext,
    cli,
    function_tool,
)
from livekit.agents.utils.audio import AudioByteStream
from livekit.agents.utils.codecs import AudioStreamDecoder
from livekit.plugins import deepgram, groq, silero

from tts.service import stream_encoded_speech, stream_pcm_speech

load_dotenv()
logger = logging.getLogger("fox.voice")

SUPPORTED_TTS_PROVIDERS = {"edge", "piper", "deepgram"}
DEFAULT_TTS_PROVIDER = os.getenv("VOICE_TTS_PROVIDER", "edge").lower()
FIRST_PHRASE_MIN_CHARS = int(os.getenv("VOICE_TTS_FIRST_PHRASE_MIN_CHARS", "24"))
FIRST_PHRASE_MAX_CHARS = int(os.getenv("VOICE_TTS_FIRST_PHRASE_MAX_CHARS", "96"))
PHRASE_MIN_CHARS = int(os.getenv("VOICE_TTS_PHRASE_MIN_CHARS", "44"))
PHRASE_MAX_CHARS = int(os.getenv("VOICE_TTS_PHRASE_MAX_CHARS", "180"))

# The heavy FastAPI agent (backed by upstream Hermes) runs in its own
# container. Keeping the HTTP boundary prevents long-running work from
# blocking voice turns and keeps both services independently deployable.
PYTHON_AGENT_URL = os.getenv("HERMES_FASTAPI_URL", "http://127.0.0.1:8000").rstrip("/")
DELEGATE_TIMEOUT_S = float(os.getenv("VOICE_DELEGATE_TIMEOUT_S", "180"))
DELEGATE_SPOKEN_CHARS = int(os.getenv("VOICE_DELEGATE_SPOKEN_CHARS", "700"))


@dataclass
class TurnLatency:
    """Small app-level latency trace for stages custom LiveKit metrics cannot see."""

    turn_no: int = 0
    marks: dict[str, float] = field(default_factory=dict)

    def new_turn(self) -> None:
        self.turn_no += 1
        self.marks = {}

    def mark(self, name: str) -> None:
        if name not in self.marks:
            self.marks[name] = time.perf_counter()

    def log_first_audio(self, *, provider: str) -> None:
        self.mark("first_audio")
        base = self.marks.get("speech_end") or self.marks.get("stt_final")
        if base is None:
            return

        def ms(name: str) -> Optional[float]:
            value = self.marks.get(name)
            return round((value - base) * 1000, 1) if value is not None else None

        logger.info(
            "voice_latency turn=%s provider=%s speech_end_to_stt_ms=%s "
            "speech_end_to_llm_start_ms=%s speech_end_to_first_llm_ms=%s "
            "speech_end_to_first_phrase_ms=%s speech_end_to_first_audio_ms=%s",
            self.turn_no,
            provider,
            ms("stt_final"),
            ms("llm_start"),
            ms("first_llm_delta"),
            ms("first_tts_phrase"),
            ms("first_audio"),
        )


def _best_cut(buffer: str, min_chars: int, max_chars: int) -> int:
    """Choose a natural low-latency phrase boundary without cutting words."""
    if len(buffer) < min_chars:
        return 0

    sentence = re.search(r"[.!?](?:\s|$)", buffer)
    if sentence and sentence.end() >= min_chars:
        return sentence.end()

    search_end = min(len(buffer), max_chars)
    window = buffer[:search_end]
    clause_positions = [
        window.rfind(", "),
        window.rfind("; "),
        window.rfind(": "),
        window.rfind(" — "),
    ]
    clause = max(clause_positions)
    if clause >= min_chars:
        return clause + 1

    if len(buffer) < max_chars:
        return 0

    whitespace = window.rfind(" ")
    return whitespace if whitespace >= min_chars else max_chars


async def _phrase_stream(
    text_stream: AsyncIterable[str],
    *,
    on_first_phrase: Optional[Callable[[], None]] = None,
) -> AsyncIterator[str]:
    """Convert token deltas into an aggressively-fast first phrase, then normal chunks."""
    buffer = ""
    first_phrase = True

    async for delta in text_stream:
        if not delta:
            continue
        buffer += str(delta)

        while buffer:
            min_chars = FIRST_PHRASE_MIN_CHARS if first_phrase else PHRASE_MIN_CHARS
            max_chars = FIRST_PHRASE_MAX_CHARS if first_phrase else PHRASE_MAX_CHARS
            cut = _best_cut(buffer, min_chars, max_chars)
            if cut <= 0:
                break

            phrase = buffer[:cut].strip()
            buffer = buffer[cut:].lstrip()
            if not phrase:
                continue
            if first_phrase and on_first_phrase:
                on_first_phrase()
            first_phrase = False
            yield phrase

    tail = buffer.strip()
    if tail:
        if first_phrase and on_first_phrase:
            on_first_phrase()
        yield tail


async def _decode_edge_phrase(
    phrase: str,
    voice: str | None,
) -> AsyncIterator[rtc.AudioFrame]:
    """Decode Edge MP3 while bytes are still arriving from the provider."""
    decoder = AudioStreamDecoder(
        sample_rate=48000,
        num_channels=1,
        format="audio/mpeg",
    )
    producer_error: BaseException | None = None

    async def produce() -> None:
        nonlocal producer_error
        try:
            async for audio_bytes, _ in stream_encoded_speech(
                phrase,
                engine="edge",
                voice=voice or None,
            ):
                decoder.push(audio_bytes)
            decoder.end_input()
        except BaseException as exc:
            producer_error = exc
            decoder.end_input()

    producer = asyncio.create_task(produce())
    try:
        async for frame in decoder:
            yield frame
        await producer
        if producer_error:
            raise producer_error
    finally:
        if not producer.done():
            producer.cancel()
            try:
                await producer
            except asyncio.CancelledError:
                pass
        await decoder.aclose()


async def _stream_piper_phrase(
    phrase: str,
    voice: str | None,
) -> AsyncIterator[rtc.AudioFrame]:
    """Turn Piper's streamed S16_LE PCM into progressive LiveKit frames."""
    audio_stream: AudioByteStream | None = None
    async for pcm_bytes, sample_rate, channels in stream_pcm_speech(
        phrase,
        engine="piper",
        voice=voice or None,
    ):
        if audio_stream is None:
            audio_stream = AudioByteStream(
                sample_rate=sample_rate,
                num_channels=channels,
                samples_per_channel=max(sample_rate // 10, 1),
                progressive=True,
            )
        for frame in audio_stream.push(pcm_bytes):
            yield frame

    if audio_stream is not None:
        for frame in audio_stream.flush():
            yield frame


async def _fox_tts_audio(
    text_stream: AsyncIterable[str],
    provider: str,
    voice: str | None,
    *,
    latency: TurnLatency,
) -> AsyncIterator[rtc.AudioFrame]:
    """Stream Edge/Piper audio with cancellation propagated to provider work."""
    first_audio = True

    async for phrase in _phrase_stream(
        text_stream,
        on_first_phrase=lambda: latency.mark("first_tts_phrase"),
    ):
        frames = (
            _decode_edge_phrase(phrase, voice)
            if provider == "edge"
            else _stream_piper_phrase(phrase, voice)
        )
        async for frame in frames:
            if first_audio:
                first_audio = False
                latency.log_first_audio(provider=provider)
            yield frame


# Background task refs kept alive at module scope (a module-level tool has no
# instance to hold them). Discarded automatically when each task finishes.
_DELEGATIONS: set[asyncio.Task] = set()


async def _run_delegation(session: AgentSession, task: str) -> None:
    """Call the heavy python agent and speak its result. Never raises."""
    try:
        timeout = aiohttp.ClientTimeout(total=DELEGATE_TIMEOUT_S)
        async with aiohttp.ClientSession(timeout=timeout) as http:
            async with http.post(
                f"{PYTHON_AGENT_URL}/agent/run", json={"prompt": task}
            ) as resp:
                body = await resp.text()
                if resp.status != 200:
                    raise RuntimeError(f"HTTP {resp.status}: {body[:200]}")
                payload = json.loads(body)
    except Exception:
        logger.exception("Delegated task failed")
        try:
            await session.say("Sorry, I ran into a problem finishing that task.")
        except Exception:
            logger.debug("Could not announce delegation failure", exc_info=True)
        return

    data = payload.get("data") if isinstance(payload, dict) else None
    text = ""
    if isinstance(data, dict):
        text = str(data.get("text") or data.get("final_response") or "").strip()
    if not text:
        text = "That's finished, but the agent returned no text."

    spoken = (
        text
        if len(text) <= DELEGATE_SPOKEN_CHARS
        else text[:DELEGATE_SPOKEN_CHARS].rstrip() + "…"
    )
    try:
        await session.say(f"Okay, here's what I've got. {spoken}")
    except Exception:
        logger.exception("Failed to speak delegated result")


@function_tool
async def delegate_to_worker_agent(context: RunContext, task: str) -> str:
    """Hand off work that needs more than a quick spoken answer: drafting or
    writing documents, research that needs web sources, code, data lookups, or
    any task that takes multiple steps or tools. The heavy FastAPI agent process
    runs it in the background and the result is spoken aloud when ready.
    Reply to the user with a short acknowledgement only; do not attempt the task
    yourself.

    Args:
        task: A self-contained description of what to produce, in the user's own
            words plus any context needed to do it without a follow-up question.
    """
    job = asyncio.create_task(_run_delegation(context.session, task))
    _DELEGATIONS.add(job)
    job.add_done_callback(_DELEGATIONS.discard)
    logger.info("Delegated task to python agent: %s", task[:160])
    return (
        "Working on that in the background now — I'll read it back to you as "
        "soon as it's ready."
    )


class FoxVoiceAgent(Agent):
    def __init__(
        self,
        *,
        deepgram_available: bool,
    ) -> None:
        super().__init__(
            instructions=(
                "You are Fox, a fast conversational voice assistant. "
                "Keep spoken answers natural and concise. "
                "For anything that needs real work rather than a quick reply "
                "— drafting or writing documents, research with sources, "
                "code, data lookups, or multi-step tasks — call the "
                "delegate_to_worker_agent tool and give the user a brief "
                "acknowledgement while it runs."
            ),
            tools=[delegate_to_worker_agent],
        )
        self.deepgram_available = deepgram_available
        self.tts_provider = (
            DEFAULT_TTS_PROVIDER if DEFAULT_TTS_PROVIDER in SUPPORTED_TTS_PROVIDERS else "edge"
        )
        self.tts_voice = ""
        self.latency = TurnLatency()

    def update_tts_preferences(self, provider: str | None, voice: str | None) -> None:
        requested = (provider or "").strip().lower()
        if requested in SUPPORTED_TTS_PROVIDERS:
            if requested == "deepgram" and not self.deepgram_available:
                logger.warning(
                    "Deepgram selected but DEEPGRAM_API_KEY is missing; falling back to Edge TTS"
                )
                self.tts_provider = "edge"
            else:
                self.tts_provider = requested

        self.tts_voice = (voice or "").strip()
        logger.info(
            "Realtime TTS updated: provider=%s voice=%s",
            self.tts_provider,
            self.tts_voice or "default",
        )

    async def llm_node(self, chat_ctx, tools, model_settings):
        """Answer directly with the session's own LLM (Groq). The voice agent
        carries no Hermes dependency — heavier asks go through
        delegate_to_worker_agent instead of routing this turn elsewhere."""
        self.latency.mark("llm_start")
        self.latency.mark("first_llm_delta")
        return Agent.default.llm_node(self, chat_ctx, tools, model_settings)

    async def tts_node(self, text: AsyncIterable[str], model_settings):
        """Snapshot the selected provider for this reply; changes apply next reply."""
        provider = self.tts_provider
        voice = self.tts_voice or None

        if provider == "deepgram" and self.deepgram_available:
            return Agent.default.tts_node(self, text, model_settings)

        provider = provider if provider in {"edge", "piper"} else "edge"
        return _fox_tts_audio(text, provider, voice, latency=self.latency)


def build_session() -> tuple[AgentSession, bool]:
    """Create the low-latency listening pipeline and optional Deepgram path."""
    deepgram_available = bool(os.getenv("DEEPGRAM_API_KEY"))
    realtime_tts = (
        deepgram.TTS(model=os.getenv("DEEPGRAM_TTS_MODEL", "aura-2-thalia-en"))
        if deepgram_available
        else None
    )

    session = AgentSession(
        vad=silero.VAD.load(
            min_speech_duration=float(os.getenv("VOICE_MIN_SPEECH_MS", "100")) / 1000,
            min_silence_duration=float(os.getenv("VOICE_VAD_SILENCE_MS", "350")) / 1000,
        ),
        stt=groq.STT(
            model=os.getenv("GROQ_STT_MODEL", "whisper-large-v3-turbo"),
            language=os.getenv("VOICE_LANGUAGE", "en"),
        ),
        # The voice agent's conversational brain. Groq keeps time-to-first
        # token low for natural back-and-forth; see FoxVoiceAgent.llm_node.
        llm=groq.LLM(
            model=os.getenv("VOICE_LLM_MODEL", "openai/gpt-oss-20b"),
            temperature=float(os.getenv("VOICE_LLM_TEMPERATURE", "0.6")),
        ),
        tts=realtime_tts,
        turn_detection="vad",
        min_endpointing_delay=float(os.getenv("VOICE_MIN_ENDPOINT_MS", "350")) / 1000,
        max_endpointing_delay=float(os.getenv("VOICE_MAX_ENDPOINT_MS", "900")) / 1000,
        # livekit-agents >=1.7 takes this as a direct kwarg; older builds accepted
        # a turn_handling mapping, which now raises "'bool' object is not a mapping".
        preemptive_generation=True,
    )
    return session, deepgram_available


server = AgentServer()


@server.rtc_session(agent_name="fox")
async def entrypoint(ctx: JobContext) -> None:
    ctx.log_context_fields = {"room": ctx.room.name}
    logger.info("Starting Fox realtime voice session for room %s", ctx.room.name)

    session, deepgram_available = build_session()

    # Agent state (listening/thinking/speaking/idle) reaches the frontend for
    # free via livekit-agents' own `lk.agent.state` participant attribute —
    # no custom data-channel publishing needed here.
    agent = FoxVoiceAgent(deepgram_available=deepgram_available)

    def apply_participant_preferences(participant) -> None:
        attrs = participant.attributes or {}
        agent.update_tts_preferences(
            attrs.get("fox.tts.provider"),
            attrs.get("fox.tts.voice"),
        )

    @ctx.room.on("participant_connected")
    def on_participant_connected(participant) -> None:
        apply_participant_preferences(participant)

    @ctx.room.on("participant_attributes_changed")
    def on_participant_attributes_changed(changed_attributes, participant) -> None:
        if "fox.tts.provider" in changed_attributes or "fox.tts.voice" in changed_attributes:
            apply_participant_preferences(participant)

    @session.on("user_state_changed")
    def on_user_state_changed(ev) -> None:
        old_state = str(getattr(ev, "old_state", "")).lower()
        new_state = str(getattr(ev, "new_state", "")).lower()
        if old_state.endswith("speaking") and new_state.endswith("listening"):
            agent.latency.new_turn()
            agent.latency.mark("speech_end")

    @session.on("user_input_transcribed")
    def on_user_input_transcribed(ev) -> None:
        if bool(getattr(ev, "is_final", True)):
            agent.latency.mark("stt_final")

    await session.start(room=ctx.room, agent=agent)
    await ctx.connect()

    for participant in ctx.room.remote_participants.values():
        apply_participant_preferences(participant)

    async def log_session_usage() -> None:
        try:
            logger.info("voice_session_usage room=%s usage=%s", ctx.room.name, session.usage)
        except Exception:
            logger.exception("Failed to log voice session usage")

    ctx.add_shutdown_callback(log_session_usage)


if __name__ == "__main__":
    cli.run_app(server)
