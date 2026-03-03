from pydantic import BaseModel
from typing import Optional, List


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str
    context: Optional[str] = None
    model: Optional[str] = "gemini-2.0-flash"
    history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    answer: str
    model_used: str
    error: bool = False


class LandingPlanRequest(BaseModel):
    business_type: str
