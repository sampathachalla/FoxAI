import os
import sys
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables
load_dotenv(dotenv_path="../.env")
load_dotenv(dotenv_path="../../.env")

from hermes_agent import HermesAgent
from tools import create_default_registry

app = FastAPI(
    title="Fox Jarvis Hermes Agent Microservice",
    version="2.0.0",
    description="Python FastAPI service running Nous Research Hermes Agent architecture for Fox Voice Assistant"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AgentRunRequest(BaseModel):
    prompt: str
    history: Optional[List[Dict[str, Any]]] = None
    model: Optional[str] = None
    temperature: Optional[float] = 0.3
    max_iterations: Optional[int] = 5

class AgentRunResponse(BaseModel):
    success: bool
    data: Dict[str, Any]

registry = create_default_registry()
agent = HermesAgent(registry=registry)

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "Fox Hermes Agent Python Service",
        "engine": "FastAPI + Hermes ReAct Loop",
        "hasOpenAIKey": bool(os.getenv("OPEN_API_KEY") or os.getenv("OPENAI_API_KEY")),
        "hasGeminiKey": bool(os.getenv("GEMINI_API_KEY")),
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
        current_agent = agent
        if req.model or req.temperature != 0.3:
            current_agent = HermesAgent(
                model=req.model,
                registry=registry,
                temperature=req.temperature or 0.3,
                max_iterations=req.max_iterations or 5
            )

        res = await current_agent.run(req.prompt, req.history)
        return AgentRunResponse(success=True, data=res)
    except Exception as e:
        print(f"[Hermes FastAPI] Error running agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PYTHON_PORT", "8000"))
    print(f"[Hermes FastAPI] Starting server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
