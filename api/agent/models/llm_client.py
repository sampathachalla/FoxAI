from typing import Any, Dict, List, Optional
import httpx
from openai import AsyncOpenAI
from config.settings import settings

class LLMClient:
    def __init__(self, model: Optional[str] = None, temperature: Optional[float] = None):
        self.model = model or settings.DEFAULT_MODEL
        self.temperature = temperature if temperature is not None else settings.TEMPERATURE
        self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
        self.gemini_key = settings.GEMINI_API_KEY

    async def generate(self, messages: List[Dict[str, str]]) -> str:
        if self.openai_client:
            target_model = self.model if ("gpt" in self.model or self.model.startswith("o")) else "gpt-4o-mini"
            is_nano_or_reasoning = "nano" in target_model or target_model.startswith("o1") or target_model.startswith("o3")
            params: Dict[str, Any] = {
                "model": target_model,
                "messages": [
                    {"role": "user" if m["role"] == "tool" else m["role"], "content": m["content"]}
                    for m in messages
                ]
            }
            if not is_nano_or_reasoning:
                params["temperature"] = self.temperature

            response = await self.openai_client.chat.completions.create(**params)
            return response.choices[0].message.content or ""

        if self.gemini_key:
            target_model = self.model if "gemini" in self.model else "gemini-2.5-flash"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{target_model}:generateContent?key={self.gemini_key}"
            payload = {
                "contents": [
                    {"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]}
                    for m in messages if m["role"] != "system"
                ]
            }
            sys_msg = next((m["content"] for m in messages if m["role"] == "system"), None)
            if sys_msg:
                payload["systemInstruction"] = {"parts": [{"text": sys_msg}]}

            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        return candidates[0]["content"]["parts"][0]["text"]

        raise RuntimeError("No LLM credentials configured in environment.")
