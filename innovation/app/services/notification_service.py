from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class NotificationPayload:
    recipient_email: str | None
    recipient_phone: str | None
    subject: str
    message: str


def send_email(payload: NotificationPayload) -> None:
    if not payload.recipient_email:
        return
    # Placeholder: integrate real provider later
    return


def send_sms(payload: NotificationPayload) -> None:
    if not payload.recipient_phone:
        return
    # Placeholder: integrate real provider later
    return


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
