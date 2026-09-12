"""Shared entry point for obtaining the upstream Nous Research Hermes agent.

Nous Research Hermes (``AIAgent`` from NousResearch/hermes-agent) is FoxAI's
one real orchestrator. The HTTP agent (``server/routes/agent.py``) builds its
upstream Hermes instance through ``build_upstream_hermes`` for a consistent
configuration (model, toolsets, memory/context settings).

The LiveKit voice agent (``agents/voice_agent/worker.py``) is pure realtime
transport and does not use this module directly — it answers turns with its
own Groq LLM and hands heavier tasks to the HTTP agent above via
``delegate_to_worker_agent``, which is how voice reaches Hermes indirectly.

``agents.hermes_bootstrap`` must already have run (as the first project
import) before this module is used, so upstream Hermes has had the chance to
claim the shared ``tools``/``toolsets`` package names.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Callable, Dict, List, Optional

from agents.hermes_bootstrap import AIAgent, HERMES_IMPORT_ERROR

logger = logging.getLogger("fox.hermes.orchestrator")


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _csv_env(name: str) -> Optional[List[str]]:
    raw = (os.getenv(name) or "").strip()
    if not raw:
        return None
    values = [item.strip() for item in raw.split(",") if item.strip()]
    return values or None


def upstream_available() -> bool:
    return AIAgent is not None


def build_upstream_hermes(
    *,
    session_id: str,
    system_prompt: str,
    max_iterations: Optional[int] = None,
    tool_start_callback: Optional[Callable[..., None]] = None,
    tool_complete_callback: Optional[Callable[..., None]] = None,
) -> Optional[Any]:
    """Return a configured upstream Hermes ``AIAgent``, or ``None`` if the
    upstream runtime is unavailable (see ``HERMES_IMPORT_ERROR`` for why)."""
    if AIAgent is None:
        logger.warning(
            "Upstream Hermes unavailable, caller must fall back: %s",
            HERMES_IMPORT_ERROR,
        )
        return None

    try:
        model = os.getenv("HERMES_MODEL", "openai/gpt-oss-20b")
        base_url = os.getenv("HERMES_BASE_URL", "https://api.groq.com/openai/v1")
        api_key = os.getenv("HERMES_API_KEY") or os.getenv("GROQ_API_KEY")
        resolved_max_iterations = max_iterations or int(os.getenv("HERMES_MAX_ITERATIONS", "6"))

        kwargs: Dict[str, Any] = {
            "model": model,
            "base_url": base_url,
            "api_key": api_key,
            "quiet_mode": True,
            "ephemeral_system_prompt": system_prompt,
            "max_iterations": resolved_max_iterations,
            "session_id": session_id,
            # Built-in Hermes memory remains enabled unless explicitly disabled.
            "skip_context_files": _env_bool("HERMES_SKIP_CONTEXT_FILES", True),
            "skip_memory": _env_bool("HERMES_SKIP_MEMORY", False),
            "platform": "fox-ai",
        }
        if tool_start_callback is not None:
            kwargs["tool_start_callback"] = tool_start_callback
        if tool_complete_callback is not None:
            kwargs["tool_complete_callback"] = tool_complete_callback

        enabled_toolsets = _csv_env("HERMES_ENABLED_TOOLSETS")
        disabled_toolsets = _csv_env("HERMES_DISABLED_TOOLSETS")
        if enabled_toolsets is not None:
            kwargs["enabled_toolsets"] = enabled_toolsets
        if disabled_toolsets is not None:
            kwargs["disabled_toolsets"] = disabled_toolsets

        agent = AIAgent(**kwargs)
        logger.info(
            "Upstream Hermes orchestrator ready: model=%s base_url=%s session=%s",
            model,
            base_url,
            session_id,
        )
        return agent
    except Exception:
        logger.exception("Failed to construct upstream Hermes orchestrator")
        return None
