import datetime
from typing import Any, Dict

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

SYSTEM_TOOL_SCHEMA = {
    "name": "get_system_status",
    "description": "Inspects assistant operating environment, timestamp, and model availability.",
    "parameters": {"type": "object", "properties": {}}
}
