from abc import ABC, abstractmethod
from typing import Any, Dict, List

class BaseAgent(ABC):
    @abstractmethod
    async def run(self, prompt: str, history: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        pass
