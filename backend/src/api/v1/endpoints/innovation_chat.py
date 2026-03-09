import os
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_nvidia_ai_endpoints import ChatNVIDIA

from infrastructure.database.sql.session import get_db
from api.dependencies import get_current_user
from domain.models.user import User

router = APIRouter(prefix="/innovation-chat", tags=["InnovationIA Chat"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    question: str
    history: Optional[List[ChatMessage]] = []

@router.post("")
async def innovation_chat_endpoint(
    data: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint for InnovationIA using ChatNVIDIA from LangChain.
    """
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500, detail="NVIDIA_API_KEY environment variable is missing"
        )
    
    # Initialize the ChatNVIDIA model (using Nemotron-3-nano or a similar model)
    try:
        # We can configure the exact model from the NVIDIA catalog payload, 
        # using Nemotron-3-nano as suggested by the LangChain integration docs, or default.
        llm = ChatNVIDIA(model="nvidia/nemotron-3-nano-30b-a3b")
        
        # Format the message history into LangChain message objects
        lc_messages = [
            SystemMessage(content=(
                "You are InnovationIA, an intelligent management agent for the Innovation.ia ecosystem. "
                "You assist the user with HR, Finance, and Operations questions in Portuguese. "
                "Always be helpful, concise, and proactive."
            ))
        ]
        
        for msg in data.history:
            if msg.role == "user":
                lc_messages.append(HumanMessage(content=msg.content))
            else:
                lc_messages.append(AIMessage(content=msg.content))
        
        # Append the current question
        lc_messages.append(HumanMessage(content=data.question))
        
        response = llm.invoke(lc_messages)
        
        return {"answer": response.content}
        
    except Exception as e:
        # Logging would be ideal here
        raise HTTPException(status_code=500, detail=str(e))
