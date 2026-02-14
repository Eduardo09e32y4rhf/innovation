from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.core.dependencies import (
    get_current_user,
    require_active_company,
    require_company_subscription,
    require_role,
)
from app.core.roles import Role
from app.db.dependencies import get_db
from app.models.job import Job
from app.models.application import Application
from app.models.user import User
from app.schemas.job import JobCreate, JobOut, JobUpdate
from app.services.audit_service import log_event

router = APIRouter(prefix="/api/jobs", tags=["jobs"])
logger = logging.getLogger(__name__)

@router.get("", response_model=List[JobOut])
def list_jobs(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = "open",
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lista vagas (público) - Mesclado com filtros"""
    try:
        query = db.query(Job)
        
        if status:
            query = query.filter(Job.status == status)
        
        if search:
            query = query.filter(
                (Job.title.ilike(f"%{search}%")) |
                (Job.description.ilike(f"%{search}%"))
            )
        
        jobs = query.order_by(Job.id.desc()).offset(skip).limit(limit).all()
        return jobs
        
    except Exception as e:
        logger.error(f"Erro ao listar vagas: {str(e)}")
        raise HTTPException(500, str(e))

@router.get("/company", response_model=List[JobOut])
def list_company_jobs(
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    _subscription=Depends(require_company_subscription),
    _company_user=Depends(require_role(Role.COMPANY)),
):
    """Lista vagas específicas da empresa logada"""
    jobs = db.query(Job).filter(Job.company_id == company_id).order_by(Job.id.desc()).all()
    return jobs

@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    """Detalhes de uma vaga"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Vaga não encontrada")
    return job

@router.post("", response_model=JobOut)
def create_job(
    data: JobCreate,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    current_user=Depends(require_role(Role.COMPANY)),
):
    """Criação de vaga com auditoria"""
    try:
        job = Job(
            company_id=company_id,
            title=data.title,
            description=data.description,
            location=data.location,
            status=data.status or "open",
            requirements=data.requirements,
            salary=data.salary,
            type=data.type
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
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao criar vaga: {str(e)}")
        raise HTTPException(500, str(e))

@router.patch("/{job_id}", response_model=JobOut)
def update_job(
    job_id: int,
    data: JobUpdate,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    current_user=Depends(require_role(Role.COMPANY)),
):
    """Atualização de vaga com auditoria"""
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

@router.delete("/{job_id}", status_code=204)
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    current_user=Depends(require_role(Role.COMPANY)),
):
    """Deleção de vaga"""
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company_id).first()
    if not job:
        raise HTTPException(404, "Vaga não encontrada")
    
    db.delete(job)
    db.commit()
    
    log_event(
        db,
        "job_deleted",
        user_id=current_user.id,
        company_id=company_id,
        entity_type="job",
        entity_id=job_id,
    )
    return None

@router.get("/{job_id}/applications")
def get_job_applications(
    job_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    current_user=Depends(require_role(Role.COMPANY)),
):
    """Candidaturas de uma vaga com detalhes dos candidatos"""
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company_id).first()
    if not job:
        raise HTTPException(404, "Vaga não encontrada")
    
    applications = db.query(Application).filter(Application.job_id == job_id).all()
    
    result = []
    for app in applications:
        candidate = db.query(User).filter(User.id == app.candidate_id).first()
        result.append({
            "id": app.id,
            "job_id": app.job_id,
            "candidate_id": app.candidate_id,
            "candidate_name": candidate.full_name if candidate else "Desconhecido",
            "candidate_email": candidate.email if candidate else "",
            "status": app.status,
            "match_score": app.match_score,
            "ai_analysis": app.ai_analysis,
            "recruiter_notes": app.recruiter_notes,
            "created_at": app.created_at.isoformat() if app.created_at else None
        })
    
    return result
