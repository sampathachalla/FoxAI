from .registry import ToolRegistry
from .reminder import create_reminder, REMINDER_TOOL_SCHEMA
from .note import create_note, NOTE_TOOL_SCHEMA
from .weather import get_weather, WEATHER_TOOL_SCHEMA
from .device import control_device, DEVICE_TOOL_SCHEMA
from .calculator import calculate, CALCULATOR_TOOL_SCHEMA
from .search import web_search, SEARCH_TOOL_SCHEMA
from .system import get_system_status, SYSTEM_TOOL_SCHEMA

def create_default_registry() -> ToolRegistry:
    registry = ToolRegistry()
    registry.register(REMINDER_TOOL_SCHEMA["name"], REMINDER_TOOL_SCHEMA["description"], REMINDER_TOOL_SCHEMA["parameters"], create_reminder)
    registry.register(NOTE_TOOL_SCHEMA["name"], NOTE_TOOL_SCHEMA["description"], NOTE_TOOL_SCHEMA["parameters"], create_note)
    registry.register(WEATHER_TOOL_SCHEMA["name"], WEATHER_TOOL_SCHEMA["description"], WEATHER_TOOL_SCHEMA["parameters"], get_weather)
    registry.register(DEVICE_TOOL_SCHEMA["name"], DEVICE_TOOL_SCHEMA["description"], DEVICE_TOOL_SCHEMA["parameters"], control_device)
    registry.register(CALCULATOR_TOOL_SCHEMA["name"], CALCULATOR_TOOL_SCHEMA["description"], CALCULATOR_TOOL_SCHEMA["parameters"], calculate)
    registry.register(SEARCH_TOOL_SCHEMA["name"], SEARCH_TOOL_SCHEMA["description"], SEARCH_TOOL_SCHEMA["parameters"], web_search)
    registry.register(SYSTEM_TOOL_SCHEMA["name"], SYSTEM_TOOL_SCHEMA["description"], SYSTEM_TOOL_SCHEMA["parameters"], get_system_status)
    return registry

__all__ = [
    "ToolRegistry",
    "create_default_registry",
    "create_reminder",
    "create_note",
    "get_weather",
    "control_device",
    "calculate",
    "web_search",
    "get_system_status",
]
