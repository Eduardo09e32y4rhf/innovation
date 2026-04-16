from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from core.dependencies import (
    get_current_user,
    require_active_company,
    require_company_subscription,
    require_role,
)
from core.roles import Role
from infrastructure.database.sql.dependencies import get_db
from domain.models.application import Application
from domain.models.application_status_history import ApplicationStatusHistory
from domain.models.job import Job
from domain.schemas.application import (
    ApplicationCreate,
    ApplicationOut,
    ApplicationUpdate,
)
from services.audit_service import log_event
from services.notification_service import notify_application_status_change
from domain.models.user import User
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/applications", tags=["applications"])

ALLOWED_APPLICATION_STATUSES = {"received", "in_review", "approved", "rejected"}


@router.get("/me", response_model=List[ApplicationOut])
def list_my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    apps = (
        db.query(Application)
        .filter(Application.candidate_user_id == current_user.id)
        .order_by(Application.id.desc())
        .all()
    )
    return apps


@router.get("/company", response_model=List[ApplicationOut])
def list_company_applications(
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    _subscription=Depends(require_company_subscription),
    _company_user=Depends(require_role(Role.COMPANY)),
    job_id: int | None = None,
):
    query = db.query(Application).filter(Application.company_id == company_id)
    if job_id:
        query = query.filter(Application.job_id == job_id)
    apps = query.order_by(Application.id.desc()).all()
    return apps


@router.get("/{application_id}/history")
def get_application_history(
    application_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    _subscription=Depends(require_company_subscription),
    _company_user=Depends(require_role(Role.COMPANY)),
):
    app = (
        db.query(Application)
        .filter(Application.id == application_id)
        .filter(Application.company_id == company_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Aplicação não encontrada")

    history_items = (
        db.query(ApplicationStatusHistory)
        .filter(ApplicationStatusHistory.application_id == application_id)
        .order_by(ApplicationStatusHistory.id.desc())
        .all()
    )
    return [
        {
            "id": item.id,
            "application_id": item.application_id,
            "old_status": item.old_status,
            "new_status": item.new_status,
            "changed_by_user_id": item.changed_by_user_id,
            "created_at": item.created_at,
        }
        for item in history_items
    ]


@router.post("", response_model=ApplicationOut)
def apply_to_job(
    data: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.query(Job).filter(Job.id == data.job_id, Job.status == "open").first()
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    existing = (
        db.query(Application)
        .filter(Application.job_id == data.job_id)
        .filter(Application.candidate_user_id == current_user.id)
        .first()
    )
    if existing:
        return existing

    app = Application(
        job_id=job.id,
        company_id=job.company_id,
        candidate_user_id=current_user.id,
        status="received",
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    log_event(
        db,
        "application_created",
        user_id=current_user.id,
        company_id=job.company_id,
        entity_type="application",
        entity_id=app.id,
    )

    # ── Integração WhatsApp Omnichannel (Node.js) ─────────────────────────
    # Aciona o bot Baileys copiado do innovation-v1
    try:
        if getattr(current_user, "phone", None):
            import requests

            # Kong Gateway internamente roteia :8004
            url_whatsapp = "http://whatsapp_service:8004/api/whatsapp/send"
            msg = (
                f"Olá {current_user.full_name}! 👋\n\n"
                f"Vi que você se inscreveu para a vaga de *{job.title}* na Innovation.ia. "
                "Podemos fazer uma rápida entrevista por aqui? Digite 'SIM' para começar."
            )
            requests.post(
                url_whatsapp,
                json={"number": current_user.phone, "message": msg},
                timeout=2,
            )
    except Exception as e:
        import logging

        logging.getLogger(__name__).warning(
            f"Erro ao disparar WhatsApp de Recrutamento: {e}"
        )

    return app


@router.patch("/{application_id}", response_model=ApplicationOut)
def update_application(
    application_id: int,
    data: ApplicationUpdate,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    _subscription=Depends(require_company_subscription),
    current_user=Depends(require_role(Role.COMPANY)),
):
    app = (
        db.query(Application)
        .filter(Application.id == application_id)
        .filter(Application.company_id == company_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Aplicação não encontrada")

    status_value = data.status
    old_status = app.status
    status_changed = False

    if status_value:
        if status_value not in ALLOWED_APPLICATION_STATUSES:
            raise HTTPException(status_code=400, detail="Status inválido")
        if status_value != old_status:
            app.status = status_value
            status_changed = True
            history = ApplicationStatusHistory(
                application_id=app.id,
                old_status=old_status,
                new_status=status_value,
                changed_by_user_id=current_user.id,
            )
            db.add(history)

    if data.recruiter_notes:
        app.recruiter_notes = data.recruiter_notes

    db.commit()
    db.refresh(app)

    if status_changed:
        log_event(
            db,
            "application_status_updated",
            user_id=current_user.id,
            company_id=company_id,
            entity_type="application",
            entity_id=app.id,
            details=status_value,
        )
        try:
            notify_application_status_change(
                recipient_email=getattr(app.candidate, "email", None),
                recipient_phone=getattr(app.candidate, "phone", None),
                application_id=app.id,
                old_status=old_status,
                new_status=status_value,
            )
        except Exception:
            pass  # Non-critical failure

        # ── n8n Webhook ─────────────────────────────────────────────────────────
        if status_value == "approved":
            import asyncio

            n8n_url = os.environ.get("N8N_WEBHOOK_URL")
            if n8n_url:

                async def _fire_n8n():
                    try:
                        async with httpx.AsyncClient(timeout=5) as client:
                            await client.post(
                                n8n_url,
                                json={
                                    "event": "candidate.approved",
                                    "application_id": app.id,
                                    "candidate_email": getattr(
                                        app.candidate, "email", None
                                    ),
                                    "candidate_name": getattr(
                                        app.candidate, "name", None
                                    ),
                                    "job_id": app.job_id,
                                    "company_id": company_id,
                                },
                            )
                    except Exception:
                        pass  # n8n offline — do not block approval

                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        asyncio.ensure_future(_fire_n8n())
                    else:
                        loop.run_until_complete(_fire_n8n())
                except Exception:
                    pass  # Never fail the main request because of n8n

    return app
