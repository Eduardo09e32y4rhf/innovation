from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_active_company, require_active_subscription
from app.db.dependencies import get_db
from app.models.application import Application
from app.models.application_status_history import ApplicationStatusHistory
from app.models.job import Job
from app.services.audit_service import log_event
from app.services.notification_service import notify_application_status_change


router = APIRouter(prefix="/applications", tags=["Applications"])

ALLOWED_APPLICATION_STATUSES = {"received", "in_review", "approved", "rejected"}


@router.get("/me")
def list_my_applications(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    apps = (
        db.query(Application)
        .filter(Application.candidate_user_id == current_user.id)
        .order_by(Application.id.desc())
        .all()
    )
    return [
        {
            "id": app.id,
            "job_id": app.job_id,
            "company_id": app.company_id,
            "candidate_user_id": app.candidate_user_id,
            "status": app.status,
        }
        for app in apps
    ]


@router.get("/company")
def list_company_applications(
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    _subscription=Depends(require_active_subscription),
    job_id: int | None = None,
):
    query = db.query(Application).filter(Application.company_id == company_id)
    if job_id:
        query = query.filter(Application.job_id == job_id)
    apps = query.order_by(Application.id.desc()).all()
    return [
        {
            "id": app.id,
            "job_id": app.job_id,
            "company_id": app.company_id,
            "candidate_user_id": app.candidate_user_id,
            "status": app.status,
        }
        for app in apps
    ]


@router.get("/{application_id}/history")
def get_application_history(
    application_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    _subscription=Depends(require_active_subscription),
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


@router.post("")
def apply_to_job(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    job_id = payload.get("job_id")
    if not job_id:
        raise HTTPException(status_code=400, detail="job_id é obrigatório")

    job = db.query(Job).filter(Job.id == job_id, Job.status == "open").first()
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    existing = (
        db.query(Application)
        .filter(Application.job_id == job_id)
        .filter(Application.candidate_user_id == current_user.id)
        .first()
    )
    if existing:
        return {
            "id": existing.id,
            "job_id": existing.job_id,
            "company_id": existing.company_id,
            "candidate_user_id": existing.candidate_user_id,
            "status": existing.status,
        }

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
    return {
        "id": app.id,
        "job_id": app.job_id,
        "company_id": app.company_id,
        "candidate_user_id": app.candidate_user_id,
        "status": app.status,
    }


@router.patch("/{application_id}")
def update_application(
    application_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    _subscription=Depends(require_active_subscription),
    current_user=Depends(get_current_user),
):
    app = (
        db.query(Application)
        .filter(Application.id == application_id)
        .filter(Application.company_id == company_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Aplicação não encontrada")

    status_value = payload.get("status")
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
        notify_application_status_change(
            recipient_email=getattr(app.candidate, "email", None),
            recipient_phone=getattr(app.candidate, "phone", None),
            application_id=app.id,
            old_status=old_status,
            new_status=status_value,
        )
    return {
        "id": app.id,
        "job_id": app.job_id,
        "company_id": app.company_id,
        "candidate_user_id": app.candidate_user_id,
        "status": app.status,
    }
