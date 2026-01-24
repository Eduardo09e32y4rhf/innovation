from sqlalchemy.orm import Session
from app.models.user import User
from app.models.company import Company
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
)

def register_user(db: Session, email: str, password: str, company_name: str | None):
    if db.query(User).filter(User.email == email).first():
        raise ValueError("Email já existe")

    user = User(email=email, hashed_password=get_password_hash(password))
    db.add(user)
    db.flush()

    company = Company(name=company_name or "Minha Empresa", owner_user_id=user.id)
    db.add(company)
    db.flush()

    user.active_company_id = company.id
    db.commit()
    db.refresh(user)
    return user

def authenticate_user(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        return None

    token = create_access_token({"sub": str(user.id)})
    return token, user
