from fastapi import APIRouter

from config.settings import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "Fox Hermes Agent Python Microservice",
        "architecture": "Hermes Modular Layout",
        "hasOpenAIKey": bool(settings.OPENAI_API_KEY),
        "hasGeminiKey": bool(settings.GEMINI_API_KEY),
        "defaultModel": settings.DEFAULT_MODEL,
    }
