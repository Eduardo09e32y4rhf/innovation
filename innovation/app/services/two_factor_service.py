from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.two_factor_code import TwoFactorCode
from app.services.notification_service import NotificationPayload, send_email, send_sms

logger = logging.getLogger(__name__)

_CODE_TTL_SECONDS = 300  # 5 minutos
_MAX_ATTEMPTS = 3  # Máximo de tentativas incorretas


def request_code(db: Session, user_id: int, email: str | None, phone: str | None) -> str:
    """
    Gera e armazena código 2FA no banco de dados usando geração segura.
    Remove códigos anteriores do usuário para evitar confusão.
    """
    # Remove códigos anteriores do usuário
    db.query(TwoFactorCode).filter(TwoFactorCode.user_id == user_id).delete()
    
    # Gera código criptograficamente seguro (6 dígitos)
    code = f"{secrets.randbelow(1000000):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=_CODE_TTL_SECONDS)
    
    # Armazena no banco de dados
    two_factor_code = TwoFactorCode(
        user_id=user_id,
        code=code,
        expires_at=expires_at,
        attempts=0
    )
    db.add(two_factor_code)
    db.commit()
    
    logger.info(f"Código 2FA gerado para user_id={user_id}")

    # Envia código via SMS/Email
    payload = NotificationPayload(
        recipient_email=email,
        recipient_phone=phone,
        subject="Seu código de acesso Innovation.ia",
        message=f"Seu código de verificação é: {code}. Expira em 5 minutos."
    )

    # Tenta SMS primeiro, fallback para e-mail se falhar ou se não houver telefone
    sms_success = send_sms(payload)
    if not sms_success:
        send_email(payload)
        logger.info(f"Código 2FA enviado por email para user_id={user_id}")
    else:
        logger.info(f"Código 2FA enviado por SMS para user_id={user_id}")

    return code


def verify_code(db: Session, user_id: int, code: str) -> bool:
    """
    Verifica código 2FA com proteção contra brute-force.
    Após 3 tentativas incorretas, o código é invalidado.
    """
    two_factor_code = (
        db.query(TwoFactorCode)
        .filter(TwoFactorCode.user_id == user_id)
        .first()
    )
    
    if not two_factor_code:
        logger.warning(f"Tentativa de verificação sem código para user_id={user_id}")
        return False
    
    # Verifica se expirou
    if datetime.now(timezone.utc) > two_factor_code.expires_at:
        db.delete(two_factor_code)
        db.commit()
        logger.warning(f"Código 2FA expirado para user_id={user_id}")
        return False
    
    # Verifica limite de tentativas (proteção brute-force)
    if two_factor_code.attempts >= _MAX_ATTEMPTS:
        db.delete(two_factor_code)
        db.commit()
        logger.warning(f"Máximo de tentativas excedido para user_id={user_id}")
        return False
    
    # Verifica código
    if two_factor_code.code != code:
        two_factor_code.attempts += 1
        db.commit()
        logger.warning(f"Código 2FA incorreto para user_id={user_id} (tentativa {two_factor_code.attempts}/{_MAX_ATTEMPTS})")
        return False
    
    # Sucesso! Remove o código do banco
    db.delete(two_factor_code)
    db.commit()
    logger.info(f"Código 2FA verificado com sucesso para user_id={user_id}")
    return True
