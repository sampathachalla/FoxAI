from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.routes import agent, health, tts


def create_app() -> FastAPI:
    app = FastAPI(
        title="Fox Jarvis Hermes Agent Microservice",
        version="2.0.0",
        description="Python FastAPI service running structured Hermes Agent Architecture"
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(agent.router)
    app.include_router(tts.router)

    return app


app = create_app()
