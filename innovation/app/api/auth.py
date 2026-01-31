from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.dependencies import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, Token, UserOut
from app.services.auth_service import authenticate_user, register_user
from app.services.two_factor_service import request_code, verify_code

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
def login(data: LoginRequest, db: Session = Depends(get_db)):
    result = authenticate_user(db, data.email, data.password)
    if not result:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    access_token, user = result
    if user.two_factor_enabled:
        request_code(user.id, user.email, user.phone)
        return {
            "access_token": "",
            "token_type": "bearer",
            "two_factor_required": True,
            "user_id": user.id,
        }
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login/verify", response_model=Token)
def verify_login_code(user_id: int, code: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if not verify_code(user.id, code):
        raise HTTPException(status_code=401, detail="Código inválido")

    access_token = authenticate_user(db, user.email, None, skip_password=True)
    return {"access_token": access_token[0], "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
