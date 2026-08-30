"""Bridge FoxAI's realtime voice worker to the official Nous Hermes runtime.

The adapter prefers the upstream Hermes Agent AIAgent implementation when it is
available, but keeps FoxAI's existing VoiceWorkflow as a compatibility fallback.
This lets us upgrade Hermes independently without coupling LiveKit/STT/TTS code
to Hermes internals.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from pathlib import Path
from typing import Any, AsyncIterator, Dict, List, Optional

from workflows.voice_workflow import VoiceWorkflow

logger = logging.getLogger("fox.voice.hermes")

VOICE_SYSTEM_PROMPT = (
    "You are Fox, a fast conversational voice assistant. Keep spoken answers "
    "natural, concise, and easy to understand. Use tools when they are useful, "
    "but avoid unnecessary tool calls for simple conversation."
)


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class HermesVoiceAdapter:
    """Use upstream Hermes when available, otherwise preserve the old runtime.

    Runtime selection:
      - HERMES_RUNTIME=upstream -> require upstream Hermes, but still fall back
        if initialization fails so voice does not become unusable.
      - HERMES_RUNTIME=local -> always use FoxAI's existing VoiceWorkflow.
      - HERMES_RUNTIME=auto (default) -> use upstream when installed/available.

    The upstream instance is scoped to this voice session. Hermes documents that
    AIAgent is stateful and should not be shared concurrently, so calls are
    serialized with an asyncio lock.
    """

    def __init__(self, workflow: Optional[VoiceWorkflow] = None):
        self.workflow = workflow or VoiceWorkflow()
        self.runtime_mode = os.getenv("HERMES_RUNTIME", "auto").strip().lower()
        self._upstream_agent: Any = None
        self._upstream_history: Optional[List[Dict[str, Any]]] = None
        self._lock = asyncio.Lock()
        self._init_upstream()

    @property
    def using_upstream(self) -> bool:
        return self._upstream_agent is not None

    @property
    def runtime_name(self) -> str:
        return "upstream" if self.using_upstream else "fox-local"

    def _init_upstream(self) -> None:
        if self.runtime_mode == "local":
            logger.info("Hermes runtime forced to FoxAI local compatibility mode")
            return

        upstream_path = Path(os.getenv("HERMES_UPSTREAM_PATH", "/opt/hermes-agent"))
        if upstream_path.exists() and str(upstream_path) not in sys.path:
            # Insert after FoxAI's own api/agent directory so our local packages
            # keep their normal import precedence while run_agent.py can still
            # be resolved from the official Hermes checkout.
            sys.path.append(str(upstream_path))

        try:
            from run_agent import AIAgent  # type: ignore

            model = os.getenv("HERMES_MODEL", "openai/gpt-oss-20b")
            base_url = os.getenv("HERMES_BASE_URL", "https://api.groq.com/openai/v1")
            api_key = os.getenv("HERMES_API_KEY") or os.getenv("GROQ_API_KEY")
            max_iterations = int(os.getenv("HERMES_MAX_ITERATIONS", "8"))

            kwargs: Dict[str, Any] = {
                "model": model,
                "base_url": base_url,
                "api_key": api_key,
                "quiet_mode": True,
                "ephemeral_system_prompt": VOICE_SYSTEM_PROMPT,
                "max_iterations": max_iterations,
                # Project AGENTS.md files are not needed for normal voice turns
                # and add prompt-building overhead. Hermes memory remains enabled.
                "skip_context_files": _env_bool("HERMES_SKIP_CONTEXT_FILES", True),
                "skip_memory": _env_bool("HERMES_SKIP_MEMORY", False),
                "platform": "fox-livekit",
            }

            self._upstream_agent = AIAgent(**kwargs)
            logger.info(
                "Official Hermes runtime enabled: model=%s base_url=%s",
                model,
                base_url,
            )
        except Exception as exc:
            self._upstream_agent = None
            level = logging.ERROR if self.runtime_mode == "upstream" else logging.WARNING
            logger.log(
                level,
                "Official Hermes runtime unavailable; using FoxAI compatibility runtime: %s",
                exc,
            )

    def _run_upstream_sync(
        self,
        transcript: str,
        history: Optional[List[Dict[str, Any]]],
    ) -> Dict[str, Any]:
        conversation_history = history if history is not None else self._upstream_history
        result = self._upstream_agent.run_conversation(
            user_message=transcript,
            conversation_history=conversation_history,
        )
        if isinstance(result, dict):
            messages = result.get("messages")
            if isinstance(messages, list):
                self._upstream_history = messages
            return result
        return {"final_response": str(result), "messages": conversation_history or []}

    async def respond(
        self,
        transcript: str,
        history: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """Return a complete response while preserving the old compatibility path."""
        if not self._upstream_agent:
            result = await self.workflow.execute(transcript, history)
            text = result.get("text", "") if isinstance(result, dict) else str(result)
            return text.strip()

        async with self._lock:
            result = await asyncio.to_thread(self._run_upstream_sync, transcript, history)
            return str(result.get("final_response") or "").strip()

    async def stream_response(
        self,
        transcript: str,
        history: Optional[List[Dict[str, Any]]] = None,
    ) -> AsyncIterator[str]:
        """Yield upstream Hermes text deltas as soon as they are generated.

        Official Hermes exposes ``stream_delta_callback``. Registering a stream
        consumer causes its agent loop to use the streaming API path. The model
        call still runs in a worker thread because AIAgent is synchronous, while
        deltas are bridged safely back to the asyncio/LiveKit event loop.

        The local compatibility runtime has no equivalent token callback, so it
        yields one complete response and remains behavior-compatible.
        """
        if not self._upstream_agent:
            text = await self.respond(transcript, history)
            if text:
                yield text
            return

        async with self._lock:
            loop = asyncio.get_running_loop()
            queue: asyncio.Queue[str] = asyncio.Queue()
            emitted: List[str] = []
            previous_callback = getattr(self._upstream_agent, "stream_delta_callback", None)

            def on_delta(delta: str) -> None:
                if not delta:
                    return
                loop.call_soon_threadsafe(queue.put_nowait, str(delta))

            self._upstream_agent.stream_delta_callback = on_delta
            task = asyncio.create_task(
                asyncio.to_thread(self._run_upstream_sync, transcript, history)
            )

            try:
                while not task.done() or not queue.empty():
                    try:
                        delta = await asyncio.wait_for(queue.get(), timeout=0.05)
                    except asyncio.TimeoutError:
                        continue
                    emitted.append(delta)
                    yield delta

                result = await task
                final_text = str(result.get("final_response") or "").strip()
                if not emitted and final_text:
                    # Provider/runtime did not expose incremental deltas; still
                    # return the response rather than failing the voice turn.
                    yield final_text
            finally:
                self._upstream_agent.stream_delta_callback = previous_callback
