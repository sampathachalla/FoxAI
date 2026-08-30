"""Agent Reach integration for the official Hermes runtime.

Everything specific to Agent Reach lives in this package so the voice/Hermes
layers stay provider-agnostic.
"""

from .config import (
    agent_reach_enabled,
    deep_result_limit,
    quick_result_limit,
    system_prompt_hint,
)
from .runtime import is_agent_reach_tool_event

__all__ = [
    "agent_reach_enabled",
    "quick_result_limit",
    "deep_result_limit",
    "system_prompt_hint",
    "is_agent_reach_tool_event",
]
