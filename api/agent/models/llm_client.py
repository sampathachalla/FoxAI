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

    async def generate_with_usage(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
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
            content = response.choices[0].message.content or ""
            usage = response.usage
            in_tok = usage.prompt_tokens if usage else sum(len(m.get("content", "").split()) * 4 // 3 for m in messages)
            out_tok = usage.completion_tokens if usage else len(content.split()) * 4 // 3

            return {
                "text": content,
                "inputTokens": in_tok,
                "outputTokens": out_tok,
                "totalTokens": in_tok + out_tok,
                "model": target_model
            }

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
                    content = candidates[0]["content"]["parts"][0]["text"] if candidates else ""
                    usage_meta = data.get("usageMetadata", {})
                    in_tok = usage_meta.get("promptTokenCount", sum(len(m.get("content", "").split()) * 4 // 3 for m in messages))
                    out_tok = usage_meta.get("candidatesTokenCount", len(content.split()) * 4 // 3)

                    return {
                        "text": content,
                        "inputTokens": in_tok,
                        "outputTokens": out_tok,
                        "totalTokens": in_tok + out_tok,
                        "model": target_model
                    }

        raise RuntimeError("No LLM credentials configured in environment.")

    async def generate(self, messages: List[Dict[str, str]]) -> str:
        res = await self.generate_with_usage(messages)
        return res["text"]
