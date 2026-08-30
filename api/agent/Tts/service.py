from typing import Dict, List, Optional, Tuple

from . import edge_engine, piper_engine

SUPPORTED_ENGINES = ("edge", "piper")


class UnsupportedTTSEngine(ValueError):
    pass


async def synthesize_speech(text: str, engine: str = "edge", voice: Optional[str] = None) -> Tuple[bytes, str]:
    engine = (engine or "edge").lower()

    if engine == "edge":
        audio = await edge_engine.synthesize(text, voice=voice or edge_engine.DEFAULT_EDGE_VOICE)
        return audio, "audio/mpeg"

    if engine == "piper":
        audio = piper_engine.synthesize(text, voice=voice)
        return audio, "audio/wav"

    raise UnsupportedTTSEngine(f"Unknown TTS engine '{engine}'. Supported engines: {SUPPORTED_ENGINES}")


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
