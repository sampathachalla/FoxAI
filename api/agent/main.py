from __future__ import annotations
import sys
from pathlib import Path

# Add current agent directory to Python path
sys.path.insert(0, str(Path(__file__).resolve().parent))

# MUST be the first FoxAI import: lets the upstream Hermes runtime claim the
# top-level ``tools``/``toolsets`` package names before FoxAI's same-named
# packages do. See agents/hermes_bootstrap.py.
from agents import hermes_bootstrap  # noqa: F401,E402

from server.main import app  # noqa: E402

if __name__ == "__main__":
    import uvicorn
    from config.settings import settings

    print(f"[Hermes FastAPI] Starting server on port {settings.FASTAPI_PORT}...")
    uvicorn.run(app, host="0.0.0.0", port=settings.FASTAPI_PORT)
