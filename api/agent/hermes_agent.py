import json
import os
import re
import time
from typing import Any, Dict, List, Optional
import httpx
from openai import AsyncOpenAI
from tools import ToolRegistry, create_default_registry

HERMES_SYSTEM_PROMPT = """You are "Fox", an autonomous AI assistant powered by the Hermes Agent architecture.
You possess strong reasoning, planning, and multi-step tool execution capabilities.

# GUIDELINES:
1. Wrap your internal reasoning and step-by-step logic in <thought>...</thought> tags.
2. If you need to perform an action or retrieve data, call tools using structured XML tags:
<tool_call>
{"name": "tool_name", "arguments": {"arg_key": "arg_value"}}
</tool_call>
3. When you receive tool observations, synthesize them into a concise, polite, and directly helpful spoken answer.
"""

def format_tools_system_prompt(registry: ToolRegistry) -> str:
    tools_json = json.dumps(registry.get_definitions(), indent=2)
    return f"""
# AVAILABLE TOOLS:
<tools>
{tools_json}
</tools>
"""

class HermesAgent:
    def __init__(
        self,
        model: Optional[str] = None,
        registry: Optional[ToolRegistry] = None,
        max_iterations: int = 5,
        temperature: float = 0.3,
    ):
        self.registry = registry or create_default_registry()
        self.max_iterations = max_iterations
        self.temperature = temperature
        
        # Load API keys
        self.openai_key = os.getenv("OPEN_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        
        self.model = model or ("gpt-5-nano" if self.openai_key else "gemini-2.5-flash")
        self.openai_client = AsyncOpenAI(api_key=self.openai_key) if self.openai_key else None

    def _parse_output(self, text: str) -> Dict[str, Any]:
        thought = ""
        thought_match = re.search(r"<thought>([\s\S]*?)</thought>", text, re.IGNORECASE)
        if thought_match:
            thought = thought_match.group(1).strip()

        tool_calls = []
        for match in re.finditer(r"<tool_call>([\s\S]*?)</tool_call>", text, re.IGNORECASE):
            raw_json = match.group(1).strip()
            try:
                data = json.loads(raw_json)
                if isinstance(data, dict) and "name" in data:
                    tool_calls.append({
                        "id": f"call_{int(time.time()*1000)}_{len(tool_calls)}",
                        "name": data["name"],
                        "arguments": data.get("arguments", {})
                    })
            except Exception as e:
                print(f"[Hermes Parser] JSON parse error: {e}")

        clean_text = re.sub(r"<thought>[\s\S]*?</thought>", "", text, flags=re.IGNORECASE)
        clean_text = re.sub(r"<tool_call>[\s\S]*?</tool_call>", "", clean_text, flags=re.IGNORECASE).strip()

        return {
            "thought": thought,
            "tool_calls": tool_calls,
            "clean_text": clean_text
        }

    async def _call_llm(self, messages: List[Dict[str, str]]) -> str:
        if self.openai_client:
            is_nano_or_reasoning = "nano" in self.model or self.model.startswith("o1") or self.model.startswith("o3")
            params: Dict[str, Any] = {
                "model": self.model if ("gpt" in self.model or self.model.startswith("o")) else "gpt-4o-mini",
                "messages": [
                    {"role": "user" if m["role"] == "tool" else m["role"], "content": m["content"]}
                    for m in messages
                ]
            }
            if not is_nano_or_reasoning:
                params["temperature"] = self.temperature

            response = await self.openai_client.chat.completions.create(**params)
            return response.choices[0].message.content or ""

        # Fallback to Gemini REST if only Gemini Key is present
        if self.gemini_key:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.gemini_key}"
            payload = {
                "contents": [
                    {"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]}
                    for m in messages if m["role"] != "system"
                ]
            }
            sys_msg = next((m["content"] for m in messages if m["role"] == "system"), None)
            if sys_msg:
                payload["systemInstruction"] = {"parts": [{"text": sys_msg}]}

            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        return candidates[0]["content"]["parts"][0]["text"]

        raise RuntimeError("No LLM credentials configured (neither OPENAI_API_KEY nor GEMINI_API_KEY found).")

    async def run(self, prompt: str, history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        start_time = time.time()
        history = history or []
        steps = []
        all_tools_executed = []

        full_system = HERMES_SYSTEM_PROMPT + "\n" + format_tools_system_prompt(self.registry)
        messages: List[Dict[str, str]] = [{"role": "system", "content": full_system}]
        messages.extend(history)
        messages.append({"role": "user", "content": prompt})

        primary_thought = ""
        final_answer = ""

        for iteration in range(1, self.max_iterations + 1):
            raw_output = await self._call_llm(messages)
            parsed = self._parse_output(raw_output)

            if parsed["thought"] and not primary_thought:
                primary_thought = parsed["thought"]

            step_record = {
                "step": iteration,
                "thought": parsed["thought"],
                "toolCalls": parsed["tool_calls"],
                "rawOutput": raw_output
            }

            # If no tool calls, synthesis is complete
            if not parsed["tool_calls"]:
                final_answer = parsed["clean_text"] or raw_output
                steps.append(step_record)
                break

            # Execute tool calls
            observations = []
            for call in parsed["tool_calls"]:
                all_tools_executed.append(call)
                try:
                    res = await self.registry.execute(call["name"], call["arguments"])
                    observations.append({
                        "toolCallId": call["id"],
                        "name": call["name"],
                        "result": res
                    })
                except Exception as e:
                    observations.append({
                        "toolCallId": call["id"],
                        "name": call["name"],
                        "error": str(e)
                    })

            step_record["observations"] = observations
            steps.append(step_record)

            formatted_observations = []
            for obs in observations:
                output_payload = obs.get("result") if obs.get("result") is not None else {"error": obs.get("error")}
                payload_json = json.dumps(output_payload)
                formatted_observations.append(f'<tool_response>\n{{"name": "{obs["name"]}", "output": {payload_json}}}\n</tool_response>')
            obs_str = "\n\n".join(formatted_observations)
            messages.append({
                "role": "user",
                "content": f"Observation from tool execution:\n{obs_str}\n\nPlease analyze observations and proceed to answer the user."
            })

        if not final_answer:
            final_answer = steps[-1].get("rawOutput") if steps else "Execution finished."

        return {
            "success": True,
            "text": final_answer,
            "thought": primary_thought,
            "steps": steps,
            "toolsExecuted": all_tools_executed,
            "durationMs": int((time.time() - start_time) * 1000)
        }
