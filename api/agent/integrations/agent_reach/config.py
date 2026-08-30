"""Runtime configuration and routing policy for Agent Reach.

All Agent Reach-specific policy lives here. The Hermes adapter only consumes the
resulting prompt hint and generic event helpers, keeping the voice architecture
independent from search-provider details.
"""

import os


def _env_int(name: str, default: int, minimum: int = 1) -> int:
    try:
        return max(int(os.getenv(name, str(default))), minimum)
    except (TypeError, ValueError):
        return default


def agent_reach_enabled() -> bool:
    raw = os.getenv("AGENT_REACH_ENABLED", "true")
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def quick_result_limit() -> int:
    return _env_int("AGENT_REACH_QUICK_RESULTS", 5)


def deep_result_limit() -> int:
    return _env_int("AGENT_REACH_DEEP_RESULTS", 10)


def system_prompt_hint() -> str:
    """Small routing hint optimized for voice latency.

    Ordinary conversation stays on the direct Hermes/model path. Fresh/current
    requests use a narrow search first. Expensive multi-source research is only
    used when the user explicitly asks for deeper research/comparison.
    """
    if not agent_reach_enabled():
        return ""

    quick = quick_result_limit()
    deep = deep_result_limit()
    return (
        " Agent Reach is available as the internet retrieval capability. "
        "Do not use it for ordinary conversation or stable knowledge that can be "
        "answered directly. Use it when the user asks for fresh/current public "
        "information, web search, a URL, GitHub, YouTube, Reddit, Twitter/X, RSS, "
        "or another supported internet source. For a normal current-information "
        f"question, use the QUICK path: one focused search, at most {quick} useful "
        "results, then answer immediately; do not fan out to multiple platforms. "
        "Only use the DEEP path when the user explicitly asks to research deeply, "
        f"compare sources, or investigate broadly; then use up to {deep} useful "
        "results and multiple sources/platforms as needed. Prefer concise evidence "
        "sufficient to answer rather than fetching large pages unnecessarily. "
        "If the active turn is interrupted, stop search/tool work promptly."
    )
