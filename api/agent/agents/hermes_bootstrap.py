"""Load the upstream Nous Research Hermes runtime BEFORE any FoxAI module
imports its own top-level ``tools`` / ``toolsets`` packages.

Used by the HTTP agent entrypoint (``main.py``) via
``agents/hermes_orchestrator.py``. The LiveKit voice agent
(``agents/voice_agent/worker.py``) is pure realtime transport with no Hermes
dependency of its own, so it never imports this module.

FoxAI ships a small ``tools`` package (a hand-written ``ToolRegistry`` used
only by FoxAI's own local fallback agent) whose name collides with Hermes'
much larger ``tools`` package. Python keeps only one module per name in
``sys.modules``; whichever is imported first wins. Any FoxAI import chain
that reaches ``from tools import ...`` before this module runs (e.g.
``server.routes.agent`` -> ``agents.local_agent`` -> ``from tools import
...``) claims the name for FoxAI before Hermes ever loads, so upstream
Hermes' own ``from tools.registry import CHECK_FN_CACHE_BYPASS`` then
resolves to the wrong package and raises ImportError.

Importing this module as the very first project import in ``main.py`` lets
Hermes win the name. If Hermes cannot be loaded (missing checkout, forced
local mode, or an incompatible upstream ref) the changes are rolled back so
FoxAI's own same-named packages can still load for the compatibility
fallback.
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

logger = logging.getLogger("fox.hermes.bootstrap")

# Populated on success; consumed by agents/hermes_orchestrator.py.
AIAgent = None  # type: ignore[assignment]
HERMES_IMPORT_ERROR: str | None = None

_runtime_mode = os.getenv("HERMES_RUNTIME", "auto").strip().lower()
_upstream_path = Path(os.getenv("HERMES_UPSTREAM_PATH", "/opt/hermes-agent"))
# Top-level names Hermes and FoxAI both define.
_SHARED_NAMES = ("tools", "toolsets")


def _truthy(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


# By default each process stays lightweight and only loads the in-process
# upstream Hermes runtime when explicitly requested — it is slow and pulls
# the whole coding-agent toolchain into whatever process imports it. The env
# var name is kept for backward compatibility with existing voice-worker
# deployments; it now gates in-process Hermes loading for any FoxAI process
# (HTTP included), not only the voice worker.
_inprocess_enabled = _truthy("VOICE_USE_INPROCESS_HERMES", default=False)


def _purge_shared_modules() -> None:
    for name in list(sys.modules):
        if any(name == n or name.startswith(n + ".") for n in _SHARED_NAMES):
            del sys.modules[name]


if not _inprocess_enabled:
    HERMES_IMPORT_ERROR = "in-process Hermes disabled (VOICE_USE_INPROCESS_HERMES not set)"
    logger.info(
        "Hermes bootstrap skipped: voice worker delegates heavy work to FastAPI"
    )
elif _runtime_mode == "local":
    HERMES_IMPORT_ERROR = "HERMES_RUNTIME=local"
    logger.info("Hermes bootstrap skipped: HERMES_RUNTIME=local")
elif not _upstream_path.exists():
    HERMES_IMPORT_ERROR = f"upstream checkout not found at {_upstream_path}"
    logger.warning("Hermes bootstrap skipped: %s", HERMES_IMPORT_ERROR)
else:
    # Prepend so Hermes' packages resolve ahead of FoxAI's same-named ones.
    _p = str(_upstream_path)
    while _p in sys.path:
        sys.path.remove(_p)
    sys.path.insert(0, _p)
    try:
        from run_agent import AIAgent as _AIAgent  # noqa: E402

        AIAgent = _AIAgent
        logger.info("Upstream Hermes runtime loaded from %s", _upstream_path)
    except Exception as exc:  # depends on the upstream checkout being compatible
        HERMES_IMPORT_ERROR = f"{type(exc).__name__}: {exc}"
        logger.warning("Upstream Hermes import failed, rolling back: %s", HERMES_IMPORT_ERROR)
        try:
            sys.path.remove(_p)
        except ValueError:
            pass
        # A partial import may have left half-loaded Hermes submodules under the
        # shared names; drop them so FoxAI can reclaim the names cleanly.
        _purge_shared_modules()


def upstream_available() -> bool:
    return AIAgent is not None
