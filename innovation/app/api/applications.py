from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db.database import get_db
from ..models.application import Application
from ..models.job import Job
from ..models.user import User
from ..core.dependencies import get_current_user
from pydantic import BaseModel, Field
from typing import Optional, List
import logging

router = APIRouter(prefix="/api/applications", tags=["applications"])
logger = logging.getLogger(__name__)

# SCHEMAS COM VALIDAÇÃO (Previne injeção básica e dados inválidos)
class ApplicationCreate(BaseModel):
    job_id: int = Field(..., gt=0)

class ApplicationUpdate(BaseModel):
    status: Optional[str] = Field(None, max_length=50)
    recruiter_notes: Optional[str] = Field(None, max_length=5000)

@router.post("", status_code=status.HTTP_201_CREATED)
async def apply_to_job(
    data: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Candidatar-se a vaga (Seguro contra múltiplas candidaturas)"""
    if current_user.role != "candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Apenas candidatos podem se candidatar"
        )
    
    job = db.query(Job).filter(Job.id == data.job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vaga não encontrada")
    
    if job.status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta vaga não aceita mais candidaturas")
    
    # Prevenção de duplicidade
    existing = db.query(Application).filter(
        Application.job_id == data.job_id,
        Application.candidate_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Você já se candidatou a esta vaga")
    
    try:
        application = Application(
            job_id=data.job_id,
            candidate_id=current_user.id,
            status="pending"
        )
        
        db.add(application)
        db.commit()
        db.refresh(application)
        
        logger.info(f"AUDIT: Candidatura {application.id} criada pelo user {current_user.id}")
        
        return {
            "id": application.id,
            "job_id": application.job_id,
            "status": application.status,
            "message": "Candidatura enviada com sucesso!"
        }
    except Exception as e:
        db.rollback()
        logger.error(f"ERRO: Falha ao criar candidatura: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro interno ao processar candidatura")

@router.get("/my-applications")
async def get_my_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Minhas candidaturas (Proteção IDOR implícita pelo filtro candidate_id)"""
    if current_user.role != "candidate":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito a candidatos")
    
    # O filtro por candidate_id garante que o usuário só veja o que é dele
    apps = db.query(Application).filter(Application.candidate_id == current_user.id).all()
    
    result = []
    for app in apps:
        job = db.query(Job).filter(Job.id == app.job_id).first()
        result.append({
            "id": app.id,
            "job_id": app.job_id,
            "job_title": job.title if job else "Vaga removida",
            "status": app.status,
            "match_score": app.match_score,
            "created_at": app.created_at.isoformat()
        })
    
    return result

@router.put("/{application_id}")
async def update_application(
    application_id: int,
    data: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Atualizar candidatura (Proteção IDOR rigorosa por Company Ownership)"""
    application = db.query(Application).filter(Application.id == application_id).first()
    
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidatura não encontrada")
    
    # LOGICA DE PERMISSÃO REFORÇADA
    job = db.query(Job).filter(Job.id == application.job_id).first()
    
    # Verifica se o usuário é o dono da empresa que postou a vaga
    if not job or job.company_id != current_user.id:
        logger.warning(f"AUDIT: Tentativa de acesso não autorizado à candidatura {application_id} pelo usuário {current_user.id}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permissão negada para gerenciar esta candidatura")
    
    try:
        if data.status:
            application.status = data.status
        if data.recruiter_notes:
            application.recruiter_notes = data.recruiter_notes
        
        db.commit()
        db.refresh(application)
        
        logger.info(f"AUDIT: Candidatura {application_id} atualizada por {current_user.id}. Status: {application.status}")
        
        return {
            "id": application.id,
            "status": application.status,
            "message": "Candidatura atualizada com sucesso"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao atualizar candidatura")
