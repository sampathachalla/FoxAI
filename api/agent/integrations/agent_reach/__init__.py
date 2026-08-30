"""Agent Reach integration for the official Hermes runtime.

Everything specific to Agent Reach lives in this package so the voice/Hermes
layers stay provider-agnostic.
"""

from .config import agent_reach_enabled, system_prompt_hint

__all__ = ["agent_reach_enabled", "system_prompt_hint"]
