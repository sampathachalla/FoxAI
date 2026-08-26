from typing import Any, Dict

def control_device(setting: str, state: bool) -> Dict[str, Any]:
    return {
        "status": "applied",
        "setting": setting,
        "state": state,
        "message": f"Device setting '{setting}' set to {'ON' if state else 'OFF'}."
    }

DEVICE_TOOL_SCHEMA = {
    "name": "control_device",
    "description": "Controls hardware and UI environment toggles (ambientGlow, doNotDisturb, bluetooth, volume).",
    "parameters": {
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
    }
}
