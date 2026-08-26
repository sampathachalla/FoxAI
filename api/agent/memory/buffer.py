from typing import Any, Dict, List

class MemoryBuffer:
    def __init__(self, max_history: int = 20):
        self.max_history = max_history
        self.history: List[Dict[str, Any]] = []
        self.scratchpad: List[str] = []

    def add_message(self, role: str, content: str, **kwargs) -> None:
        msg = {"role": role, "content": content, **kwargs}
        self.history.append(msg)
        if len(self.history) > self.max_history:
            if self.history[0].get("role") == "system":
                self.history = [self.history[0]] + self.history[-(self.max_history - 1):]
            else:
                self.history = self.history[-self.max_history:]

    def get_messages(self) -> List[Dict[str, Any]]:
        return list(self.history)

    def set_messages(self, messages: List[Dict[str, Any]]) -> None:
        self.history = list(messages)

    def add_thought(self, thought: str) -> None:
        self.scratchpad.append(thought)

    def get_scratchpad(self) -> List[str]:
        return list(self.scratchpad)

    def clear(self) -> None:
        self.history = []
        self.scratchpad = []
