from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
from core.dependencies import get_current_user
from domain.models.user import User
from services.innovation_independent_service import innovation_independent
from pydantic import BaseModel

router = APIRouter(prefix="/innovation-ia", tags=["Innovation IA - Independente"])


class InnovationRequest(BaseModel):
    message: str
    category: Optional[str] = "geral"
    context: Optional[Dict[str, Any]] = None


@router.post("/chat")
async def chat_innovation(
    data: InnovationRequest, current_user: User = Depends(get_current_user)
):
    """
    Endpoint da Innovation IA Independente.
    Ela orquestra NVIDIA, Gemini e Claude para responder.
    """
    answer = await innovation_independent.pensar_e_responder(
        data.message, data.category
    )

    return {
        "agent": "Innovation IA v2 (Independente)",
        "status": "Aprendendo e Evoluindo",
        "answer": answer,
    }


@router.post("/analise-contabil")
async def analyze_accounting(
    payload: Dict[str, Any], current_user: User = Depends(get_current_user)
):
    """
    Análise especializada em contabilidade e folha.
    """
    answer = await innovation_ai.analisar_folha(payload)
    return {"analysis": answer}


@router.post("/suporte-legislativo")
async def rh_support(
    payload: Dict[str, Any], current_user: User = Depends(get_current_user)
):
    """
    Suporte em legislação trabalhista.
    """
    situacao = payload.get("situacao", "")
    answer = await innovation_ai.suporte_rh(situacao)
    return {"guidance": answer}
