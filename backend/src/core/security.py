from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from jose import jwt
import bcrypt

from core.config import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
)


def get_password_hash(password: str) -> str:
    # Usando bcrypt diretamente para evitar bug de compatibilidade do passlib
    hashed_bytes = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed_bytes.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    # Usando bcrypt diretamente para evitar bug de compatibilidade do passlib
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    """Cria um refresh token seguro com 30 dias de validade"""
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    token_data = {
        "sub": str(user_id),
        "exp": expire,
        "type": "refresh",
        "jti": secrets.token_urlsafe(32),  # JWT ID único
    }
    return jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)


def create_temporary_token(user_id: int) -> str:
    """Cria um token temporário de 5 minutos para verificação 2FA"""
    expire = datetime.now(timezone.utc) + timedelta(minutes=5)
    token_data = {"sub": str(user_id), "exp": expire, "type": "temporary_2fa"}
    return jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)


def verify_temporary_token(token: str) -> int | None:
    """Verifica e retorna o user_id de um temporary token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "temporary_2fa":
            return None
        return int(payload.get("sub"))
    except Exception:
        return None
