from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Dict, Any
import json

from core.dependencies import get_db, require_company_role
from domain.models.user import User
from src.security.blackbox import blackbox, init_blackbox
from core.config import settings

router = APIRouter(prefix="/secure-data", tags=["BlackBox"])

@router.post("/{user_id}")
async def store_blackbox(
    user_id: int,
    data: UploadFile = File(...),
    current_company: int = Depends(require_company_role),
    db: Session = Depends(get_db)
):
    '''Armazena dados criptografados na BlackBox do usuário'''
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuário não encontrado")
    
    content = await data.read()
    try:
        decrypted_content = content.decode()
        encrypted = blackbox.encrypt(user_id, decrypted_content)
        user.encrypted_data = encrypted
        db.commit()
        return {"status": "encrypted", "size": len(encrypted)}
    except Exception as e:
        raise HTTPException(500, f"Criptografia falhou: {e}")

@router.get("/{user_id}")
async def get_blackbox(
    user_id: int,
    current_company: int = Depends(require_company_role),
    db: Session = Depends(get_db)
):
    '''Recupera dados descriptografados'''
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.encrypted_data:
        raise HTTPException(404, "BlackBox vazia")
    
    try:
        data = blackbox.decrypt(user_id, user.encrypted_data)
        return {"data": data}
    except Exception as e:
        raise HTTPException(400, f"Descriptografia falhou: {e}")

@router.delete("/{user_id}")
async def delete_blackbox(
    user_id: int,
    current_company: int = Depends(require_company_role),
    db: Session = Depends(get_db)
):
    '''Limpa BlackBox'''
    user = db.query(User).filter(User.id == user_id).update({"encrypted_data": None})
    db.commit()
    return {"status": "deleted"}

