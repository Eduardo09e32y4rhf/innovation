from fastapi import APIRouter, Depends, HTTPException
from core.dependencies import get_current_user
from domain.models.user import User
from core.ai_key_manager import ai_key_manager
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/ai-admin", tags=["ai-admin"])

class KeyCreateRequest(BaseModel):
    key: str

class KeyResponse(BaseModel):
    key: str
    id: str
    type: str
    status: str

@router.get("/keys", response_model=List[KeyResponse])
async def list_keys(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return ai_key_manager.get_keys_info()

@router.post("/keys")
async def add_key(data: KeyCreateRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    
    success = ai_key_manager.add_key(data.key)
    if not success:
        raise HTTPException(status_code=400, detail="Chave já existe ou é inválida")
    
    return {"message": "Chave adicionada com sucesso"}

@router.delete("/keys/{key_id}")
async def remove_key(key_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    
    # Nota: No nosso manager, o key_id é a própria chave (embora na UI mostremos mascarada)
    # Em uma implementação real, poderíamos usar um ID numérico ou hash.
    success = ai_key_manager.remove_key(key_id)
    if not success:
        # Tenta marcar como exausta se for estática
        ai_key_manager.mark_as_exhausted(key_id)
        return {"message": "Chave estática marcada como exausta (não pode ser removida do .env)"}
    
    return {"message": "Chave dinâmica removida com sucesso"}

@router.post("/keys/reset")
async def reset_keys(current_user: User = Depends(get_current_user)):
    """Limpa o status de exaustas para todas as chaves."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    
    ai_key_manager.exhausted_keys = set()
    ai_key_manager._save_status()
    return {"message": "Status de todas as chaves resetado para ATIVO"}
