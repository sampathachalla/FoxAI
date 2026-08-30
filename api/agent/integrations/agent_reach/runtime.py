"""Runtime helpers for the Agent Reach integration.

Nothing in this module depends on LiveKit or Hermes internals. It only knows how
to identify Agent Reach/search work from generic Hermes tool callback payloads so
higher layers can expose a useful "searching" state without coupling themselves
to Agent Reach command details.
"""

from __future__ import annotations

import json
from typing import Any

_AGENT_REACH_MARKERS = (
    "agent-reach",
    "agent_reach",
    "mcporter",
    "exa.web_search_exa",
    "exa.get_code_context_exa",
    "r.jina.ai/",
    "twitter search",
    "rdt search",
    "opencli reddit",
    "opencli twitter",
    "opencli instagram",
    "opencli facebook",
    "bili search",
    "gh search",
    "yt-dlp",
)


def _flatten_payload(*args: Any, **kwargs: Any) -> str:
    """Best-effort, non-throwing text projection of Hermes callback payloads."""
    parts: list[str] = []
    for value in args:
        try:
            if isinstance(value, str):
                parts.append(value)
            else:
                parts.append(json.dumps(value, default=str, ensure_ascii=False))
        except Exception:
            parts.append(str(value))
    if kwargs:
        try:
            parts.append(json.dumps(kwargs, default=str, ensure_ascii=False))
        except Exception:
            parts.append(str(kwargs))
    return " ".join(parts).lower()


def is_agent_reach_tool_event(*args: Any, **kwargs: Any) -> bool:
    """Return True when a generic Hermes tool callback looks like Agent Reach.

    Hermes may surface Agent Reach through terminal/MCP rather than a tool whose
    literal name is ``agent-reach``. Matching the command payload keeps this
    integration isolated and avoids changing upstream Hermes.
    """
    payload = _flatten_payload(*args, **kwargs)
    return any(marker in payload for marker in _AGENT_REACH_MARKERS)
