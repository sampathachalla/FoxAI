import sys
from pathlib import Path

# Add current agent directory to Python path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from config.settings import settings
from models.schemas import AgentRunRequest, AgentRunResponse
from agents.hermes_agent import HermesAgent
from tools import create_default_registry
from workflows.chat_workflow import ChatWorkflow
from observability.tracer import AgentTracer

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

registry = create_default_registry()
default_agent = HermesAgent(registry=registry)
chat_workflow = ChatWorkflow(agent=default_agent)

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "Fox Hermes Agent Python Microservice",
        "architecture": "Hermes Modular Layout",
        "hasOpenAIKey": bool(settings.OPENAI_API_KEY),
        "hasGeminiKey": bool(settings.GEMINI_API_KEY),
        "defaultModel": settings.DEFAULT_MODEL,
    }

@app.get("/agent/tools")
async def list_tools():
    return {
        "success": True,
        "tools": registry.get_definitions()
    }

@app.post("/agent/run", response_model=AgentRunResponse)
async def run_agent(req: AgentRunRequest):
    try:
        active_agent = default_agent
        if req.model or (req.temperature is not None and req.temperature != 0.3):
            active_agent = HermesAgent(
                model=req.model,
                registry=registry,
                temperature=req.temperature,
                max_iterations=req.max_iterations
            )

        res = await active_agent.run(req.prompt, req.history)
        return AgentRunResponse(success=True, data=res)
    except Exception as e:
        print(f"[Hermes FastAPI] Execution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print(f"[Hermes FastAPI] Starting server on port {settings.FASTAPI_PORT}...")
    uvicorn.run(app, host="0.0.0.0", port=settings.FASTAPI_PORT)
