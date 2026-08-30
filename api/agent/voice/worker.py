"""LiveKit realtime voice worker for FoxAI.

Ears: LiveKit WebRTC -> Silero VAD -> Groq Whisper Large v3 Turbo
Brain: existing Hermes VoiceWorkflow via HermesVoiceAdapter
Mouth: Deepgram streaming TTS (primary realtime provider)

Edge TTS and Piper remain available through FoxAI's existing TTS service for
non-realtime/fallback use. The worker deliberately keeps Hermes independent of
media transport so Hermes can be upgraded without rewriting the voice stack.
"""

import logging
import os

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.plugins import deepgram, groq, silero

from voice.hermes_adapter import HermesVoiceAdapter

load_dotenv()
logger = logging.getLogger("fox.voice")


class FoxHermesVoiceAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=(
                "You are Fox, a fast conversational voice assistant. "
                "Keep spoken answers natural and concise."
            )
        )
        self.hermes = HermesVoiceAdapter()

    async def on_user_turn_completed(self, turn_ctx, new_message) -> None:
        """Let the existing Hermes runtime own reasoning/tools/memory.

        We generate the Hermes response here and place it into the conversation
        context as the authoritative assistant response. LiveKit owns audio
        transport, interruption, VAD, STT and TTS lifecycle around that turn.
        """
        # LiveKit ChatMessage content can contain text and other content types.
        transcript = getattr(new_message, "text_content", None)
        if callable(transcript):
            transcript = transcript()
        if not transcript:
            transcript = str(getattr(new_message, "content", "")).strip()
        if not transcript:
            return

        response = await self.hermes.respond(transcript)
        if response:
            # Append Hermes' result as context for the voice session. The
            # session's speech path will synthesize the assistant output.
            turn_ctx.add_message(role="assistant", content=response)


def build_session() -> AgentSession:
    """Create the low-latency realtime session.

    Groq Whisper is intentionally used as requested. Whisper is a turn/chunk
    STT rather than a native token-streaming recognizer, so Silero VAD is used
    to make turn boundaries fast and reliable.
    """
    return AgentSession(
        vad=silero.VAD.load(
            min_speech_duration=0.10,
            min_silence_duration=0.45,
        ),
        stt=groq.STT(
            model=os.getenv("GROQ_STT_MODEL", "whisper-large-v3-turbo"),
            language=os.getenv("VOICE_LANGUAGE", "en"),
        ),
        tts=deepgram.TTS(
            model=os.getenv("DEEPGRAM_TTS_MODEL", "aura-2-thalia-en"),
        ),
        # VAD-based endpointing keeps the first implementation predictable;
        # LiveKit's session also owns interruption/barge-in behavior.
        turn_detection="vad",
        min_endpointing_delay=float(os.getenv("VOICE_MIN_ENDPOINT_MS", "450")) / 1000,
        max_endpointing_delay=float(os.getenv("VOICE_MAX_ENDPOINT_MS", "1200")) / 1000,
    )


async def entrypoint(ctx: JobContext) -> None:
    logger.info("Starting Fox realtime voice session for room %s", ctx.room.name)
    session = build_session()
    await session.start(
        room=ctx.room,
        agent=FoxHermesVoiceAgent(),
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
