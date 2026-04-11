from sqlalchemy.orm import Session
from models import User, RefreshToken
from security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
)
from datetime import datetime, timedelta, timezone


def register_user(
    db: Session,
    email: str,
    password: str,
    name: str = None,
    role: str = "candidate",
    phone: str = None,
):
    if db.query(User).filter(User.email == email).first():
        raise ValueError("Email já existe")

    user = User(
        email=email,
        hashed_password=get_password_hash(password),
        full_name=name or email.split("@")[0],
        role=role,
        phone=phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(
    db: Session, email: str, password: str | None, skip_password: bool = False
):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None

    if not skip_password:
        if not password or not verify_password(password, user.hashed_password):
            return None

    access_token = create_access_token({"sub": str(user.id)})

    # Gerar Refresh Token
    token_str = create_refresh_token(user.id)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    db_refresh = RefreshToken(user_id=user.id, token=token_str, expires_at=expires_at)
    db.add(db_refresh)
    db.commit()

    return access_token, token_str, user


def refresh_access_token(db: Session, refresh_token: str):
    db_token = (
        db.query(RefreshToken)
        .filter(RefreshToken.token == refresh_token, RefreshToken.revoked == False)
        .first()
    )
    if not db_token or db_token.expires_at < datetime.now(timezone.utc).replace(
        tzinfo=None
    ):
        return None

    # Gerar novo Access Token
    new_access_token = create_access_token({"sub": str(db_token.user_id)})
    return new_access_token


def revoke_refresh_token(db: Session, refresh_token: str):
    db_token = (
        db.query(RefreshToken).filter(RefreshToken.token == refresh_token).first()
    )
    if db_token:
        db_token.revoked = True
        db.commit()
    return True
