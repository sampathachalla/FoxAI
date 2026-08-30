import asyncio
import re
from typing import AsyncIterator, Dict, List, Optional, Tuple

from . import edge_engine, piper_engine

SUPPORTED_ENGINES = ("edge", "piper")


class UnsupportedTTSEngine(ValueError):
    pass


def split_text_for_tts(text: str, max_chars: int = 180) -> List[str]:
    """Split speech into short natural chunks to reduce time-to-first-audio.

    Prefer sentence boundaries, then clause/whitespace boundaries for long
    sentences. This keeps Edge/Piper requests small without cutting words.
    """
    normalized = re.sub(r"\s+", " ", (text or "").strip())
    if not normalized:
        return []

    sentences = re.split(r"(?<=[.!?])\s+", normalized)
    chunks: List[str] = []

    for sentence in sentences:
        remaining = sentence.strip()
        while len(remaining) > max_chars:
            window = remaining[:max_chars]
            cut = max(
                window.rfind(", "),
                window.rfind("; "),
                window.rfind(": "),
                window.rfind(" "),
            )
            if cut < max_chars // 2:
                cut = max_chars
            piece = remaining[:cut].strip()
            if piece:
                chunks.append(piece)
            remaining = remaining[cut:].strip()
        if remaining:
            chunks.append(remaining)

    return chunks


async def synthesize_speech(text: str, engine: str = "edge", voice: Optional[str] = None) -> Tuple[bytes, str]:
    """Compatibility API used by the existing REST/browser TTS path."""
    engine = (engine or "edge").lower()

    if engine == "edge":
        audio = await edge_engine.synthesize(text, voice=voice or edge_engine.DEFAULT_EDGE_VOICE)
        return audio, "audio/mpeg"

    if engine == "piper":
        # Piper uses a blocking subprocess. Run it off the asyncio event loop so
        # LiveKit/VAD/STT are not stalled while local speech is synthesized.
        audio = await asyncio.to_thread(piper_engine.synthesize, text, voice)
        return audio, "audio/wav"

    raise UnsupportedTTSEngine(f"Unknown TTS engine '{engine}'. Supported engines: {SUPPORTED_ENGINES}")


async def stream_speech_chunks(
    text: str,
    engine: str = "edge",
    voice: Optional[str] = None,
    max_chars: int = 180,
) -> AsyncIterator[Tuple[bytes, str]]:
    """Yield short synthesized audio chunks for faster perceived TTS startup.

    Edge remains fully async. Piper synthesis is moved to a worker thread so
    its subprocess cannot block the realtime LiveKit event loop. Existing
    ``synthesize_speech`` callers are unchanged.
    """
    engine = (engine or "edge").lower()
    if engine not in SUPPORTED_ENGINES:
        raise UnsupportedTTSEngine(f"Unknown TTS engine '{engine}'. Supported engines: {SUPPORTED_ENGINES}")

    for chunk in split_text_for_tts(text, max_chars=max_chars):
        if engine == "edge":
            audio = await edge_engine.synthesize(
                chunk,
                voice=voice or edge_engine.DEFAULT_EDGE_VOICE,
            )
            yield audio, "audio/mpeg"
        else:
            audio = await asyncio.to_thread(piper_engine.synthesize, chunk, voice)
            yield audio, "audio/wav"


async def list_engine_voices(engine: str) -> List[Dict[str, str]]:
    engine = (engine or "edge").lower()

    if engine == "edge":
        return await edge_engine.list_voices()

    if engine == "piper":
        return piper_engine.list_voices()

    raise UnsupportedTTSEngine(f"Unknown TTS engine '{engine}'. Supported engines: {SUPPORTED_ENGINES}")


def available_engines() -> List[Dict[str, object]]:
    return [
        {
            "id": "edge",
            "name": "Microsoft Edge TTS",
            "requiresNetwork": True,
            "available": True,
        },
        {
            "id": "piper",
            "name": "Piper TTS",
            "requiresNetwork": False,
            "available": piper_engine.is_available(),
        },
    ]
