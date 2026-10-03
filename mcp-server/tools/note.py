import datetime
from typing import Any, Dict, List, Optional


def create_note(title: str, content: str, tags: Optional[List[str]] = None) -> Dict[str, Any]:
    """Creates and saves a quick note with content and tags.

    Args:
        title: Title of the note.
        content: Body content of the note.
        tags: Categorizing tags.
    """
    tags = tags or []
    return {
        "status": "created",
        "note": {
            "id": f"note_{int(datetime.datetime.now().timestamp() * 1000)}",
            "title": title,
            "content": content,
            "tags": tags,
            "createdAt": datetime.datetime.now(datetime.UTC).isoformat()
        },
        "message": f"Note '{title}' saved successfully."
    }
