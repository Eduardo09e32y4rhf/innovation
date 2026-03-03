from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext
import os

PWD_CONTEXT = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configurações via env (fallback para as do monólito)
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 horas
REFRESH_TOKEN_EXPIRE_DAYS = 7
TEMPORARY_TOKEN_EXPIRE_MINUTES = 10


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(user_id: int):
    import secrets

    return secrets.token_urlsafe(32)


def verify_password(plain_password: str, hashed_password: str):
    return PWD_CONTEXT.verify(plain_password, hashed_password)


def get_password_hash(password: str):
    return PWD_CONTEXT.hash(password)


def create_temporary_token(user_id: int):
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=TEMPORARY_TOKEN_EXPIRE_MINUTES
    )
    to_encode = {"sub": str(user_id), "type": "temporary", "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_temporary_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "temporary":
            return None
        return int(payload.get("sub"))
    except Exception:
        return None
