from .calculator import calculate
from .device import control_device
from .note import create_note
from .reminder import create_reminder
from .system import get_system_status

# Every function here is exposed as an MCP tool by main.py. The MCP SDK
# builds each tool's input schema from its type hints and docstring.
TOOLS = [
    create_reminder,
    create_note,
    control_device,
    calculate,
    get_system_status,
]

__all__ = [
    "TOOLS",
    "calculate",
    "control_device",
    "create_note",
    "create_reminder",
    "get_system_status",
]
