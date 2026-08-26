import datetime
from typing import Any, Dict, List

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

NOTE_TOOL_SCHEMA = {
    "name": "create_note",
    "description": "Creates and saves a quick note with content and tags.",
    "parameters": {
        "type": "object",
        "properties": {
            "title": {"type": "string", "description": "Title of the note."},
            "content": {"type": "string", "description": "Body content of the note."},
            "tags": {"type": "array", "items": {"type": "string"}, "description": "Categorizing tags."}
        },
        "required": ["title", "content"]
    }
}
