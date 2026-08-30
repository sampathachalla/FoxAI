"""LiveKit realtime voice worker for FoxAI.

Ears: LiveKit WebRTC -> Silero VAD -> Groq Whisper Large v3 Turbo
Brain: existing Hermes VoiceWorkflow via HermesVoiceAdapter
Mouth: user-selectable Edge / Piper / Deepgram TTS

The frontend stores the user's voice choice in LiveKit participant attributes.
The worker reads those attributes at join time and listens for later changes, so
changing the TTS provider in Settings does not require rewriting Hermes or the
existing browser voice path.
"""

import logging
import os
from typing import AsyncIterator

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.agents.utils.codecs import AudioStreamDecoder
from livekit.plugins import deepgram, groq, silero

from Tts.service import synthesize_speech
from voice.hermes_adapter import HermesVoiceAdapter

load_dotenv()
logger = logging.getLogger("fox.voice")

SUPPORTED_TTS_PROVIDERS = {"edge", "piper", "deepgram"}
DEFAULT_TTS_PROVIDER = os.getenv("VOICE_TTS_PROVIDER", "edge").lower()


async def _fox_tts_audio(
    text: str,
    provider: str,
    voice: str | None,
) -> AsyncIterator[rtc.AudioFrame]:
    """Synthesize Edge/Piper audio and decode it into LiveKit PCM frames.

    This intentionally reuses FoxAI's existing TTS service instead of creating
    a second Edge/Piper implementation. It keeps the old REST/browser path and
    the new LiveKit path on the same engines and voice identifiers.
    """
    audio_bytes, mime_type = await synthesize_speech(
        text,
        engine=provider,
        voice=voice or None,
    )

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

    def update_tts_preferences(self, provider: str | None, voice: str | None) -> None:
        requested = (provider or "").strip().lower()
        if requested in SUPPORTED_TTS_PROVIDERS:
            if requested == "deepgram" and not self.deepgram_available:
                logger.warning("Deepgram selected but DEEPGRAM_API_KEY is missing; falling back to Edge TTS")
                self.tts_provider = "edge"
            else:
                self.tts_provider = requested

        self.tts_voice = (voice or "").strip()
        logger.info("Realtime TTS updated: provider=%s voice=%s", self.tts_provider, self.tts_voice or "default")

    async def on_user_turn_completed(self, turn_ctx, new_message) -> None:
        """Run Hermes reasoning and speak the result with the selected provider."""
        transcript = getattr(new_message, "text_content", None)
        if callable(transcript):
            transcript = transcript()
        if not transcript:
            transcript = str(getattr(new_message, "content", "")).strip()
        if not transcript:
            return

        response = await self.hermes.respond(transcript)
        if not response:
            return

        if self.tts_provider == "deepgram":
            # Uses AgentSession's Deepgram TTS plugin. The response is still
            # interruptible through the LiveKit session.
            self.session.say(
                response,
                allow_interruptions=True,
                add_to_chat_ctx=True,
            )
            return

        # Edge and Piper reuse FoxAI's existing TTS engines and provide decoded
        # audio frames directly to LiveKit. This avoids browser-side playback
        # while preserving the user's existing provider/voice settings.
        self.session.say(
            response,
            audio=_fox_tts_audio(response, self.tts_provider, self.tts_voice or None),
            allow_interruptions=True,
            add_to_chat_ctx=True,
        )


def build_session() -> tuple[AgentSession, bool]:
    """Create the realtime listening pipeline and optional Deepgram TTS path."""
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

    # If the browser joined before the worker, token attributes are already
    # synchronized by LiveKit and can be applied before the first spoken turn.
    for participant in ctx.room.remote_participants.values():
        apply_participant_preferences(participant)

    await session.start(
        room=ctx.room,
        agent=agent,
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))