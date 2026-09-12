from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from models.schemas import TTSSynthesizeRequest
from tts import available_engines, list_engine_voices, synthesize_speech, UnsupportedTTSEngine

router = APIRouter()


@router.get("/tts/engines")
async def get_tts_engines():
    return {"success": True, "engines": available_engines()}


@router.get("/tts/voices")
async def get_tts_voices(engine: str = "edge"):
    try:
        voices = await list_engine_voices(engine)
        return {"success": True, "engine": engine, "voices": voices}
    except UnsupportedTTSEngine as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tts/synthesize")
async def synthesize_tts(req: TTSSynthesizeRequest):
    try:
        audio_bytes, content_type = await synthesize_speech(req.text, engine=req.engine, voice=req.voice)
        return Response(content=audio_bytes, media_type=content_type)
    except UnsupportedTTSEngine as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
