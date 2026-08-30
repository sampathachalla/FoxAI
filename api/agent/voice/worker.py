"""LiveKit realtime voice worker for FoxAI.

Ears: LiveKit WebRTC -> Silero VAD -> Groq Whisper Large v3 Turbo
Brain: official Hermes runtime (with safe FoxAI compatibility fallback)
Mouth: user-selectable Edge / Piper / Deepgram TTS

The worker uses LiveKit's custom ``llm_node`` and ``tts_node`` extension points.
That keeps turn-taking, transcripts, interruption, and playout inside LiveKit
while Hermes owns reasoning/tools/memory and FoxAI owns TTS provider routing.
"""

from __future__ import annotations

import logging
import os
import re
from typing import AsyncIterable, AsyncIterator

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import Agent, AgentServer, AgentSession, JobContext, cli
from livekit.agents.utils.codecs import AudioStreamDecoder
from livekit.plugins import deepgram, groq, silero

from Tts.service import stream_speech_chunks
from voice.hermes_adapter import HermesVoiceAdapter

load_dotenv()
logger = logging.getLogger("fox.voice")

SUPPORTED_TTS_PROVIDERS = {"edge", "piper", "deepgram"}
DEFAULT_TTS_PROVIDER = os.getenv("VOICE_TTS_PROVIDER", "edge").lower()
PHRASE_MIN_CHARS = int(os.getenv("VOICE_TTS_PHRASE_MIN_CHARS", "48"))
PHRASE_MAX_CHARS = int(os.getenv("VOICE_TTS_PHRASE_MAX_CHARS", "180"))


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


async def _phrase_stream(text_stream: AsyncIterable[str]) -> AsyncIterator[str]:
    """Convert LLM token deltas into short, natural TTS phrases."""
    buffer = ""

    async for delta in text_stream:
        if not delta:
            continue
        buffer += str(delta)

        while buffer:
            sentence_match = re.search(r"[.!?](?:\s|$)", buffer)
            if sentence_match and sentence_match.end() >= PHRASE_MIN_CHARS:
                cut = sentence_match.end()
            elif len(buffer) >= PHRASE_MAX_CHARS:
                window = buffer[:PHRASE_MAX_CHARS]
                cut = max(
                    window.rfind(", "),
                    window.rfind("; "),
                    window.rfind(": "),
                    window.rfind(" "),
                )
                if cut < PHRASE_MIN_CHARS:
                    cut = PHRASE_MAX_CHARS
            else:
                break

            phrase = buffer[:cut].strip()
            buffer = buffer[cut:].lstrip()
            if phrase:
                yield phrase

    tail = buffer.strip()
    if tail:
        yield tail


async def _fox_tts_audio(
    text_stream: AsyncIterable[str],
    provider: str,
    voice: str | None,
) -> AsyncIterator[rtc.AudioFrame]:
    """Stream Edge/Piper phrase audio into LiveKit PCM frames."""
    async for phrase in _phrase_stream(text_stream):
        async for audio_bytes, mime_type in stream_speech_chunks(
            phrase,
            engine=provider,
            voice=voice or None,
            max_chars=PHRASE_MAX_CHARS,
        ):
            decoder = AudioStreamDecoder(
                sample_rate=48000,
                num_channels=1,
                format=mime_type,
            )
            decoder.push(audio_bytes)
            decoder.end_input()

            try:
                async for frame in decoder:
                    yield frame
            finally:
                await decoder.aclose()


class FoxHermesVoiceAgent(Agent):
    def __init__(self, *, deepgram_available: bool) -> None:
        super().__init__(
            instructions=(
                "You are Fox, a fast conversational voice assistant. "
                "Keep spoken answers natural and concise."
            )
        )
        self.hermes = HermesVoiceAdapter()
        self.deepgram_available = deepgram_available
        self.tts_provider = (
            DEFAULT_TTS_PROVIDER if DEFAULT_TTS_PROVIDER in SUPPORTED_TTS_PROVIDERS else "edge"
        )
        self.tts_voice = ""
        logger.info("Hermes voice runtime: %s", self.hermes.runtime_name)

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
        """Use Hermes as LiveKit's streaming LLM node."""
        transcript = _latest_user_text(chat_ctx)
        if not transcript:
            return
        return self.hermes.stream_response(transcript)

    async def tts_node(self, text: AsyncIterable[str], model_settings):
        """Route the current frontend-selected TTS provider without reconnecting."""
        if self.tts_provider == "deepgram" and self.deepgram_available:
            return Agent.default.tts_node(self, text, model_settings)

        provider = self.tts_provider if self.tts_provider in {"edge", "piper"} else "edge"
        return _fox_tts_audio(text, provider, self.tts_voice or None)


def build_session() -> tuple[AgentSession, bool]:
    """Create realtime listening and the optional native Deepgram TTS path."""
    deepgram_available = bool(os.getenv("DEEPGRAM_API_KEY"))
    realtime_tts = (
        deepgram.TTS(model=os.getenv("DEEPGRAM_TTS_MODEL", "aura-2-thalia-en"))
        if deepgram_available
        else None
    )

    session = AgentSession(
        vad=silero.VAD.load(
            min_speech_duration=0.10,
            min_silence_duration=0.45,
        ),
        stt=groq.STT(
            model=os.getenv("GROQ_STT_MODEL", "whisper-large-v3-turbo"),
            language=os.getenv("VOICE_LANGUAGE", "en"),
        ),
        tts=realtime_tts,
        turn_detection="vad",
        min_endpointing_delay=float(os.getenv("VOICE_MIN_ENDPOINT_MS", "450")) / 1000,
        max_endpointing_delay=float(os.getenv("VOICE_MAX_ENDPOINT_MS", "1200")) / 1000,
    )
    return session, deepgram_available


server = AgentServer()


@server.rtc_session(agent_name="fox")
async def entrypoint(ctx: JobContext) -> None:
    ctx.log_context_fields = {"room": ctx.room.name}
    logger.info("Starting Fox realtime voice session for room %s", ctx.room.name)

    session, deepgram_available = build_session()
    agent = FoxHermesVoiceAgent(deepgram_available=deepgram_available)

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

    await session.start(room=ctx.room, agent=agent)
    await ctx.connect()

    # Apply attributes for participants that were already present when the
    # worker connected to the room.
    for participant in ctx.room.remote_participants.values():
        apply_participant_preferences(participant)


if __name__ == "__main__":
    cli.run_app(server)
