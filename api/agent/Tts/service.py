import asyncio
import re
from typing import AsyncIterator, Dict, List, Optional, Tuple

from . import edge_engine, piper_engine

SUPPORTED_ENGINES = ("edge", "piper")


class UnsupportedTTSEngine(ValueError):
    pass


def split_text_for_tts(text: str, max_chars: int = 180) -> List[str]:
    """Split speech into short natural chunks to reduce time-to-first-audio."""
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
        # Piper uses a blocking subprocess. Running it in a worker thread keeps
        # LiveKit's event loop responsive for VAD, STT and interruption events.
        audio = await asyncio.to_thread(piper_engine.synthesize, text, voice)
        return audio, "audio/wav"

    raise UnsupportedTTSEngine(f"Unknown TTS engine '{engine}'. Supported engines: {SUPPORTED_ENGINES}")


async def stream_encoded_speech(
    text: str,
    engine: str = "edge",
    voice: Optional[str] = None,
) -> AsyncIterator[Tuple[bytes, str]]:
    """Yield encoded audio progressively for one short phrase.

    Edge emits the provider's MP3 chunks immediately. Piper currently produces
    one WAV result per phrase, but synthesis is moved off the asyncio loop. This
    keeps the public provider contract uniform while giving Edge true streaming
    and Piper low-latency sentence/chunk playback.
    """
    engine = (engine or "edge").lower()
    if engine == "edge":
        async for audio_chunk in edge_engine.stream_synthesize(
            text,
            voice=voice or edge_engine.DEFAULT_EDGE_VOICE,
        ):
            yield audio_chunk, "audio/mpeg"
        return

    if engine == "piper":
        audio = await asyncio.to_thread(piper_engine.synthesize, text, voice)
        yield audio, "audio/wav"
        return

    raise UnsupportedTTSEngine(f"Unknown TTS engine '{engine}'. Supported engines: {SUPPORTED_ENGINES}")


async def stream_speech_chunks(
    text: str,
    engine: str = "edge",
    voice: Optional[str] = None,
    max_chars: int = 180,
) -> AsyncIterator[Tuple[bytes, str]]:
    """Compatibility chunk stream used by callers that want complete chunks."""
    engine = (engine or "edge").lower()
    if engine not in SUPPORTED_ENGINES:
        raise UnsupportedTTSEngine(f"Unknown TTS engine '{engine}'. Supported engines: {SUPPORTED_ENGINES}")

    for chunk in split_text_for_tts(text, max_chars=max_chars):
        audio, mime_type = await synthesize_speech(chunk, engine=engine, voice=voice)
        yield audio, mime_type


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
