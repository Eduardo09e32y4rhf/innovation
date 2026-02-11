from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.dependencies import get_db
from app.models.job import Job
from app.models.user import User
from app.schemas.job import JobCreate, JobResponse, JobUpdate
from app.core.dependencies import get_current_user
import logging

# Config logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

@router.get("", response_model=List[JobResponse])
async def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lista todas as vagas (público)"""
    try:
        query = db.query(Job)
        
        if status:
            query = query.filter(Job.status == status)
        
        jobs = query.offset(skip).limit(limit).all()
        logger.info(f"Retornando {len(jobs)} vagas")
        return jobs
    except Exception as e:
        logger.error(f"Erro ao listar vagas: {str(e)}")
        raise HTTPException(500, f"Erro ao listar vagas: {str(e)}")

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: int,
    db: Session = Depends(get_db)
):
    """Detalhes de uma vaga específica"""
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        
        if not job:
            raise HTTPException(404, "Vaga não encontrada")
        
        logger.info(f"Retornando vaga {job_id}")
        return job
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar vaga: {str(e)}")
        raise HTTPException(500, f"Erro ao buscar vaga: {str(e)}")

@router.post("", response_model=JobResponse, status_code=201)
async def create_job(
    job_data: JobCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Criar nova vaga (requer autenticação de empresa)"""
    try:
        # Verificar se é empresa (role 'COMPANY' ou 'company')
        if str(current_user.role).upper() != "COMPANY":
            raise HTTPException(403, "Apenas empresas podem criar vagas")
        
        company_id = current_user.active_company_id
        if not company_id:
             # Fallback ou erro
             raise HTTPException(400, "Usuário não possui empresa ativa selecionada.")

        # Criar vaga
        new_job = Job(
            **job_data.dict(),
            company_id=company_id
        )
        # Se status nao vier no dict, usa default do modelo ou do schema
        if not new_job.status:
            new_job.status = "active"
        
        db.add(new_job)
        db.commit()
        db.refresh(new_job)
        
        logger.info(f"Vaga {new_job.id} criada por usuário {current_user.id} para empresa {company_id}")
        return new_job
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao criar vaga: {str(e)}")
        raise HTTPException(500, f"Erro ao criar vaga: {str(e)}")

@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    job_data: JobUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Atualizar vaga existente"""
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        
        if not job:
            raise HTTPException(404, "Vaga não encontrada")
        
        # Verificar propriedade via active_company_id
        if job.company_id != current_user.active_company_id:
            raise HTTPException(403, "Você não pode editar esta vaga (empresa incorreta)")
        
        # Atualizar campos
        for field, value in job_data.dict(exclude_unset=True).items():
            setattr(job, field, value)
        
        db.commit()
        db.refresh(job)
        
        logger.info(f"Vaga {job_id} atualizada")
        return job
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao atualizar vaga: {str(e)}")
        raise HTTPException(500, str(e))

@router.delete("/{job_id}", status_code=204)
async def delete_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletar vaga"""
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        
        if not job:
            raise HTTPException(404, "Vaga não encontrada")
        
        if job.company_id != current_user.active_company_id:
            raise HTTPException(403, "Você não pode deletar esta vaga")
        
        db.delete(job)
        db.commit()
        
        logger.info(f"Vaga {job_id} deletada")
        return None
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao deletar vaga: {str(e)}")
        raise HTTPException(500, str(e))

@router.get("/{job_id}/applications")
async def get_job_applications(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Candidaturas de uma vaga específica"""
    try:
        from app.models.application import Application
        
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(404, "Vaga não encontrada")
        
        if job.company_id != current_user.active_company_id:
            raise HTTPException(403, "Acesso negado")
        
        applications = db.query(Application).filter(
            Application.job_id == job_id
        ).all()
        
        return applications
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar candidaturas: {str(e)}")
        raise HTTPException(500, str(e))
