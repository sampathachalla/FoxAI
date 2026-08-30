"""Runtime configuration for Agent Reach.

The Hermes adapter only consumes the generic ``system_prompt_hint`` function;
all Agent Reach-specific routing language and feature flags stay here.
"""

import os


def agent_reach_enabled() -> bool:
    raw = os.getenv("AGENT_REACH_ENABLED", "true")
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def system_prompt_hint() -> str:
    if not agent_reach_enabled():
        return ""
    return (
        " When the user asks for fresh internet research, web search, current "
        "public information, a URL, GitHub, YouTube, Reddit, Twitter/X, RSS, "
        "or another supported internet source, load and follow the installed "
        "agent-reach skill. Do not use it for ordinary conversation that does "
        "not require current external information."
    )
