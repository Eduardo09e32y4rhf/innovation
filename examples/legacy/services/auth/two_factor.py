import secrets
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from models import TwoFactorCode

logger = logging.getLogger(__name__)

CODE_TTL_SECONDS = 300
MAX_ATTEMPTS = 3


def request_code(db: Session, user_id: int, email: str | None, phone: str | None):
    # Limpar códigos antigos
    db.query(TwoFactorCode).filter(TwoFactorCode.user_id == user_id).delete()

    code = f"{secrets.randbelow(1000000):06d}"
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(
        seconds=CODE_TTL_SECONDS
    )

    db_code = TwoFactorCode(user_id=user_id, code=code, expires_at=expires_at)
    db.add(db_code)
    db.commit()

    # PLACEHOLDER: Envio de notificação (Email/SMS)
    # No futuro, isto pode ser um serviço separado ou uma chamada HTTP
    print(f"DEBUG: Código 2FA para {email or phone}: {code}")

    return code


def verify_code(db: Session, user_id: int, code: str):
    two_factor_code = (
        db.query(TwoFactorCode)
        .filter(TwoFactorCode.user_id == user_id, TwoFactorCode.used == False)
        .first()
    )

    if not two_factor_code:
        return False

    if datetime.now(timezone.utc).replace(tzinfo=None) > two_factor_code.expires_at:
        db.delete(two_factor_code)
        db.commit()
        return False

    if two_factor_code.code != code:
        # Poderia implementar contador de tentativas aqui
        return False

    two_factor_code.used = True
    db.commit()
    return True
