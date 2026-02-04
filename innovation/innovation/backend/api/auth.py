from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from innovation.backend.db.session import get_db
from innovation.backend.models.user import User
from innovation.backend.schemas.auth import LoginRequest, TokenResponse
from innovation.backend.core.security import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou senha inválidos")

    token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(days=1)
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }
