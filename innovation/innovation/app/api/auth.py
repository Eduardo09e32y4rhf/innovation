from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.core.security import create_access_token
from app.services.two_factor_service import request_code, verify_code

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login")
def login(email: str, password: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()

    if not user or user.hashed_password != password:
        raise HTTPException(401, "Credenciais inválidas")

    if not user.phone:
        raise HTTPException(400, "Telefone não cadastrado")

    if user.two_factor_enabled:
        request_code(user.id, user.email, user.phone)
        return {"two_factor_required": True, "user_id": user.id}

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/login/verify")
def verify_login_code(user_id: int, code: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuário não encontrado")

    if not verify_code(user_id, code):
        raise HTTPException(401, "Código inválido")

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/register")
def register(name: str, email: str, phone: str, password: str, db: Session = Depends(get_db)):
    exists = db.query(User).filter(User.email == email).first()
    if exists:
        raise HTTPException(409, "Email já cadastrado")

    user = User(
        name=name,
        email=email,
        phone=phone,
        hashed_password=password,
        is_active=True,
        two_factor_enabled=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email}
