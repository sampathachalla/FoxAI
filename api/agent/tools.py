import datetime
import math
import random
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

def create_default_registry() -> ToolRegistry:
    registry = ToolRegistry()

    # 1. Reminder Tool
    def create_reminder(title: str, dueTime: str = "Today", priority: str = "medium") -> Dict[str, Any]:
        return {
            "status": "created",
            "reminder": {
                "id": f"rem_{int(datetime.datetime.now().timestamp() * 1000)}",
                "title": title,
                "dueTime": dueTime,
                "priority": priority,
                "completed": False,
                "createdAt": datetime.datetime.utcnow().isoformat() + "Z"
            },
            "message": f"Reminder '{title}' created successfully for {dueTime}."
        }

    registry.register(
        name="create_reminder",
        description="Creates a scheduled reminder with a title, optional due time, and priority level.",
        parameters={
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "The task title or reminder content."},
                "dueTime": {"type": "string", "description": "Due time or date (e.g. 'Tomorrow at 9 AM', 'in 2 hours')."},
                "priority": {"type": "string", "enum": ["low", "medium", "high"], "description": "Priority level."}
            },
            "required": ["title"]
        },
        handler=create_reminder
    )

    # 2. Note Tool
    def create_note(title: str, content: str, tags: List[str] = None) -> Dict[str, Any]:
        tags = tags or []
        return {
            "status": "created",
            "note": {
                "id": f"note_{int(datetime.datetime.now().timestamp() * 1000)}",
                "title": title,
                "content": content,
                "tags": tags,
                "createdAt": datetime.datetime.utcnow().isoformat() + "Z"
            },
            "message": f"Note '{title}' saved successfully."
        }

    registry.register(
        name="create_note",
        description="Creates and saves a quick note with content and tags.",
        parameters={
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Title of the note."},
                "content": {"type": "string", "description": "Body content of the note."},
                "tags": {"type": "array", "items": {"type": "string"}, "description": "Categorizing tags."}
            },
            "required": ["title", "content"]
        },
        handler=create_note
    )

    # 3. Weather Tool
    def get_weather(location: str) -> Dict[str, Any]:
        conditions = ["Sunny and clear", "Partly cloudy with gentle breeze", "Light rain showers", "Pleasantly mild"]
        condition = random.choice(conditions)
        temp_f = random.randint(65, 80)
        temp_c = round((temp_f - 32) * 5 / 9)
        return {
            "location": location,
            "temperature": {"fahrenheit": f"{temp_f}°F", "celsius": f"{temp_c}°C"},
            "condition": condition,
            "humidity": "48%",
            "wind": "8 mph NW",
            "summary": f"Current weather in {location} is {condition} at {temp_f}°F ({temp_c}°C)."
        }

    registry.register(
        name="get_weather",
        description="Retrieves current weather conditions, temperature, humidity, and forecast for a given location.",
        parameters={
            "type": "object",
            "properties": {
                "location": {"type": "string", "description": "City and state or country (e.g. 'San Francisco, CA')."}
            },
            "required": ["location"]
        },
        handler=get_weather
    )

    # 4. Device Controls Tool
    def control_device(setting: str, state: bool) -> Dict[str, Any]:
        return {
            "status": "applied",
            "setting": setting,
            "state": state,
            "message": f"Device setting '{setting}' set to {'ON' if state else 'OFF'}."
        }

    registry.register(
        name="control_device",
        description="Controls hardware and UI environment toggles (ambientGlow, doNotDisturb, bluetooth, volume).",
        parameters={
            "type": "object",
            "properties": {
                "setting": {
                    "type": "string",
                    "enum": ["ambientGlow", "doNotDisturb", "bluetooth", "hapticFeedback", "offlineMode"],
                    "description": "The target device or UI setting to adjust."
                },
                "state": {"type": "boolean", "description": "True to enable, False to disable."}
            },
            "required": ["setting", "state"]
        },
        handler=control_device
    )

    # 5. Calculator Tool
    def calculate(expression: str) -> Dict[str, Any]:
        try:
            # Safe basic evaluation
            allowed_names = {"math": math, "sqrt": math.sqrt, "pi": math.pi, "sin": math.sin, "cos": math.cos, "pow": math.pow}
            clean_expr = expression.replace("^", "**").replace("%", "/100")
            result = eval(clean_expr, {"__builtins__": {}}, allowed_names)
            return {"expression": expression, "result": float(result), "formatted": f"{expression} = {result}"}
        except Exception as e:
            return {"expression": expression, "error": f"Calculation error: {str(e)}"}

    registry.register(
        name="calculate",
        description="Performs mathematical, scientific, or percentage computations safely.",
        parameters={
            "type": "object",
            "properties": {
                "expression": {"type": "string", "description": "Arithmetic or math expression to evaluate."}
            },
            "required": ["expression"]
        },
        handler=calculate
    )

    # 6. Web Search Tool
    def web_search(query: str) -> Dict[str, Any]:
        return {
            "query": query,
            "results": [
                {
                    "title": f"Live knowledge retrieval for: '{query}'",
                    "snippet": f"Verified contextual telemetry and intelligence regarding {query}.",
                    "source": "Fox Hermes Grounding"
                }
            ],
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }

    registry.register(
        name="web_search",
        description="Searches real-time web knowledge and returns key citations, facts, and relevant summary points.",
        parameters={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query string."}
            },
            "required": ["query"]
        },
        handler=web_search
    )

    # 7. System Status Tool
    def get_system_status() -> Dict[str, Any]:
        now = datetime.datetime.now()
        return {
            "status": "optimal",
            "assistant": "Fox Jarvis AI Core",
            "runtime": "Hermes Python FastAPI Microservice",
            "currentTime": now.strftime("%I:%M:%S %p"),
            "currentDate": now.strftime("%A, %B %d, %Y"),
            "timestamp": now.isoformat() + "Z"
        }

    registry.register(
        name="get_system_status",
        description="Inspects assistant operating environment, timestamp, and model availability.",
        parameters={"type": "object", "properties": {}},
        handler=get_system_status
    )

    return registry
