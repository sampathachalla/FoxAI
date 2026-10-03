import asyncio
import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import AsyncIterator, Dict, List, Optional, Tuple

PIPER_BINARY = os.getenv("PIPER_BINARY_PATH", "piper")
PIPER_MODELS_DIR = Path(os.getenv("PIPER_MODELS_DIR", str(Path(__file__).resolve().parent / "piper_models")))
DEFAULT_PIPER_VOICE = os.getenv("PIPER_DEFAULT_VOICE", "en_US-lessac-medium")
DEFAULT_PIPER_SAMPLE_RATE = int(os.getenv("PIPER_DEFAULT_SAMPLE_RATE", "22050"))


def is_available() -> bool:
    return shutil.which(PIPER_BINARY) is not None


_LOCALE_LABELS = {
    "en_US": "US English",
    "en_GB": "GB English",
}


def _friendly_voice_name(voice_id: str) -> str:
    parts = voice_id.split("-")
    if len(parts) != 3:
        return voice_id.replace("_", " ").title()

    locale, speaker, quality = parts
    locale_label = _LOCALE_LABELS.get(locale, locale.replace("_", " "))
    speaker_label = speaker.replace("_", " ").title()
    return f"{speaker_label} ({locale_label}, {quality.title()})"


def _voice_paths(voice: Optional[str]) -> Tuple[str, Path, Path]:
    voice_name = voice or DEFAULT_PIPER_VOICE
    model_path = PIPER_MODELS_DIR / f"{voice_name}.onnx"
    config_path = model_path.with_suffix(".onnx.json")
    if not model_path.exists():
        raise RuntimeError(
            f"Piper voice model '{voice_name}' not found in {PIPER_MODELS_DIR}. "
            "Download the matching .onnx and .onnx.json files for this voice into that folder."
        )
    return voice_name, model_path, config_path


def get_sample_rate(voice: Optional[str] = None) -> int:
    """Read the model's native sample rate, falling back safely when absent."""
    _, _, config_path = _voice_paths(voice)
    if config_path.exists():
        try:
            config = json.loads(config_path.read_text(encoding="utf-8"))
            sample_rate = config.get("audio", {}).get("sample_rate")
            if isinstance(sample_rate, int) and sample_rate > 0:
                return sample_rate
        except (OSError, ValueError, TypeError):
            pass
    return DEFAULT_PIPER_SAMPLE_RATE


def list_voices() -> List[Dict[str, str]]:
    if not PIPER_MODELS_DIR.exists():
        return []

    voices = []
    for onnx_file in sorted(PIPER_MODELS_DIR.glob("*.onnx")):
        config_file = onnx_file.with_suffix(".onnx.json")
        voices.append(
            {
                "id": onnx_file.stem,
                "name": _friendly_voice_name(onnx_file.stem),
                "hasConfig": config_file.exists(),
            }
        )
    return voices


def synthesize(text: str, voice: Optional[str] = None) -> bytes:
    """Compatibility WAV synthesis used by the existing REST/browser path."""
    if not text or not text.strip():
        raise ValueError("Text is required for Piper TTS synthesis.")

    if not is_available():
        raise RuntimeError(
            f"Piper binary '{PIPER_BINARY}' was not found on PATH. Install the 'piper-tts' package to use this engine."
        )

    _, model_path, _ = _voice_paths(voice)
    result = subprocess.run(
        [PIPER_BINARY, "--model", str(model_path), "--output-file", "-"],
        input=text.encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Piper synthesis failed: {result.stderr.decode(errors='ignore')}")

    audio_bytes = result.stdout
    if not audio_bytes:
        raise RuntimeError("Piper TTS returned no audio data.")
    return audio_bytes


async def stream_synthesize_raw(
    text: str,
    voice: Optional[str] = None,
    read_size: int = 4096,
) -> AsyncIterator[Tuple[bytes, int]]:
    """Stream Piper's native signed-16-bit mono PCM as it is synthesized.

    Piper's ``--output-raw`` mode writes audio progressively to stdout. Using an
    asyncio subprocess means the LiveKit event loop stays responsive and a
    cancelled voice turn can terminate Piper immediately instead of waiting for
    a complete WAV file.
    """
    if not text or not text.strip():
        raise ValueError("Text is required for Piper TTS synthesis.")
    if not is_available():
        raise RuntimeError(
            f"Piper binary '{PIPER_BINARY}' was not found on PATH. Install the 'piper-tts' package to use this engine."
        )

    _, model_path, _ = _voice_paths(voice)
    sample_rate = get_sample_rate(voice)
    process = await asyncio.create_subprocess_exec(
        PIPER_BINARY,
        "--model",
        str(model_path),
        "--output-raw",
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    try:
        assert process.stdin is not None
        assert process.stdout is not None
        process.stdin.write((text.strip() + "\n").encode("utf-8"))
        await process.stdin.drain()
        process.stdin.close()

        emitted = False
        while True:
            chunk = await process.stdout.read(read_size)
            if not chunk:
                break
            emitted = True
            # S16_LE audio is 2 bytes/sample. Keep frame boundaries aligned.
            if len(chunk) % 2:
                chunk += await process.stdout.readexactly(1)
            if chunk:
                yield chunk, sample_rate

        return_code = await process.wait()
        stderr = b""
        if process.stderr is not None:
            stderr = await process.stderr.read()
        if return_code != 0:
            raise RuntimeError(f"Piper synthesis failed: {stderr.decode(errors='ignore')}")
        if not emitted:
            raise RuntimeError("Piper TTS returned no audio data.")
    except asyncio.CancelledError:
        if process.returncode is None:
            process.terminate()
            try:
                await asyncio.wait_for(process.wait(), timeout=0.5)
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
        raise
    finally:
        if process.returncode is None:
            process.terminate()
            try:
                await asyncio.wait_for(process.wait(), timeout=0.5)
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
