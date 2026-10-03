import datetime
from typing import Any, Dict


def get_system_status() -> Dict[str, Any]:
    """Inspects assistant operating environment and the current date and time."""
    now = datetime.datetime.now()
    return {
        "status": "optimal",
        "assistant": "Fox Jarvis AI Core",
        "runtime": "Fox MCP server",
        "currentTime": now.strftime("%I:%M:%S %p"),
        "currentDate": now.strftime("%A, %B %d, %Y"),
        "timestamp": now.isoformat()
    }
