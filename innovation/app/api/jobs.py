from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import (
    get_current_user,
    require_active_company,
    require_active_subscription,
)
from app.db.dependencies import get_db
from app.models.job import Job
from app.services.audit_service import log_event


router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("")
def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).filter(Job.status == "open").order_by(Job.id.desc()).all()
    return [
        {
            "id": job.id,
            "company_id": job.company_id,
            "title": job.title,
            "description": job.description,
            "location": job.location,
            "status": job.status,
        }
        for job in jobs
    ]


@router.get("/company")
def list_company_jobs(
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    _subscription=Depends(require_active_subscription),
):
    jobs = db.query(Job).filter(Job.company_id == company_id).order_by(Job.id.desc()).all()
    return [
        {
            "id": job.id,
            "company_id": job.company_id,
            "title": job.title,
            "description": job.description,
            "location": job.location,
            "status": job.status,
        }
        for job in jobs
    ]


@router.post("")
def create_job(
    payload: dict,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    _subscription=Depends(require_active_subscription),
    current_user=Depends(get_current_user),
):
    title = payload.get("title")
    description = payload.get("description")
    if not title or not description:
        raise HTTPException(status_code=400, detail="title e description são obrigatórios")

    job = Job(
        company_id=company_id,
        title=title,
        description=description,
        location=payload.get("location"),
        status=payload.get("status", "open"),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    log_event(
        db,
        "job_created",
        user_id=current_user.id,
        company_id=company_id,
        entity_type="job",
        entity_id=job.id,
    )
    return {
        "id": job.id,
        "company_id": job.company_id,
        "title": job.title,
        "description": job.description,
        "location": job.location,
        "status": job.status,
    }


@router.patch("/{job_id}")
def update_job(
    job_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    _subscription=Depends(require_active_subscription),
    current_user=Depends(get_current_user),
):
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    for field in ("title", "description", "location", "status"):
        if field in payload:
            setattr(job, field, payload[field])

    db.commit()
    db.refresh(job)

    log_event(
        db,
        "job_updated",
        user_id=current_user.id,
        company_id=company_id,
        entity_type="job",
        entity_id=job.id,
    )
    return {
        "id": job.id,
        "company_id": job.company_id,
        "title": job.title,
        "description": job.description,
        "location": job.location,
        "status": job.status,
    }


@router.post("/{job_id}/pause")
def pause_job(
    job_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    _subscription=Depends(require_active_subscription),
    current_user=Depends(get_current_user),
):
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    job.status = "paused"
    db.commit()
    log_event(
        db,
        "job_paused",
        user_id=current_user.id,
        company_id=company_id,
        entity_type="job",
        entity_id=job.id,
    )
    return {"ok": True}


@router.delete("/{job_id}")
def close_job(
    job_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    _subscription=Depends(require_active_subscription),
    current_user=Depends(get_current_user),
):
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    job.status = "closed"
    db.commit()
    log_event(
        db,
        "job_closed",
        user_id=current_user.id,
        company_id=company_id,
        entity_type="job",
        entity_id=job.id,
    )
    return {"ok": True}
