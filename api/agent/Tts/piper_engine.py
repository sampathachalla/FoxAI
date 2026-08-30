import os
import shutil
import subprocess
from pathlib import Path
from typing import Dict, List, Optional

PIPER_BINARY = os.getenv("PIPER_BINARY_PATH", "piper")
PIPER_MODELS_DIR = Path(os.getenv("PIPER_MODELS_DIR", str(Path(__file__).resolve().parent / "piper_models")))
DEFAULT_PIPER_VOICE = os.getenv("PIPER_DEFAULT_VOICE", "en_US-lessac-medium")


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
    if not text or not text.strip():
        raise ValueError("Text is required for Piper TTS synthesis.")

    if not is_available():
        raise RuntimeError(
            f"Piper binary '{PIPER_BINARY}' was not found on PATH. Install the 'piper-tts' package to use this engine."
        )

    voice_name = voice or DEFAULT_PIPER_VOICE
    model_path = PIPER_MODELS_DIR / f"{voice_name}.onnx"
    if not model_path.exists():
        raise RuntimeError(
            f"Piper voice model '{voice_name}' not found in {PIPER_MODELS_DIR}. "
            "Download the matching .onnx and .onnx.json files for this voice into that folder."
        )

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
