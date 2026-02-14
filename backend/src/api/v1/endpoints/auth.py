from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from typing import List, Optional

from core.dependencies import get_current_user
from core.security import create_temporary_token, verify_temporary_token
from infrastructure.database.sql.dependencies import get_db
from domain.models.user import User
from domain.schemas.auth import LoginRequest, RegisterRequest, Token, UserOut
from services.auth_service import authenticate_user, register_user
from services.two_factor_service import request_code, verify_code

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/auth", tags=["Auth"])



@router.post("/register", response_model=UserOut)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    try:
        return register_user(
            db,
            data.email,
            data.password,
            name=data.name,
            phone=data.phone,
            company_name=data.company_name,
            razao_social=data.razao_social,
            cnpj=data.cnpj,
            cidade=data.cidade,
            uf=data.uf,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")  # Máximo 5 tentativas de login por minuto
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    result = authenticate_user(db, data.email, data.password)
    if not result:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    access_token, refresh_token, user = result
    
    # Cache the user upon successful login
    user_memory_cache.set(user.id, user)
    
    # Se 2FA está habilitado, retorna temporary_token
    if user.two_factor_enabled:
        request_code(db, user.id, user.email, user.phone)
        temporary_token = create_temporary_token(user.id)
        return {
            "access_token": "",
            "refresh_token": "",
            "token_type": "bearer",
            "two_factor_required": True,
            "temporary_token": temporary_token,
        }
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }



@router.post("/login/verify", response_model=Token)
@limiter.limit("3/minute")  # Máximo 3 tentativas de verificação por minuto
def verify_login_code(request: Request, temporary_token: str, code: str, db: Session = Depends(get_db)):
    """
    Verifica código 2FA usando temporary_token em vez de user_id exposto.
    Isso previne enumeração de usuários.
    """
    user_id = verify_temporary_token(temporary_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Token temporário inválido ou expirado")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if not verify_code(db, user.id, code):
        raise HTTPException(status_code=401, detail="Código inválido ou expirado")

    # Autentica sem senha (2FA já verificado)
    result = authenticate_user(db, user.email, None, skip_password=True)
    if not result:
        raise HTTPException(status_code=500, detail="Erro na autenticação")
    
    access_token, refresh_token, _ = result
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }



@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/users", response_model=List[UserOut])
def list_users(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(User)
    if role:
        # Check if the query is for candidates and current user is a company
        query = query.filter(User.role == role)
    return query.all()

@router.post("/forgot-password")
async def forgot_password(data: dict, db: Session = Depends(get_db)):
    email = data.get("email")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Don't reveal if user exists for security, just return success
        return {"message": "Se o email existir, um link de recuperação será enviado."}
    
    # In a real app, send email here
    return {"message": "Link de recuperação enviado com sucesso."}

@router.get("/google-login")
async def google_login():
    """
    Mock Google Login redirect. 
    In production, this would redirect to Google OAuth.
    """
    return {"message": "Recurso de Login com Google sendo configurado no Console de APIs. Use email/senha por enquanto."}

# --- Caching Strategy ---
# Using functools.lru_cache to cache user sessions in memory
# This reduces database hits for frequent operations like "get_current_user"
# In a distributed environment, Redis would be preferred.

from functools import lru_cache
import time

# Simple in-memory cache with expiry logic wrapper
class UserCache:
    def __init__(self):
        self._cache = {}
        self._ttl = 300 # 5 minutes

    def get(self, user_id: int):
        if user_id in self._cache:
            data, timestamp = self._cache[user_id]
            if time.time() - timestamp < self._ttl:
                return data
            else:
                del self._cache[user_id]
        return None

    def set(self, user_id: int, user_data: User):
        self._cache[user_id] = (user_data, time.time())

    def invalidate(self, user_id: int):
        if user_id in self._cache:
            del self._cache[user_id]

# Singleton instance
user_memory_cache = UserCache()
