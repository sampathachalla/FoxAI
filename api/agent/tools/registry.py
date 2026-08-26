from typing import Any, Callable, Dict, List

class ToolRegistry:
    def __init__(self):
        self.tools: Dict[str, Dict[str, Any]] = {}
        self.handlers: Dict[str, Callable] = {}

    def register(self, name: str, description: str, parameters: Dict[str, Any], handler: Callable):
        self.tools[name] = {
            "name": name,
            "description": description,
            "parameters": parameters,
        }
        self.handlers[name] = handler

    def get_definitions(self) -> List[Dict[str, Any]]:
        return [
            {
                "type": "function",
                "function": tool
            }
            for tool in self.tools.values()
        ]

    async def execute(self, name: str, arguments: Dict[str, Any]) -> Any:
        if name not in self.handlers:
            raise ValueError(f"Tool '{name}' is not registered.")
        handler = self.handlers[name]
        res = handler(**arguments)
        if hasattr(res, "__await__"):
            return await res
        return res
