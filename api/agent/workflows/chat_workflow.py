from typing import Any, Dict, List, Optional
from agents.hermes_agent import HermesAgent

class ChatWorkflow:
    def __init__(self, agent: Optional[HermesAgent] = None):
        self.agent = agent or HermesAgent()

    async def execute(self, prompt: str, history: Optional[List[Dict[str, Any]]] = None, **kwargs) -> Dict[str, Any]:
        return await self.agent.run(prompt, history)
