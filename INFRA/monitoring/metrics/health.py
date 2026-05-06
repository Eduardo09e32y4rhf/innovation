from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from core.config import settings
from infrastructure.database.sql.dependencies import get_db
from services.notification_service import NotificationPayload, send_email

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint para verificar:
    - Conexão com o banco de dados
    - Configuração de e-mail (SendGrid)
    - Configuração de SMS (Twilio)
    """
    checks = {
        "status": "healthy",
        "database": "unknown",
        "email_configured": bool(settings.SENDGRID_API_KEY),
        "sms_configured": bool(settings.TWILIO_ACCOUNT_SID),
    }

    # Testa conexão com banco
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "connected"
    except Exception as e:
        checks["status"] = "unhealthy"
        checks["database"] = f"error: {str(e)}"

    return checks


@router.get("/health/deep")
def deep_health_check(db: Session = Depends(get_db)):
    """
    Health check profundo que testa envio real de e-mail.
    Use com cuidado em produção.
    """
    checks = {
        "status": "healthy",
        "database": "unknown",
        "email_send": "not_tested",
    }

    # Testa conexão com banco
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "connected"
    except Exception as e:
        checks["status"] = "unhealthy"
        checks["database"] = f"error: {str(e)}"
        return checks

    # Testa envio de e-mail (apenas se configurado)
    if settings.SENDGRID_API_KEY and settings.EMAIL_FROM:
        try:
            payload = NotificationPayload(
                recipient_email=settings.EMAIL_FROM,
                recipient_phone=None,
                subject="Health Check - Innovation.ia",
                message="Este é um teste automático do sistema de health check.",
            )
            success = send_email(payload)
            checks["email_send"] = "success" if success else "failed"
        except Exception as e:
            checks["email_send"] = f"error: {str(e)}"
            checks["status"] = "degraded"
    else:
        checks["email_send"] = "not_configured"

    return checks
