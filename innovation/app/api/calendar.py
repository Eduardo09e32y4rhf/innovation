"""
API para integração com Google Calendar
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import json

from app.db.database import get_db
from app.models.user import User
from app.api.auth import get_current_user
from app.services.calendar import calendar_service

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.get("/auth")
async def initiate_oauth(current_user: User = Depends(get_current_user)):
    """
    Inicia fluxo OAuth 2.0 para Google Calendar
    Redireciona usuário para página de autorização do Google
    """
    try:
        authorization_url = calendar_service.get_authorization_url()
        return {"authorization_url": authorization_url}
    except ValueError as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.get("/callback")
async def oauth_callback(
    code: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Callback do OAuth - recebe código de autorização e troca por token
    """
    try:
        # Trocar código por token
        token_data = calendar_service.exchange_code_for_token(code)
        
        # TODO: Salvar token no banco de dados do usuário
        # Por enquanto, retorna sucesso
        
        # Redirecionar para página de configurações
        return RedirectResponse(url="/configuracoes?calendar=connected")
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar callback: {str(e)}"
        )


@router.get("/status")
async def get_calendar_status(current_user: User = Depends(get_current_user)):
    """Verifica se Google Calendar está conectado"""
    # TODO: Verificar se usuário tem token salvo
    is_connected = hasattr(current_user, 'google_calendar_token') and current_user.google_calendar_token is not None
    
    return {
        "connected": is_connected,
        "email": current_user.email if is_connected else None
    }


@router.post("/disconnect")
async def disconnect_calendar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Desconecta Google Calendar"""
    # TODO: Remover token do banco de dados
    return {"message": "Google Calendar desconectado com sucesso"}


@router.get("/events")
async def list_events(
    max_results: int = 10,
    current_user: User = Depends(get_current_user)
):
    """Lista próximos eventos do calendário"""
    # TODO: Buscar token do usuário e listar eventos
    return {"events": []}
