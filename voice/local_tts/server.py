"""HTTP text-to-speech for the non-LiveKit voice path.

The API calls these routes when the user picks Voice Edge or Voice Piper in
Settings; the LiveKit worker (worker.py) uses the same ``tts`` package
directly for realtime speech. Runs alongside the worker in the voice
container (see start.sh); run with ``python -m local_tts.server``.
"""

import logging
import os

from aiohttp import web

from tts import UnsupportedTTSEngine, available_engines, list_engine_voices, synthesize_speech

logger = logging.getLogger("fox.voice.local_tts")


async def health(request: web.Request) -> web.Response:
    return web.json_response({"status": "ok", "service": "fox-voice-tts"})


async def tts_engines(request: web.Request) -> web.Response:
    return web.json_response({"success": True, "engines": available_engines()})


async def tts_voices(request: web.Request) -> web.Response:
    engine = request.query.get("engine", "edge")
    try:
        voices = await list_engine_voices(engine)
    except UnsupportedTTSEngine as e:
        return web.json_response({"detail": str(e)}, status=400)
    return web.json_response({"success": True, "engine": engine, "voices": voices})


async def tts_synthesize(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except ValueError:
        return web.json_response({"detail": "Request body must be JSON"}, status=400)
    text = body.get("text") if isinstance(body, dict) else None
    if not isinstance(text, str):
        return web.json_response({"detail": "'text' is required"}, status=400)
    try:
        audio_bytes, content_type = await synthesize_speech(
            text, engine=body.get("engine") or "edge", voice=body.get("voice")
        )
    except (UnsupportedTTSEngine, ValueError) as e:
        return web.json_response({"detail": str(e)}, status=400)
    except RuntimeError as e:
        return web.json_response({"detail": str(e)}, status=503)
    return web.Response(body=audio_bytes, content_type=content_type)


def create_app() -> web.Application:
    app = web.Application()
    app.add_routes(
        [
            web.get("/health", health),
            web.get("/tts/engines", tts_engines),
            web.get("/tts/voices", tts_voices),
            web.post("/tts/synthesize", tts_synthesize),
        ]
    )
    return app


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    web.run_app(create_app(), host="0.0.0.0", port=int(os.getenv("VOICE_TTS_PORT", "8200")))
