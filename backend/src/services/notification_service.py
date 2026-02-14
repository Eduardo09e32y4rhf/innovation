from dataclasses import dataclass
import logging
from twilio.rest import Client as TwilioClient
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from core.config import settings

logger = logging.getLogger(__name__)

@dataclass(frozen=True)
class NotificationPayload:
    recipient_email: str | None
    recipient_phone: str | None
    subject: str
    message: str


def send_email(payload: NotificationPayload) -> bool:
    if not payload.recipient_email or not settings.SENDGRID_API_KEY:
        return False
    
    try:
        message = Mail(
            from_email=settings.EMAIL_FROM,
            to_emails=payload.recipient_email,
            subject=payload.subject,
            plain_text_content=payload.message
        )
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        sg.send(message)
        return True
    except Exception as e:
        logger.error(f"Erro ao enviar e-mail via SendGrid: {e}")
        return False


def send_sms(payload: NotificationPayload) -> bool:
    if not payload.recipient_phone or not settings.TWILIO_ACCOUNT_SID:
        return False
    
    try:
        client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(
            body=payload.message,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=payload.recipient_phone
        )
        return True
    except Exception as e:
        logger.error(f"Erro ao enviar SMS via Twilio: {e}")
        return False


def notify_application_status_change(
    *,
    recipient_email: str | None,
    recipient_phone: str | None,
    application_id: int,
    old_status: str,
    new_status: str,
) -> None:
    payload = NotificationPayload(
        recipient_email=recipient_email,
        recipient_phone=recipient_phone,
        subject="Atualização da sua candidatura",
        message=(
            "O status da sua candidatura foi atualizado. "
            f"ID da candidatura: {application_id}. "
            f"Status anterior: {old_status}. Novo status: {new_status}."
        ),
    )
    send_email(payload)
    send_sms(payload)
