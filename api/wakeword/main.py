from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from engine import WakeWordEngine


WAKEWORD_PORT = int(os.getenv("WAKEWORD_PORT", "8011"))
WAKEWORD_ENABLED = os.getenv("WAKEWORD_ENABLED", "true").lower() != "false"
WAKEWORD_PHRASE = os.getenv("WAKEWORD_PHRASE", "Hey Jarvis")
WAKEWORD_MODEL_KEY = os.getenv("WAKEWORD_MODEL_KEY", "hey jarvis")
WAKEWORD_MODEL_PATH = os.getenv("WAKEWORD_MODEL_PATH") or None
WAKEWORD_THRESHOLD = float(os.getenv("WAKEWORD_THRESHOLD", "0.5"))
WAKEWORD_COOLDOWN_SECONDS = float(os.getenv("WAKEWORD_COOLDOWN_SECONDS", "3.0"))

engine = WakeWordEngine(
    model_path=WAKEWORD_MODEL_PATH,
    phrase=WAKEWORD_PHRASE,
    model_key=WAKEWORD_MODEL_KEY,
    threshold=WAKEWORD_THRESHOLD,
    cooldown_seconds=WAKEWORD_COOLDOWN_SECONDS,
    enabled=WAKEWORD_ENABLED,
)

app = FastAPI(
    title="Fox OpenWakeWord Service",
    version="1.0.0",
    description="Streaming wake-word detection for Fox using openWakeWord.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok" if engine.is_ready() else "degraded",
        "service": "Fox OpenWakeWord",
        "enabled": WAKEWORD_ENABLED,
        "ready": engine.is_ready(),
        "phrase": WAKEWORD_PHRASE,
        "modelPath": WAKEWORD_MODEL_PATH or "builtin:hey_jarvis",
        "modelExists": Path(WAKEWORD_MODEL_PATH).exists() if WAKEWORD_MODEL_PATH else True,
        "threshold": WAKEWORD_THRESHOLD,
        "cooldownSeconds": WAKEWORD_COOLDOWN_SECONDS,
        "loadError": engine.load_error,
    }


@app.websocket("/ws")
async def wakeword_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    await websocket.send_json(
        {
            "type": "ready" if engine.is_ready() else "unavailable",
            "phrase": WAKEWORD_PHRASE,
            "ready": engine.is_ready(),
            "loadError": engine.load_error,
        }
    )

    if not engine.is_ready():
        await websocket.close(code=1013, reason=engine.load_error or "Wake-word model unavailable.")
        return

    try:
        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                break
            payload = message.get("bytes")
            if payload is None:
                continue

            try:
                detection = engine.process_audio_bytes(payload)
            except ValueError as exc:
                await websocket.send_json({"type": "error", "message": str(exc)})
                continue

            if detection is not None:
                print(
                    f"[Fox WakeWord] Detected {detection.phrase} "
                    f"(score={detection.score:.3f}, model={detection.model_key})"
                )
                await websocket.send_json(
                    {
                        "type": "detected",
                        "phrase": detection.phrase,
                        "score": detection.score,
                        "timestamp": detection.timestamp_ms,
                        "modelKey": detection.model_key,
                    }
                )
    except WebSocketDisconnect:
        return
    except RuntimeError as exc:
        if "disconnect message" in str(exc):
            return
        return


if __name__ == "__main__":
    import uvicorn

    print(f"[Fox WakeWord] Starting server on port {WAKEWORD_PORT}...")
    uvicorn.run(app, host="0.0.0.0", port=WAKEWORD_PORT)
