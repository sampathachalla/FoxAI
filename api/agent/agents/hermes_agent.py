import time
from typing import Any, Dict, List, Optional
from config.settings import settings
from prompts.hermes_prompt import DEFAULT_HERMES_SYSTEM_PROMPT, format_tools_system_prompt
from models.llm_client import LLMClient
from models.schemas import ToolCall
from tools import ToolRegistry, create_default_registry
from memory.buffer import MemoryBuffer
from observability.tracer import AgentTracer
from chains.react_chain import ReActChain
from .base import BaseAgent

class HermesAgent(BaseAgent):
    def __init__(
        self,
        model: Optional[str] = None,
        registry: Optional[ToolRegistry] = None,
        max_iterations: Optional[int] = None,
        temperature: Optional[float] = None,
        system_prompt: Optional[str] = None,
    ):
        self.model = model or settings.DEFAULT_MODEL
        self.temperature = temperature if temperature is not None else settings.TEMPERATURE
        self.max_iterations = max_iterations or settings.MAX_ITERATIONS
        self.system_prompt = system_prompt or DEFAULT_HERMES_SYSTEM_PROMPT

        self.registry = registry or create_default_registry()
        self.memory = MemoryBuffer()
        self.tracer = AgentTracer()
        self.llm = LLMClient(model=self.model, temperature=self.temperature)
        self.chain = ReActChain(
            llm=self.llm,
            registry=self.registry,
            tracer=self.tracer,
            max_iterations=self.max_iterations
        )

    async def run(self, prompt: str, history: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        start_time = time.time()
        self.tracer.start_trace(prompt)

        history = history or self.memory.get_messages()

        full_system = self.system_prompt + "\n" + format_tools_system_prompt(self.registry.get_definitions())
        messages: List[Dict[str, str]] = [{"role": "system", "content": full_system}]
        messages.extend([{"role": h.get("role", "user"), "content": h.get("content", "")} for h in history])
        messages.append({"role": "user", "content": prompt})

        final_text, thought, steps, tools_executed = await self.chain.execute(messages)

        duration_ms = int((time.time() - start_time) * 1000)
        self.tracer.end_trace(final_text, success=True)

        self.memory.add_message("user", prompt)
        self.memory.add_message("assistant", final_text)

        return {
            "success": True,
            "text": final_text,
            "thought": thought,
            "steps": [s.dict() for s in steps],
            "toolsExecuted": [t.dict() for t in tools_executed],
            "durationMs": duration_ms
        }
