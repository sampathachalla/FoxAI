from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import time
from typing import Any

import numpy as np


@dataclass
class WakeWordDetection:
    phrase: str
    score: float
    timestamp_ms: int
    model_key: str


class WakeWordEngine:
    def __init__(
        self,
        model_path: str | None = None,
        phrase: str = "Hey Jarvis",
        model_key: str = "hey jarvis",
        threshold: float = 0.5,
        cooldown_seconds: float = 3.0,
        enabled: bool = True,
    ) -> None:
        self.model_path = Path(model_path) if model_path else None
        self.phrase = phrase
        self.model_key = model_key
        self.threshold = threshold
        self.cooldown_seconds = cooldown_seconds
        self.enabled = enabled
        self._last_trigger_at = 0.0
        self._load_error: str | None = None
        self._model: Any | None = None
        self._load_model()

    @property
    def load_error(self) -> str | None:
        return self._load_error

    def is_ready(self) -> bool:
        return self.enabled and self._model is not None and self._load_error is None

    def _load_model(self) -> None:
        if not self.enabled:
            self._load_error = "Wake-word service disabled via configuration."
            return

        try:
            import openwakeword
            from openwakeword.model import Model

            if self.model_path and self.model_path.exists():
                self._model = Model(
                    wakeword_models=[str(self.model_path)],
                    inference_framework="onnx",
                )
            else:
                try:
                    openwakeword.utils.download_models(["hey_jarvis_v0.1"])
                except FileExistsError:
                    pass
                self._model = Model(
                    wakeword_models=[self.model_key],
                    inference_framework="onnx",
                )
            self._load_error = None
        except Exception as exc:  # pragma: no cover - depends on local runtime
            self._model = None
            self._load_error = str(exc)

    def process_audio_bytes(self, payload: bytes) -> WakeWordDetection | None:
        if not self.is_ready():
            return None

        if len(payload) == 0:
            return None

        if len(payload) % 2 != 0:
            raise ValueError("PCM payload must contain 16-bit little-endian samples.")

        pcm = np.frombuffer(payload, dtype=np.int16)
        return self.process_samples(pcm)

    def process_samples(self, pcm: np.ndarray) -> WakeWordDetection | None:
        if not self.is_ready():
            return None

        if pcm.size == 0:
            return None

        predictions = self._model.predict(pcm)
        if not predictions:
            return None

        if self.model_key in predictions:
            model_key = self.model_key
            score_value = float(predictions[self.model_key])
        else:
            model_key, score = max(predictions.items(), key=lambda item: float(item[1]))
            score_value = float(score)

        if score_value < self.threshold:
            return None

        now = time.monotonic()
        if now - self._last_trigger_at < self.cooldown_seconds:
            return None

        self._last_trigger_at = now
        return WakeWordDetection(
            phrase=self.phrase,
            score=score_value,
            timestamp_ms=int(time.time() * 1000),
            model_key=model_key,
        )
