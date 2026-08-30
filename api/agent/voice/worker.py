"""Low-latency LiveKit voice worker for FoxAI.

Ears: LiveKit WebRTC -> Silero VAD -> Groq Whisper Large v3 Turbo
Brain: official Hermes runtime (safe FoxAI compatibility fallback)
Mouth: frontend-selectable Edge / Piper / Deepgram TTS

The worker keeps transport, reasoning, and speech synthesis behind explicit
pipeline boundaries. Hermes and TTS streams are cancellation-aware so a
barge-in does not leave an old turn racing the new one.
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
from livekit import rtc
from livekit.agents import Agent, AgentServer, AgentSession, JobContext, cli
from livekit.agents.utils.audio import AudioByteStream
from livekit.agents.utils.codecs import AudioStreamDecoder
from livekit.plugins import deepgram, groq, silero

from Tts.service import stream_encoded_speech, stream_pcm_speech
from voice.hermes_adapter import HermesVoiceAdapter, HermesStateCallback

load_dotenv()
logger = logging.getLogger("fox.voice")

SUPPORTED_TTS_PROVIDERS = {"edge", "piper", "deepgram"}
DEFAULT_TTS_PROVIDER = os.getenv("VOICE_TTS_PROVIDER", "edge").lower()
FIRST_PHRASE_MIN_CHARS = int(os.getenv("VOICE_TTS_FIRST_PHRASE_MIN_CHARS", "24"))
FIRST_PHRASE_MAX_CHARS = int(os.getenv("VOICE_TTS_FIRST_PHRASE_MAX_CHARS", "96"))
PHRASE_MIN_CHARS = int(os.getenv("VOICE_TTS_PHRASE_MIN_CHARS", "44"))
PHRASE_MAX_CHARS = int(os.getenv("VOICE_TTS_PHRASE_MAX_CHARS", "180"))
AGENT_STATE_TOPIC = "fox.agent.state"


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

        def delta_ms(start: str, end: str) -> Optional[float]:
            start_value = self.marks.get(start)
            end_value = self.marks.get(end)
            if start_value is None or end_value is None:
                return None
            return round((end_value - start_value) * 1000, 1)

        logger.info(
            "voice_latency turn=%s provider=%s speech_end_to_stt_ms=%s "
            "speech_end_to_hermes_ms=%s speech_end_to_search_ms=%s "
            "agent_reach_ms=%s speech_end_to_first_llm_ms=%s "
            "speech_end_to_first_phrase_ms=%s speech_end_to_first_audio_ms=%s",
            self.turn_no,
            provider,
            ms("stt_final"),
            ms("hermes_start"),
            ms("agent_reach_start"),
            delta_ms("agent_reach_start", "agent_reach_result"),
            ms("first_llm_delta"),
            ms("first_tts_phrase"),
            ms("first_audio"),
        )


def _message_text(message) -> str:
    value = getattr(message, "text_content", None)
    if callable(value):
        value = value()
    if isinstance(value, str) and value.strip():
        return value.strip()
    content = getattr(message, "content", "")
    if isinstance(content, str):
        return content.strip()
    return ""


def _latest_user_text(chat_ctx) -> str:
    items = getattr(chat_ctx, "items", None) or getattr(chat_ctx, "messages", None) or []
    for item in reversed(list(items)):
        role = getattr(item, "role", None)
        if role == "user" or str(role).lower().endswith("user"):
            text = _message_text(item)
            if text:
                return text
    return ""


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


class FoxHermesVoiceAgent(Agent):
    def __init__(
        self,
        *,
        deepgram_available: bool,
        session_id: str,
        state_callback: Optional[HermesStateCallback] = None,
    ) -> None:
        super().__init__(
            instructions=(
                "You are Fox, a fast conversational voice assistant. "
                "Keep spoken answers natural and concise."
            )
        )
        self.hermes = HermesVoiceAdapter(
            session_id=session_id,
            state_callback=state_callback,
        )
        self.deepgram_available = deepgram_available
        self.tts_provider = (
            DEFAULT_TTS_PROVIDER if DEFAULT_TTS_PROVIDER in SUPPORTED_TTS_PROVIDERS else "edge"
        )
        self.tts_voice = ""
        self.latency = TurnLatency()
        logger.info("Hermes voice runtime: %s session=%s", self.hermes.runtime_name, session_id)

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
        """Use official Hermes as LiveKit's streaming LLM node."""
        transcript = _latest_user_text(chat_ctx)
        if not transcript:
            return

        self.latency.mark("hermes_start")
        upstream = self.hermes.stream_response(transcript)

        async def measured_stream() -> AsyncIterator[str]:
            first = True
            async for delta in upstream:
                if first:
                    first = False
                    self.latency.mark("first_llm_delta")
                yield delta

        return measured_stream()

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
        tts=realtime_tts,
        turn_detection="vad",
        min_endpointing_delay=float(os.getenv("VOICE_MIN_ENDPOINT_MS", "350")) / 1000,
        max_endpointing_delay=float(os.getenv("VOICE_MAX_ENDPOINT_MS", "900")) / 1000,
        turn_handling={"preemptive_generation": True},
    )
    return session, deepgram_available


server = AgentServer()


@server.rtc_session(agent_name="fox")
async def entrypoint(ctx: JobContext) -> None:
    ctx.log_context_fields = {"room": ctx.room.name}
    logger.info("Starting Fox realtime voice session for room %s", ctx.room.name)

    session, deepgram_available = build_session()
    loop = asyncio.get_running_loop()

    async def publish_agent_state(state: str, metadata: dict) -> None:
        payload = json.dumps(
            {
                "type": "agent_state",
                "state": state,
                **metadata,
            },
            separators=(",", ":"),
        )
        try:
            await ctx.room.local_participant.publish_data(
                payload,
                reliable=True,
                topic=AGENT_STATE_TOPIC,
            )
        except Exception:
            # State UI is supplemental; a data-channel issue must never break
            # reasoning, search, TTS, or the voice session itself.
            logger.debug("Failed to publish agent state=%s", state, exc_info=True)

    def on_hermes_state(state: str, metadata: dict) -> None:
        if state == "searching":
            agent.latency.mark("agent_reach_start")
        elif state == "thinking" and metadata.get("source") == "agent_reach":
            agent.latency.mark("agent_reach_result")

        def schedule() -> None:
            asyncio.create_task(publish_agent_state(state, metadata))

        loop.call_soon_threadsafe(schedule)

    agent = FoxHermesVoiceAgent(
        deepgram_available=deepgram_available,
        session_id=ctx.room.name,
        state_callback=on_hermes_state,
    )

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

    @session.on("speech_created")
    def on_speech_created(ev) -> None:
        handle = getattr(ev, "speech_handle", None)
        if handle is None:
            return

        async def observe() -> None:
            try:
                await handle
            finally:
                if bool(getattr(handle, "interrupted", False)):
                    agent.hermes.interrupt_current(reason="LiveKit speech interrupted")

        asyncio.create_task(observe())

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
