from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from infrastructure.database.sql.dependencies import get_db
from domain.models.user import User
from domain.models.application import Application
from domain.models.job import Job
from core.dependencies import get_current_user
from typing import List, Dict, Any

router = APIRouter(prefix="/api/candidates", tags=["candidates"])

@router.get("")
async def list_candidates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista candidatos aplicados às vagas da empresa atual"""
    try:
         # Se for Admin ou Empresa, retorna lista.
         # Filtra por active_company_id
        company_id = current_user.active_company_id
        if not company_id and current_user.role != "admin": # Permissive for now if admin
             # Se nao tiver company, talvez retorne vazio ou erro.
             # Para demo, vamos retornar vazio se nao tiver empresa
             return []

        # Join Application + User + Job
        # Select candidates that applied to jobs of this company
        results = db.query(Application, User, Job).join(
            User, Application.candidate_user_id == User.id
        ).join(
            Job, Application.job_id == Job.id
        ).filter(
            Application.company_id == company_id
        ).all()

        candidates_list = []
        seen_candidates = set() 
        
        # O mockup do frontend espera:
        # [{"nome": "João", "vaga": "Dev", "score": 95, "email": "...", "data": "..."}]
        # Mas um candidato pode ter varias aplicações.
        # Vamos retornar uma linha por aplicação para simplificar o dashboard "Últimos Candidatos"
        
        for app, user, job in results:
            candidates_list.append({
                "id": user.id, # ID do candidato para link do perfil
                "application_id": app.id,
                "nome": user.name,
                "email": user.email,
                "vaga": job.title,
                "score": app.score or 0, # Score IA
                "status": app.status,
                "data": app.created_at.strftime("%d/%m/%Y"),
                "phone": user.phone
            })
            
        return candidates_list

    except Exception as e:
        print(f"Error listing candidates: {e}")
        raise HTTPException(500, f"Erro ao listar candidatos: {str(e)}")

@router.get("/{candidate_id}")
async def get_candidate_profile(
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obter perfil completo do candidato"""
    try:
        # Tenta buscar com diferentes cases para role
        candidate = db.query(User).filter(
            User.id == candidate_id
        ).first()
        
        if not candidate:
            raise HTTPException(404, "Candidato não encontrado")
        
        # Verifica se role é candidate (case insensitive ou check simples)
        if hasattr(candidate, 'role') and str(candidate.role).upper() != "CANDIDATE":
            # Opcional: permitir ver perfil se for empresa vendo candidato
            # Mas a rota pede 'candidate_id'
            pass 
        
        # Buscar candidaturas do candidato
        applications = db.query(Application).filter(
            Application.candidate_user_id == candidate_id
        ).all()
        
        return {
            "id": candidate.id,
            "full_name": candidate.name,  # Mapeado para 'name'
            "email": candidate.email,
            "phone": getattr(candidate, 'phone', None),
            "bio": getattr(candidate, 'bio', None),
            "skills": getattr(candidate, 'skills', []),
            "experience": getattr(candidate, 'experience', None),
            "education": getattr(candidate, 'education', None),
            "applications_count": len(applications),
            "applications": [
                {
                    "id": app.id,
                    "job_id": app.job_id,
                    "status": app.status,
                    "score": getattr(app, 'score', 0),
                    "created_at": app.created_at.isoformat()
                }
                for app in applications
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Erro ao buscar candidato: {str(e)}")

@router.get("/{candidate_id}/resume")
async def get_candidate_resume(
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Baixar currículo do candidato"""
    # TODO: Implementar download de currículo
    return {"message": "Feature em desenvolvimento"}
