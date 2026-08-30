"""Adapter between the realtime voice runtime and FoxAI's Hermes agent.

Keeping this boundary small lets Hermes evolve independently from LiveKit,
STT, VAD, and TTS concerns.
"""

from typing import Any, Dict, List, Optional

from workflows.voice_workflow import VoiceWorkflow


class HermesVoiceAdapter:
    def __init__(self, workflow: Optional[VoiceWorkflow] = None):
        self.workflow = workflow or VoiceWorkflow()

    async def respond(
        self,
        transcript: str,
        history: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        result = await self.workflow.execute(transcript, history)
        text = result.get("text", "") if isinstance(result, dict) else str(result)
        return text.strip()
