import json
from typing import Any, Dict, List, Tuple
from models.llm_client import LLMClient
from models.schemas import StepTrace, ToolCall, ToolObservation
from tools.registry import ToolRegistry
from chains.parser import HermesParser
from observability.tracer import AgentTracer

class ReActChain:
    def __init__(self, llm: LLMClient, registry: ToolRegistry, tracer: AgentTracer, max_iterations: int = 5):
        self.llm = llm
        self.registry = registry
        self.tracer = tracer
        self.max_iterations = max_iterations

    async def execute(self, messages: List[Dict[str, str]]) -> Tuple[str, str, List[StepTrace], List[ToolCall]]:
        steps: List[StepTrace] = []
        all_tools_executed: List[ToolCall] = []
        primary_thought = ""
        final_answer = ""

        conversation = list(messages)

        for iteration in range(1, self.max_iterations + 1):
            raw_output = await self.llm.generate(conversation)
            parsed = HermesParser.parse_output(raw_output)

            if parsed["thought"] and not primary_thought:
                primary_thought = parsed["thought"]

            # If no tool calls, synthesis is complete
            if not parsed["tool_calls"]:
                final_answer = parsed["clean_text"] or raw_output
                step_trace = StepTrace(
                    step=iteration,
                    thought=parsed["thought"],
                    toolCalls=[],
                    observations=[],
                    rawOutput=raw_output
                )
                steps.append(step_trace)
                self.tracer.log_step(iteration, parsed["thought"], [], [])
                break

            # Execute tool calls
            observations: List[ToolObservation] = []
            for call in parsed["tool_calls"]:
                all_tools_executed.append(call)
                try:
                    res = await self.registry.execute(call.name, call.arguments)
                    observations.append(ToolObservation(
                        toolCallId=call.id,
                        name=call.name,
                        result=res
                    ))
                except Exception as e:
                    observations.append(ToolObservation(
                        toolCallId=call.id,
                        name=call.name,
                        error=str(e)
                    ))

            step_trace = StepTrace(
                step=iteration,
                thought=parsed["thought"],
                toolCalls=parsed["tool_calls"],
                observations=observations,
                rawOutput=raw_output
            )
            steps.append(step_trace)
            self.tracer.log_step(iteration, parsed["thought"], [c.dict() for c in parsed["tool_calls"]], [o.dict() for o in observations])

            conversation.append({"role": "assistant", "content": raw_output})
            formatted_observations = []
            for obs in observations:
                payload = obs.result if obs.result is not None else {"error": obs.error}
                formatted_observations.append(f'<tool_response>\n{{"name": "{obs.name}", "output": {json.dumps(payload)}}}\n</tool_response>')
            
            obs_str = "\n\n".join(formatted_observations)
            conversation.append({
                "role": "user",
                "content": f"Observation from tool execution:\n{obs_str}\n\nPlease analyze observations and proceed to answer the user."
            })

        if not final_answer:
            final_answer = steps[-1].rawOutput if steps else "Execution complete."

        return final_answer, primary_thought, steps, all_tools_executed
