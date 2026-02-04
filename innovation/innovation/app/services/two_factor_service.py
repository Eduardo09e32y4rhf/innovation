import random
from datetime import datetime, timedelta

import requests
from twilio.rest import Client

from app.core.config import settings


class TwoFactorError(RuntimeError):
    pass


_CODE_STORE: dict[str, dict] = {}


def _generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def send_email_code(email: str, code: str) -> None:
    if not settings.SENDGRID_API_KEY or not settings.SENDGRID_FROM_EMAIL:
        raise TwoFactorError("SendGrid not configured")

    payload = {
        "personalizations": [{"to": [{"email": email}]}],
        "from": {"email": settings.SENDGRID_FROM_EMAIL},
        "subject": "Seu código de verificação",
        "content": [{"type": "text/plain", "value": f"Seu código: {code}"}],
    }

    response = requests.post(
        "https://api.sendgrid.com/v3/mail/send",
        json=payload,
        headers={"Authorization": f"Bearer {settings.SENDGRID_API_KEY}"},
        timeout=10,
    )
    if response.status_code >= 400:
        raise TwoFactorError("SendGrid failed")


def send_sms_code(phone: str, code: str) -> None:
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_FROM_PHONE:
        raise TwoFactorError("Twilio not configured")

    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    client.messages.create(
        body=f"Seu código de verificação: {code}",
        from_=settings.TWILIO_FROM_PHONE,
        to=phone,
    )


def request_code(user_id: int, email: str, phone: str) -> None:
    code = _generate_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    _CODE_STORE[str(user_id)] = {"code": code, "expires_at": expires_at}

    send_email_code(email, code)
    send_sms_code(phone, code)


def verify_code(user_id: int, code: str) -> bool:
    record = _CODE_STORE.get(str(user_id))
    if not record:
        return False
    if datetime.utcnow() > record["expires_at"]:
        _CODE_STORE.pop(str(user_id), None)
        return False
    if record["code"] != code:
        return False
    _CODE_STORE.pop(str(user_id), None)
    return True
