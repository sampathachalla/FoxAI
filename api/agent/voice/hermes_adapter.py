"""Bridge FoxAI's realtime voice worker to the official Nous Hermes runtime.

The adapter prefers the upstream Hermes Agent AIAgent implementation when it is
available, but keeps FoxAI's existing VoiceWorkflow as a compatibility fallback.
This lets Hermes evolve independently from LiveKit/STT/TTS code.
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
    """Prefer official Hermes while retaining the previous FoxAI runtime safely.

    ``HERMES_RUNTIME`` can be ``auto`` (default), ``upstream``, or ``local``.
    The upstream AIAgent is scoped to one voice session and calls are serialized
    because Hermes documents AIAgent as stateful/non-thread-safe.
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
            # Keep FoxAI's own api/agent modules first while making official
            # Hermes' top-level run_agent.py importable.
            sys.path.append(str(upstream_path))

        try:
            from run_agent import AIAgent  # type: ignore

            model = os.getenv("HERMES_MODEL", "openai/gpt-oss-20b")
            base_url = os.getenv("HERMES_BASE_URL", "https://api.groq.com/openai/v1")
            api_key = os.getenv("HERMES_API_KEY") or os.getenv("GROQ_API_KEY")
            max_iterations = int(os.getenv("HERMES_MAX_ITERATIONS", "8"))

            self._upstream_agent = AIAgent(
                model=model,
                base_url=base_url,
                api_key=api_key,
                quiet_mode=True,
                ephemeral_system_prompt=VOICE_SYSTEM_PROMPT,
                max_iterations=max_iterations,
                # Avoid unrelated project context overhead for realtime turns;
                # official Hermes memory/skills remain available.
                skip_context_files=_env_bool("HERMES_SKIP_CONTEXT_FILES", True),
                skip_memory=_env_bool("HERMES_SKIP_MEMORY", False),
                platform="fox-livekit",
            )
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

    async def _respond_local(
        self,
        transcript: str,
        history: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        result = await self.workflow.execute(transcript, history)
        text = result.get("text", "") if isinstance(result, dict) else str(result)
        return text.strip()

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
        """Return a complete response with automatic compatibility fallback."""
        if not self._upstream_agent:
            return await self._respond_local(transcript, history)

        async with self._lock:
            try:
                result = await asyncio.to_thread(self._run_upstream_sync, transcript, history)
                return str(result.get("final_response") or "").strip()
            except Exception:
                logger.exception("Official Hermes turn failed; falling back to FoxAI runtime")
                return await self._respond_local(transcript, history)

    async def stream_response(
        self,
        transcript: str,
        history: Optional[List[Dict[str, Any]]] = None,
    ) -> AsyncIterator[str]:
        """Yield official Hermes response deltas for low-latency TTS.

        Upstream Hermes exposes ``stream_delta_callback`` and switches to its
        streaming API path when a consumer is registered. A sentinel is queued
        from the worker thread after the call completes so no final deltas are
        lost to an event-loop race.
        """
        if not self._upstream_agent:
            text = await self._respond_local(transcript, history)
            if text:
                yield text
            return

        async with self._lock:
            loop = asyncio.get_running_loop()
            queue: asyncio.Queue[Optional[str]] = asyncio.Queue()
            emitted: List[str] = []
            previous_callback = getattr(self._upstream_agent, "stream_delta_callback", None)

            def on_delta(delta: str) -> None:
                if delta:
                    loop.call_soon_threadsafe(queue.put_nowait, str(delta))

            def run_and_signal() -> Dict[str, Any]:
                try:
                    return self._run_upstream_sync(transcript, history)
                finally:
                    loop.call_soon_threadsafe(queue.put_nowait, None)

            self._upstream_agent.stream_delta_callback = on_delta
            task = asyncio.create_task(asyncio.to_thread(run_and_signal))

            try:
                while True:
                    item = await queue.get()
                    if item is None:
                        break
                    emitted.append(item)
                    yield item

                try:
                    result = await task
                except Exception:
                    logger.exception("Official Hermes streaming turn failed")
                    # Falling back after partial speech would repeat content. Only
                    # use the compatibility runtime when nothing was spoken yet.
                    if not emitted:
                        fallback = await self._respond_local(transcript, history)
                        if fallback:
                            yield fallback
                    return

                final_text = str(result.get("final_response") or "").strip()
                if not emitted and final_text:
                    # Some OpenAI-compatible providers may return a complete
                    # answer even with a stream consumer attached.
                    yield final_text
            finally:
                self._upstream_agent.stream_delta_callback = previous_callback
