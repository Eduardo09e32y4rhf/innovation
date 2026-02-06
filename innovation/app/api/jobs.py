from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import (
    get_current_user,
    require_active_company,
    require_company_subscription,
    require_role,
)
from app.core.roles import Role
from app.db.dependencies import get_db
from app.models.job import Job
from app.schemas.job import JobCreate, JobOut, JobUpdate
from app.services.audit_service import log_event


router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("", response_model=List[JobOut])
def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).filter(Job.status == "open").order_by(Job.id.desc()).all()
    return jobs


@router.get("/company", response_model=List[JobOut])
def list_company_jobs(
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    _subscription=Depends(require_company_subscription),
    _company_user=Depends(require_role(Role.COMPANY)),
):
    jobs = db.query(Job).filter(Job.company_id == company_id).order_by(Job.id.desc()).all()
    return jobs


@router.post("", response_model=JobOut)
def create_job(
    data: JobCreate,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    _subscription=Depends(require_company_subscription),
    current_user=Depends(require_role(Role.COMPANY)),
):
    job = Job(
        company_id=company_id,
        title=data.title,
        description=data.description,
        location=data.location,
        status=data.status,
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
    return job


@router.patch("/{job_id}", response_model=JobOut)
def update_job(
    job_id: int,
    data: JobUpdate,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    _subscription=Depends(require_company_subscription),
    current_user=Depends(require_role(Role.COMPANY)),
):
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(job, field, value)

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
    return job


@router.post("/{job_id}/pause")
def pause_job(
    job_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    _subscription=Depends(require_company_subscription),
    current_user=Depends(require_role(Role.COMPANY)),
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
    _subscription=Depends(require_company_subscription),
    current_user=Depends(require_role(Role.COMPANY)),
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
