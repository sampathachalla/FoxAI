import unittest
from pathlib import Path
from unittest.mock import MagicMock

import numpy as np

from engine import WakeWordEngine


class WakeWordEngineTests(unittest.TestCase):
    def build_engine(self) -> WakeWordEngine:
        engine = WakeWordEngine(
            model_path=str(Path(__file__).resolve().parent / "fixtures" / "missing.onnx"),
            threshold=0.5,
            cooldown_seconds=5.0,
            enabled=True,
        )
        engine._model = MagicMock()
        engine._load_error = None
        return engine

    def test_detects_above_threshold(self):
        engine = self.build_engine()
        engine._model.predict.return_value = {"hey_fox": 0.91}

        detection = engine.process_samples(np.array([0, 1000, -1000], dtype=np.int16))

        self.assertIsNotNone(detection)
        self.assertEqual(detection.phrase, "Hey Jarvis")
        self.assertEqual(detection.model_key, "hey_fox")

    def test_rejects_below_threshold(self):
        engine = self.build_engine()
        engine._model.predict.return_value = {"hey_fox": 0.2}

        detection = engine.process_samples(np.array([0, 1000, -1000], dtype=np.int16))

        self.assertIsNone(detection)

    def test_enforces_cooldown(self):
        engine = self.build_engine()
        engine._model.predict.return_value = {"hey_fox": 0.95}
        samples = np.array([0, 1000, -1000], dtype=np.int16)

        first = engine.process_samples(samples)
        second = engine.process_samples(samples)

        self.assertIsNotNone(first)
        self.assertIsNone(second)

    def test_rejects_odd_byte_payload(self):
        engine = self.build_engine()

        with self.assertRaises(ValueError):
            engine.process_audio_bytes(b"\x01")


if __name__ == "__main__":
    unittest.main()
