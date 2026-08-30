import io
import re
from typing import Dict, List

import edge_tts

DEFAULT_EDGE_VOICE = "en-US-AriaNeural"

_COUNTRY_LABELS = {
    "AU": "Australia",
    "CA": "Canada",
    "GB": "United Kingdom",
    "HK": "Hong Kong",
    "IN": "India",
    "IE": "Ireland",
    "KE": "Kenya",
    "NZ": "New Zealand",
    "NG": "Nigeria",
    "PH": "Philippines",
    "SG": "Singapore",
    "TZ": "Tanzania",
    "US": "United States",
    "ZA": "South Africa",
}


def _friendly_voice_name(short_name: str) -> str:
    raw = short_name.split("-")[-1]
    raw = re.sub(r"Neural$", "", raw)
    return re.sub(r"(?<!^)(?=[A-Z])", " ", raw).strip()


def _country_label(locale: str) -> str:
    region = locale.split("-")[-1].upper()
    return _COUNTRY_LABELS.get(region, region)


async def synthesize(text: str, voice: str = DEFAULT_EDGE_VOICE, rate: str = "+0%", pitch: str = "+0Hz") -> bytes:
    if not text or not text.strip():
        raise ValueError("Text is required for Edge TTS synthesis.")

    communicate = edge_tts.Communicate(text, voice=voice or DEFAULT_EDGE_VOICE, rate=rate, pitch=pitch)
    buffer = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buffer.write(chunk["data"])

    audio_bytes = buffer.getvalue()
    if not audio_bytes:
        raise RuntimeError("Edge TTS returned no audio data.")
    return audio_bytes


async def list_voices(locale_prefix: str = "en") -> List[Dict[str, str]]:
    voices = await edge_tts.list_voices()
    filtered = [v for v in voices if not locale_prefix or v["Locale"].lower().startswith(locale_prefix.lower())]
    return [
        {
            "id": v["ShortName"],
            "name": _friendly_voice_name(v["ShortName"]),
            "locale": v["Locale"],
            "country": _country_label(v["Locale"]),
            "gender": v["Gender"],
        }
        for v in filtered
    ]
