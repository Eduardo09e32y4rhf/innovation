from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.security import create_temporary_token, verify_temporary_token
from app.db.dependencies import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, Token, UserOut
from app.services.auth_service import authenticate_user, register_user
from app.services.two_factor_service import request_code, verify_code

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/auth", tags=["Auth"])



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
