from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..db.database import get_db
from ..models.job import Job
from ..models.application import Application
from ..models.user import User
from ..core.dependencies import get_current_user
from pydantic import BaseModel
import logging

router = APIRouter(prefix="/api/jobs", tags=["jobs"])
logger = logging.getLogger(__name__)

# SCHEMAS
class JobCreate(BaseModel):
    title: str
    description: str
    requirements: Optional[str] = None
    salary: Optional[str] = None
    location: str
    type: str
    interview_link: Optional[str] = None
    comments: Optional[str] = None

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    salary: Optional[str] = None
    location: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    interview_link: Optional[str] = None
    comments: Optional[str] = None

class JobResponse(BaseModel):
    id: int
    title: str
    description: str
    requirements: Optional[str]
    salary: Optional[str]
    location: str
    type: Optional[str]
    status: str
    interview_link: Optional[str]
    comments: Optional[str]
    company_id: int
    applications_count: Optional[int] = 0
    
    class Config:
        from_attributes = True

# ENDPOINTS
@router.get("", response_model=List[JobResponse])
async def list_jobs(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lista vagas (público)"""
    try:
        query = db.query(Job)
        
        if status:
            query = query.filter(Job.status == status)
        
        if search:
            query = query.filter(
                (Job.title.ilike(f"%{search}%")) |
                (Job.description.ilike(f"%{search}%"))
            )
        
        jobs = query.offset(skip).limit(limit).all()
        
        # Adicionar count de candidaturas
        result = []
        for job in jobs:
            job_dict = {
                "id": job.id,
                "title": job.title,
                "description": job.description,
                "requirements": job.requirements,
                "salary": job.salary,
                "location": job.location,
                "type": job.type,
                "status": job.status,
                "interview_link": job.interview_link,
                "comments": job.comments,
                "company_id": job.company_id,
                "applications_count": len(job.applications)
            }
            result.append(job_dict)
        
        logger.info(f"Retornando {len(result)} vagas")
        return result
        
    except Exception as e:
        logger.error(f"Erro: {str(e)}")
        raise HTTPException(500, str(e))

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: int, db: Session = Depends(get_db)):
    """Detalhes de uma vaga"""
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(404, "Vaga não encontrada")
    
    return {
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "requirements": job.requirements,
        "salary": job.salary,
        "location": job.location,
        "type": job.type,
        "status": job.status,
        "interview_link": job.interview_link,
        "comments": job.comments,
        "company_id": job.company_id,
        "applications_count": len(job.applications)
    }

@router.post("", response_model=JobResponse, status_code=201)
async def create_job(
    job_data: JobCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Criar vaga (empresa)"""
    if current_user.role != "company":
        raise HTTPException(403, "Apenas empresas podem criar vagas")
    
    try:
        new_job = Job(
            **job_data.dict(),
            company_id=current_user.id,
            status="active"
        )
        
        db.add(new_job)
        db.commit()
        db.refresh(new_job)
        
        logger.info(f"Vaga {new_job.id} criada")
        
        return {
            "id": new_job.id,
            "title": new_job.title,
            "description": new_job.description,
            "requirements": new_job.requirements,
            "salary": new_job.salary,
            "location": new_job.location,
            "type": new_job.type,
            "status": new_job.status,
            "interview_link": new_job.interview_link,
            "comments": new_job.comments,
            "company_id": new_job.company_id,
            "applications_count": 0
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Erro: {str(e)}")
        raise HTTPException(500, str(e))

@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    job_data: JobUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Atualizar vaga"""
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(404, "Vaga não encontrada")
    
    if job.company_id != current_user.id:
        raise HTTPException(403, "Sem permissão")
    
    try:
        for field, value in job_data.dict(exclude_unset=True).items():
            setattr(job, field, value)
        
        db.commit()
        db.refresh(job)
        
        logger.info(f"Vaga {job_id} atualizada")
        
        return {
            "id": job.id,
            "title": job.title,
            "description": job.description,
            "requirements": job.requirements,
            "salary": job.salary,
            "location": job.location,
            "type": job.type,
            "status": job.status,
            "interview_link": job.interview_link,
            "comments": job.comments,
            "company_id": job.company_id,
            "applications_count": len(job.applications)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))

@router.delete("/{job_id}", status_code=204)
async def delete_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletar vaga"""
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(404, "Vaga não encontrada")
    
    if job.company_id != current_user.id:
        raise HTTPException(403, "Sem permissão")
    
    db.delete(job)
    db.commit()
    
    logger.info(f"Vaga {job_id} deletada")
    return None

@router.get("/{job_id}/applications")
async def get_job_applications(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Candidaturas de uma vaga"""
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(404, "Vaga não encontrada")
    
    if job.company_id != current_user.id:
        raise HTTPException(403, "Sem permissão")
    
    applications = db.query(Application).filter(
        Application.job_id == job_id
    ).all()
    
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
            "created_at": app.created_at.isoformat()
        })
    
    return result
