from typing import Any, Dict, List, Optional
from agents.hermes_agent import HermesAgent

class VoiceWorkflow:
    def __init__(self, agent: Optional[HermesAgent] = None):
        self.agent = agent or HermesAgent(
            system_prompt="You are Fox, an intelligent real-time voice AI assistant. Keep responses spoken, concise, and elegant."
        )

    async def execute(self, transcript: str, history: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        return await self.agent.run(transcript, history)
