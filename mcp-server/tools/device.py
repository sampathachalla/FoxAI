from typing import Any, Dict, Literal

DeviceSetting = Literal["ambientGlow", "doNotDisturb", "bluetooth", "hapticFeedback", "offlineMode"]


def control_device(setting: DeviceSetting, state: bool) -> Dict[str, Any]:
    """Controls hardware and UI environment toggles (ambientGlow, doNotDisturb, bluetooth, volume).

    Args:
        setting: The target device or UI setting to adjust.
        state: True to enable, False to disable.
    """
    return {
        "status": "applied",
        "setting": setting,
        "state": state,
        "message": f"Device setting '{setting}' set to {'ON' if state else 'OFF'}."
    }
