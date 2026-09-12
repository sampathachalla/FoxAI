import asyncio
import logging
import time
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException

from agents.hermes_orchestrator import build_upstream_hermes, upstream_available
from models.schemas import AgentRunRequest, AgentRunResponse
from prompts.hermes_prompt import DEFAULT_HERMES_SYSTEM_PROMPT

router = APIRouter()
logger = logging.getLogger("fox.agent.routes")

# Built eagerly: safe even if upstream Hermes has claimed the shared
# ``tools``/``toolsets`` names, since this only touches agents/hermes_bootstrap.
upstream_agent = build_upstream_hermes(
    session_id="fox-http",
    system_prompt=DEFAULT_HERMES_SYSTEM_PROMPT,
)

# Built lazily: importing ``tools`` (FoxAI's own fallback registry) fails if
# upstream Hermes has claimed that top-level name in-process. Never import it
# at module load.
_local_registry = None
_local_agent = None


def _get_local_registry():
    global _local_registry
    if _local_registry is None:
        from tools import create_default_registry

        _local_registry = create_default_registry()
    return _local_registry


def _get_local_agent(**overrides: Any):
    global _local_agent
    try:
        from agents.local_agent import FoxLocalAgent
    except Exception as exc:
        logger.error("FoxAI local fallback agent unavailable: %s", exc)
        return None

    if overrides:
        return FoxLocalAgent(registry=_get_local_registry(), **overrides)
    if _local_agent is None:
        _local_agent = FoxLocalAgent(registry=_get_local_registry())
    return _local_agent


@router.get("/agent/tools")
async def list_tools():
    try:
        registry = _get_local_registry()
        tools = registry.get_definitions()
    except Exception as exc:
        logger.error("FoxAI local tool registry unavailable: %s", exc)
        tools = []
    return {
        "success": True,
        "runtime": "nous-hermes" if upstream_available() else "fox-local",
        "tools": tools
    }


def _run_upstream_sync(prompt: str, history: Optional[list]) -> Dict[str, Any]:
    result = upstream_agent.run_conversation(
        user_message=prompt,
        conversation_history=history,
        task_id="fox-http",
    )
    return result if isinstance(result, dict) else {"final_response": str(result)}


@router.post("/agent/run", response_model=AgentRunResponse)
async def run_agent(req: AgentRunRequest):
    if upstream_agent is not None:
        try:
            start_time = time.time()
            result = await asyncio.to_thread(_run_upstream_sync, req.prompt, req.history)
            return AgentRunResponse(
                success=True,
                data={
                    "text": str(result.get("final_response") or "").strip(),
                    "thought": "",
                    "steps": [],
                    "toolsExecuted": [],
                    "tokens": {},
                    "durationMs": int((time.time() - start_time) * 1000),
                    "runtime": "nous-hermes",
                },
            )
        except Exception as e:
            logger.exception("Nous Hermes execution error, falling back to FoxAI local agent")

    overrides: Dict[str, Any] = {}
    if req.model or (req.temperature is not None and req.temperature != 0.3):
        overrides = {
            "model": req.model,
            "temperature": req.temperature,
            "max_iterations": req.max_iterations,
        }

    active_agent = _get_local_agent(**overrides)
    if active_agent is None:
        raise HTTPException(
            status_code=503,
            detail="Neither upstream Hermes nor the FoxAI local fallback agent is available.",
        )

    try:
        res = await active_agent.run(req.prompt, req.history)
        res["runtime"] = "fox-local"
        return AgentRunResponse(success=True, data=res)
    except Exception as e:
        logger.exception("FoxAI local agent execution error")
        raise HTTPException(status_code=500, detail=str(e))
