import random
from typing import Any, Dict

def get_weather(location: str) -> Dict[str, Any]:
    conditions = ["Sunny and clear", "Partly cloudy with gentle breeze", "Light rain showers", "Pleasantly mild"]
    condition = random.choice(conditions)
    temp_f = random.randint(65, 80)
    temp_c = round((temp_f - 32) * 5 / 9)
    return {
        "location": location,
        "temperature": {"fahrenheit": f"{temp_f}°F", "celsius": f"{temp_c}°C"},
        "condition": condition,
        "humidity": "48%",
        "wind": "8 mph NW",
        "summary": f"Current weather in {location} is {condition} at {temp_f}°F ({temp_c}°C)."
    }

WEATHER_TOOL_SCHEMA = {
    "name": "get_weather",
    "description": "Retrieves current weather conditions, temperature, humidity, and forecast for a given location.",
    "parameters": {
        "type": "object",
        "properties": {
            "location": {"type": "string", "description": "City and state or country (e.g. 'San Francisco, CA')."}
        },
        "required": ["location"]
    }
}
