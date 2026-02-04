from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.core.dependencies import require_active_company
from app.db.session import get_db
from app.models.job import Job


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


@router.patch("/{job_id}")
def update_job(
    job_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
):
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    for field in ("title", "description", "location", "status"):
        if field in payload:
            setattr(job, field, payload[field])

    db.commit()
    db.refresh(job)
    return {
        "id": job.id,
        "company_id": job.company_id,
        "title": job.title,
        "description": job.description,
        "location": job.location,
        "status": job.status,
    }


@router.delete("/{job_id}")
def close_job(
    job_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
):
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    job.status = "closed"
    db.commit()
    return {"ok": True}
