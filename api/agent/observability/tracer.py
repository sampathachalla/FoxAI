import datetime
import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

class AgentTracer:
    def __init__(self, log_to_file: bool = True):
        self.log_to_file = log_to_file
        self.start_time: float = 0
        self.events: List[Dict[str, Any]] = []
        self.log_dir = Path(__file__).resolve().parent.parent / "logs"
        self.log_dir.mkdir(exist_ok=True)

    def start_trace(self, prompt: str) -> None:
        self.start_time = time.time()
        self.events = [{
            "type": "start",
            "prompt": prompt,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }]

    def log_step(self, step: int, thought: str, tool_calls: List[Any], observations: List[Any]) -> None:
        self.events.append({
            "type": "step",
            "step": step,
            "thought": thought,
            "tool_calls": tool_calls,
            "observations": observations,
            "elapsedMs": int((time.time() - self.start_time) * 1000)
        })

    def end_trace(self, final_text: str, success: bool = True) -> Dict[str, Any]:
        duration_ms = int((time.time() - self.start_time) * 1000)
        trace_summary = {
            "type": "complete",
            "success": success,
            "durationMs": duration_ms,
            "events": self.events,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }

        if self.log_to_file:
            try:
                log_file = self.log_dir / "agent_traces.jsonl"
                with open(log_file, "a", encoding="utf-8") as f:
                    f.write(json.dumps(trace_summary) + "\n")
            except Exception as e:
                print(f"[AgentTracer] Warning: could not write trace log: {e}")

        return trace_summary
