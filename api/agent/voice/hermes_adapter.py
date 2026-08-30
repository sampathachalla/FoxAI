"""Bridge FoxAI's realtime voice worker to the official Nous Hermes runtime.

The adapter prefers the upstream Hermes Agent AIAgent implementation when it is
available, but keeps FoxAI's existing VoiceWorkflow as a compatibility fallback.
LiveKit/STT/TTS remain independent from Hermes internals.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from pathlib import Path
from typing import Any, AsyncIterator, Callable, Dict, List, Optional

from integrations.agent_reach import is_agent_reach_tool_event, system_prompt_hint
from workflows.voice_workflow import VoiceWorkflow

logger = logging.getLogger("fox.voice.hermes")

VOICE_SYSTEM_PROMPT = (
    "You are Fox, a fast conversational voice assistant. Keep spoken answers "
    "natural, concise, and easy to understand. Use tools only when they are "
    "actually needed. For simple conversation, answer directly without tools."
    + system_prompt_hint()
)

HermesStateCallback = Callable[[str, Dict[str, Any]], None]


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


class HermesVoiceAdapter:
    """Prefer official Hermes while retaining the previous FoxAI runtime safely.

    One adapter/agent is created per LiveKit voice room. Upstream Hermes is
    stateful and non-thread-safe, so turns are serialized. If LiveKit cancels an
    in-progress generation, the adapter propagates a hard interrupt to Hermes,
    including child/tool workers, before allowing the next turn to start.
    """

    def __init__(
        self,
        workflow: Optional[VoiceWorkflow] = None,
        *,
        session_id: Optional[str] = None,
        state_callback: Optional[HermesStateCallback] = None,
    ):
        self.workflow = workflow or VoiceWorkflow()
        self.runtime_mode = os.getenv("HERMES_RUNTIME", "auto").strip().lower()
        self.session_id = session_id or "fox-voice"
        self.task_id = f"fox-voice:{self.session_id}"
        self.state_callback = state_callback
        self._upstream_agent: Any = None
        self._upstream_history: Optional[List[Dict[str, Any]]] = None
        self._lock = asyncio.Lock()
        self._active_task: Optional[asyncio.Task] = None
        self._agent_reach_active = False
        self._init_upstream()

    @property
    def using_upstream(self) -> bool:
        return self._upstream_agent is not None

    @property
    def runtime_name(self) -> str:
        return "upstream" if self.using_upstream else "fox-local"

    def _emit_state(self, state: str, **metadata: Any) -> None:
        callback = self.state_callback
        if callback is None:
            return
        payload = {"session_id": self.session_id, **metadata}
        try:
            callback(state, payload)
        except Exception:
            logger.exception("Hermes state callback failed")

    def _on_tool_start(self, *args: Any, **kwargs: Any) -> None:
        if is_agent_reach_tool_event(*args, **kwargs):
            self._agent_reach_active = True
            self._emit_state("searching", source="agent_reach")

    def _on_tool_complete(self, *args: Any, **kwargs: Any) -> None:
        if self._agent_reach_active:
            self._agent_reach_active = False
            self._emit_state("thinking", source="agent_reach")

    def _init_upstream(self) -> None:
        if self.runtime_mode == "local":
            logger.info("Hermes runtime forced to FoxAI local compatibility mode")
            return

        upstream_path = Path(os.getenv("HERMES_UPSTREAM_PATH", "/opt/hermes-agent"))
        if upstream_path.exists() and str(upstream_path) not in sys.path:
            sys.path.append(str(upstream_path))

        try:
            from run_agent import AIAgent  # type: ignore

            model = os.getenv("HERMES_MODEL", "openai/gpt-oss-20b")
            base_url = os.getenv("HERMES_BASE_URL", "https://api.groq.com/openai/v1")
            api_key = os.getenv("HERMES_API_KEY") or os.getenv("GROQ_API_KEY")
            max_iterations = int(os.getenv("HERMES_MAX_ITERATIONS", "6"))

            kwargs: Dict[str, Any] = {
                "model": model,
                "base_url": base_url,
                "api_key": api_key,
                "quiet_mode": True,
                "ephemeral_system_prompt": VOICE_SYSTEM_PROMPT,
                "max_iterations": max_iterations,
                "session_id": self.session_id,
                # Skip unrelated repository context for voice latency. Built-in
                # Hermes memory remains enabled unless explicitly disabled.
                "skip_context_files": _env_bool("HERMES_SKIP_CONTEXT_FILES", True),
                "skip_memory": _env_bool("HERMES_SKIP_MEMORY", False),
                "platform": "fox-livekit",
                # These are upstream Hermes callbacks. They do not change tool
                # execution; they only expose state to the transport/UI layer.
                "tool_start_callback": self._on_tool_start,
                "tool_complete_callback": self._on_tool_complete,
            }
            enabled_toolsets = _csv_env("HERMES_ENABLED_TOOLSETS")
            disabled_toolsets = _csv_env("HERMES_DISABLED_TOOLSETS")
            if enabled_toolsets is not None:
                kwargs["enabled_toolsets"] = enabled_toolsets
            if disabled_toolsets is not None:
                kwargs["disabled_toolsets"] = disabled_toolsets

            self._upstream_agent = AIAgent(**kwargs)
            logger.info(
                "Official Hermes runtime enabled: model=%s base_url=%s session=%s",
                model,
                base_url,
                self.session_id,
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

    def _prepare_upstream_turn(self) -> None:
        clear = getattr(self._upstream_agent, "clear_interrupt", None)
        if callable(clear):
            clear()

    def _run_upstream_sync(
        self,
        transcript: str,
        history: Optional[List[Dict[str, Any]]],
    ) -> Dict[str, Any]:
        self._prepare_upstream_turn()
        conversation_history = history if history is not None else self._upstream_history
        result = self._upstream_agent.run_conversation(
            user_message=transcript,
            conversation_history=conversation_history,
            task_id=self.task_id,
        )
        if isinstance(result, dict):
            messages = result.get("messages")
            if isinstance(messages, list):
                self._upstream_history = messages
            return result
        return {"final_response": str(result), "messages": conversation_history or []}

    def interrupt_current(self, *, reason: str = "voice turn superseded") -> None:
        """Propagate a LiveKit cancellation into upstream Hermes and its tools."""
        agent = self._upstream_agent
        if agent is None:
            return

        self._agent_reach_active = False
        self._emit_state("listening", reason="interrupted")
        try:
            hard_interrupt = getattr(agent, "hard_interrupt", None)
            if callable(hard_interrupt):
                hard_interrupt(reason, tool_reason="voice turn superseded")
                return

            interrupt = getattr(agent, "interrupt", None)
            if callable(interrupt):
                try:
                    interrupt(reason, hard_cancel=True)
                except TypeError:
                    interrupt(reason)
        except Exception:
            logger.exception("Failed to propagate interruption to Hermes")

    async def respond(
        self,
        transcript: str,
        history: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """Return a complete response with automatic compatibility fallback."""
        if not self._upstream_agent:
            return await self._respond_local(transcript, history)

        async with self._lock:
            self._emit_state("thinking")
            try:
                result = await asyncio.to_thread(self._run_upstream_sync, transcript, history)
                return str(result.get("final_response") or "").strip()
            except Exception:
                logger.exception("Official Hermes turn failed; falling back to FoxAI runtime")
                return await self._respond_local(transcript, history)
            finally:
                self._emit_state("listening")

    async def stream_response(
        self,
        transcript: str,
        history: Optional[List[Dict[str, Any]]] = None,
    ) -> AsyncIterator[str]:
        """Yield official Hermes response deltas and cancel work on barge-in.

        Upstream Hermes' ``stream_delta_callback`` drives the streaming API path.
        A sentinel is queued from the Hermes worker thread when the turn exits so
        the asyncio consumer cannot lose the final token. If LiveKit cancels this
        generator, ``hard_interrupt`` is sent to Hermes before the lock is
        released, preventing an old tool/LLM turn from racing the new voice turn.
        """
        if not self._upstream_agent:
            self._emit_state("thinking")
            try:
                text = await self._respond_local(transcript, history)
                if text:
                    self._emit_state("speaking")
                    yield text
            finally:
                self._emit_state("listening")
            return

        async with self._lock:
            self._emit_state("thinking")
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
            self._active_task = task

            try:
                first_delta = True
                while True:
                    item = await queue.get()
                    if item is None:
                        break
                    if first_delta:
                        first_delta = False
                        self._emit_state("speaking")
                    emitted.append(item)
                    yield item

                try:
                    result = await task
                except Exception:
                    logger.exception("Official Hermes streaming turn failed")
                    if not emitted:
                        fallback = await self._respond_local(transcript, history)
                        if fallback:
                            self._emit_state("speaking")
                            yield fallback
                    return

                final_text = str(result.get("final_response") or "").strip()
                if not emitted and final_text:
                    self._emit_state("speaking")
                    yield final_text
            except asyncio.CancelledError:
                self.interrupt_current(reason="LiveKit interrupted voice generation")
                if not task.done():
                    try:
                        await asyncio.shield(task)
                    except Exception:
                        pass
                raise
            finally:
                self._active_task = None
                self._agent_reach_active = False
                self._upstream_agent.stream_delta_callback = previous_callback
                self._emit_state("listening")
