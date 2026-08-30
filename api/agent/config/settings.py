import os
from pathlib import Path
from dotenv import load_dotenv

# Search and load root or api .env files
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")
load_dotenv(dotenv_path=BASE_DIR.parent / ".env")
load_dotenv(dotenv_path=BASE_DIR.parent.parent / ".env")

class Settings:
    OPENAI_API_KEY: str = os.getenv("OPEN_API_KEY") or os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")
    LIVEKIT_URL: str = os.getenv("LIVEKIT_URL", "")
    LIVEKIT_API_KEY: str = os.getenv("LIVEKIT_API_KEY", "")
    LIVEKIT_API_SECRET: str = os.getenv("LIVEKIT_API_SECRET", "")
    GROQ_STT_MODEL: str = os.getenv("GROQ_STT_MODEL", "whisper-large-v3-turbo")
    DEEPGRAM_TTS_MODEL: str = os.getenv("DEEPGRAM_TTS_MODEL", "aura-2-thalia-en")
    DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "gpt-5-nano" if (os.getenv("OPEN_API_KEY") or os.getenv("OPENAI_API_KEY")) else "gemini-2.5-flash")
    FASTAPI_PORT: int = int(os.getenv("PYTHON_PORT", "8000"))
    MAX_ITERATIONS: int = int(os.getenv("AGENT_MAX_ITERATIONS", "5"))
    TEMPERATURE: float = float(os.getenv("AGENT_TEMPERATURE", "0.3"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

settings = Settings()
