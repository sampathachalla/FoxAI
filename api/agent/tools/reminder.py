import datetime
from typing import Any, Dict

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

REMINDER_TOOL_SCHEMA = {
    "name": "create_reminder",
    "description": "Creates a scheduled reminder with a title, optional due time, and priority level.",
    "parameters": {
        "type": "object",
        "properties": {
            "title": {"type": "string", "description": "The task title or reminder content."},
            "dueTime": {"type": "string", "description": "Due time or date (e.g. 'Tomorrow at 9 AM', 'in 2 hours')."},
            "priority": {"type": "string", "enum": ["low", "medium", "high"], "description": "Priority level."}
        },
        "required": ["title"]
    }
}
