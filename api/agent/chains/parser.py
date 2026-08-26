import json
import re
import time
from typing import Any, Dict, List
from models.schemas import ToolCall

class HermesParser:
    @staticmethod
    def parse_output(text: str) -> Dict[str, Any]:
        thought = ""
        thought_match = re.search(r"<thought>([\s\S]*?)</thought>", text, re.IGNORECASE)
        if thought_match:
            thought = thought_match.group(1).strip()

        tool_calls: List[ToolCall] = []
        for match in re.finditer(r"<tool_call>([\s\S]*?)</tool_call>", text, re.IGNORECASE):
            raw_json = match.group(1).strip()
            try:
                data = json.loads(raw_json)
                if isinstance(data, dict) and "name" in data:
                    tool_calls.append(ToolCall(
                        id=f"call_{int(time.time()*1000)}_{len(tool_calls)}",
                        name=data["name"],
                        arguments=data.get("arguments", {})
                    ))
            except Exception as e:
                print(f"[HermesParser] JSON parse warning: {e}")

        clean_text = re.sub(r"<thought>[\s\S]*?</thought>", "", text, flags=re.IGNORECASE)
        clean_text = re.sub(r"<tool_call>[\s\S]*?</tool_call>", "", clean_text, flags=re.IGNORECASE).strip()

        return {
            "thought": thought,
            "tool_calls": tool_calls,
            "clean_text": clean_text
        }
