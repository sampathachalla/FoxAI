from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class ToolCall(BaseModel):
    id: str
    name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)

class ToolObservation(BaseModel):
    toolCallId: str
    name: str
    result: Optional[Any] = None
    error: Optional[str] = None

class StepTrace(BaseModel):
    step: int
    thought: Optional[str] = ""
    toolCalls: List[ToolCall] = Field(default_factory=list)
    observations: List[ToolObservation] = Field(default_factory=list)
    rawOutput: Optional[str] = ""

class AgentRunRequest(BaseModel):
    prompt: str
    history: Optional[List[Dict[str, Any]]] = None
    model: Optional[str] = None
    temperature: Optional[float] = 0.3
    max_iterations: Optional[int] = 5

class AgentRunResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
