import datetime
from typing import Any, Dict, Literal


def create_reminder(
    title: str,
    dueTime: str = "Today",
    priority: Literal["low", "medium", "high"] = "medium",
) -> Dict[str, Any]:
    """Creates a scheduled reminder with a title, optional due time, and priority level.

    Args:
        title: The task title or reminder content.
        dueTime: Due time or date (e.g. 'Tomorrow at 9 AM', 'in 2 hours').
        priority: Priority level.
    """
    return {
        "status": "created",
        "reminder": {
            "id": f"rem_{int(datetime.datetime.now().timestamp() * 1000)}",
            "title": title,
            "dueTime": dueTime,
            "priority": priority,
            "completed": False,
            "createdAt": datetime.datetime.now(datetime.UTC).isoformat()
        },
        "message": f"Reminder '{title}' created successfully for {dueTime}."
    }
