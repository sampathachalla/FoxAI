"""LiveKit realtime voice worker for FoxAI.

Ears: LiveKit WebRTC -> Silero VAD -> Groq Whisper Large v3 Turbo
Brain: official Hermes runtime (with safe FoxAI compatibility fallback)
Mouth: user-selectable Edge / Piper / Deepgram TTS

Latency strategy:
- Hermes text deltas are consumed as they arrive from the upstream runtime.
- Deltas are grouped into short natural phrases instead of waiting for the full
  response.
- Edge/Piper synthesize short chunks; Piper runs off the asyncio event loop.
- LiveKit owns full-duplex transport and interruption/playout lifecycle.
"""

from __future__ import annotations

import logging
import os
import re
from typing import AsyncIterator

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
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


async def _phrase_stream(text_stream: AsyncIterator[str]) -> AsyncIterator[str]:
    """Convert token/delta streaming into speakable phrases.

    We emit at sentence boundaries as soon as there is enough text, and fall
    back to comma/clause/space boundaries when the buffer gets long. This is a
    latency/quality compromise: much faster first audio without choppy
    word-by-word TTS.
    """
    buffer = ""

    async for delta in text_stream:
        if not delta:
            continue
        buffer += delta

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
    text: str,
    provider: str,
    voice: str | None,
) -> AsyncIterator[rtc.AudioFrame]:
    """Synthesize Edge/Piper in short chunks and decode to LiveKit PCM frames."""
    async for audio_bytes, mime_type in stream_speech_chunks(
        text,
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
                logger.warning("Deepgram selected but DEEPGRAM_API_KEY is missing; falling back to Edge TTS")
                self.tts_provider = "edge"
            else:
                self.tts_provider = requested

        self.tts_voice = (voice or "").strip()
        logger.info(
            "Realtime TTS updated: provider=%s voice=%s",
            self.tts_provider,
            self.tts_voice or "default",
        )

    def _speak_phrase(self, phrase: str) -> None:
        """Queue one interruptible phrase using the currently selected provider."""
        if self.tts_provider == "deepgram":
            self.session.say(
                phrase,
                allow_interruptions=True,
                add_to_chat_ctx=False,
            )
            return

        self.session.say(
            phrase,
            audio=_fox_tts_audio(phrase, self.tts_provider, self.tts_voice or None),
            allow_interruptions=True,
            add_to_chat_ctx=False,
        )

    async def on_user_turn_completed(self, turn_ctx, new_message) -> None:
        """Stream Hermes output into TTS instead of waiting for the full answer."""
        transcript = getattr(new_message, "text_content", None)
        if callable(transcript):
            transcript = transcript()
        if not transcript:
            transcript = str(getattr(new_message, "content", "")).strip()
        if not transcript:
            return

        full_response: list[str] = []
        async for phrase in _phrase_stream(self.hermes.stream_response(transcript)):
            full_response.append(phrase)
            self._speak_phrase(phrase)

        # Hermes itself owns durable conversation history. We only append one
        # final assistant message to LiveKit context for diagnostics/captions,
        # rather than one message per streamed phrase.
        response_text = " ".join(full_response).strip()
        if response_text:
            turn_ctx.add_message(role="assistant", content=response_text)


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


async def entrypoint(ctx: JobContext) -> None:
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

    for participant in ctx.room.remote_participants.values():
        apply_participant_preferences(participant)

    await session.start(
        room=ctx.room,
        agent=agent,
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
