from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import RegisterRequest

router = APIRouter(prefix="/auth")

@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    user = User(email=data.email, hashed_password=data.password)
    db.add(user)
    db.commit()
    return {"msg": "ok"}
