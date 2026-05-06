"""
Pipeline Persistence API - RH Module
----------------------------------
Endpoint: PUT /api/pipeline/move
 двиг candidatos entre estágios do Kanban
 usa Prisma + Redis para persistência rápida
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, Field
import json
import logging
import os

from core.dependencies import get_current_user, require_active_company
from core.roles import Role
from infrastructure.database.sql.dependencies import get_db
from domain.models.application import Application
from domain.models.application_status_history import ApplicationStatusHistory
from domain.models.user import User
from services.audit_service import log_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])

# ———Redis Client——
def _get_redis():
    """Retorna cliente Redis para cache do pipeline."""
    try:
        import redis
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        return redis.from_url(redis_url, decode_responses=True)
    except Exception as e:
        logger.warning(f"Redis não disponível: {e}. Usando fallback apenas DB.")
        return None


# ——— Schemas ———
class PipelineMoveRequest(BaseModel):
    application_id: int
    new_stage: str = Field(..., description="applied,screening,interview,offer,hired,rejected")
    notes: Optional[str] = None


class PipelineMoveResponse(BaseModel):
    application_id: int
    old_stage: str
    new_stage: str
    updated_at: str
    cached: bool = False


class PipelineStateResponse(BaseModel):
    job_id: Optional[int] = None
    stages: dict = {}
    total_candidates: int


# ——— Endpoints ———


@router.put("/move", response_model=PipelineMoveResponse)
def move_candidate_in_pipeline(
    data: PipelineMoveRequest,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    current_user: User = Depends(get_current_user),
):
    """
    Move um candidato para outro estágio do pipeline.
    
    Fluxo:
    1. Valida o ID da aplicação
    2. Atualiza status no Banco (Prisma/SQLAlchemy)
    3. Armazena estado no Redis para cache rápido
    4. Registra no histórico
    """
    # Mapeamento de stages antigos para novos
    stage_mapping = {
        "applied": "received",
        "screening": "in_review",
        "interview": "interview",
        "offer": "offer",
        "hired": "approved",
        "rejected": "rejected",
    }

    db_stage = stage_mapping.get(data.new_stage, data.new_stage)
    
    # Busca aplicação
    app = (
        db.query(Application)
        .filter(Application.id == data.application_id)
        .filter(Application.company_id == company_id)
        .first()
    )
    
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aplicação não encontrada"
        )

    old_stage = app.status
    
    # Valida transição
    valid_transitions = {
        "received": ["in_review", "rejected"],
        "in_review": ["interview", "rejected"],
        "interview": ["offer", "rejected"],
        "offer": ["approved", "rejected"],
        "approved": [],
        "rejected": [],
    }
    
    if db_stage not in valid_transitions.get(old_stage, []):
        logger.warning(f"Tentativa de transição inválida: {old_stage} -> {db_stage}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transição de {old_stage} para {db_stage} não é permitida pelo fluxo de trabalho."
        )

    # Atualiza no banco
    app.status = db_stage
    if data.notes:
        app.recruiter_notes = (app.recruiter_notes or "") + f"\n[{data.new_stage}] {data.notes}"
    
    # Registra histórico
    history = ApplicationStatusHistory(
        application_id=app.id,
        old_status=old_stage,
        new_status=db_stage,
        changed_by_user_id=current_user.id,
    )
    db.add(history)
    
    db.commit()
    db.refresh(app)

    # ——— Atualiza Redis Cache ———
    r = _get_redis()
    cached = False
    
    if r:
        try:
            pipeline_key = f"pipeline:company:{company_id}:job:{app.job_id}"
            pipeline_data = r.get(pipeline_key)
            
            if pipeline_data:
                data_dict = json.loads(pipeline_data)
            else:
                data_dict = {"stages": {}}

            # Move candidato no cache
            for stage_name, candidate_list in data_dict.get("stages", {}).items():
                if data.application_id in candidate_list:
                    candidate_list.remove(data.application_id)
            
            # Adiciona no novo estágio
            if db_stage not in data_dict["stages"]:
                data_dict["stages"][db_stage] = []
            if data.application_id not in data_dict["stages"][db_stage]:
                data_dict["stages"][db_stage].append(data.application_id)
            
            r.set(pipeline_key, json.dumps(data_dict), ex=3600)  # 1 hora
            cached = True
            
            logger.info(f"Pipeline cache atualizado: company={company_id}, job={app.job_id}")
            
        except Exception as e:
            logger.error(f"Erro ao atualizar cache Redis: {e}")
            cached = False

    # Log de auditoria
    log_event(
        db,
        "pipeline_moved",
        user_id=current_user.id,
        company_id=company_id,
        entity_type="application",
        entity_id=app.id,
        details=f"{old_stage} -> {data.new_stage}"
    )

    return PipelineMoveResponse(
        application_id=data.application_id,
        old_stage=old_stage,
        new_stage=db_stage,
        updated_at=app.updated_at.isoformat() if app.updated_at else "",
        cached=cached
    )


@router.get("/state/{job_id}", response_model=PipelineStateResponse)
def get_pipeline_state(
    job_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
):
    """
    Retorna o estado atual do pipeline para um job.
    Primeiro tenta Redis, senão busca do banco.
    """
    r = _get_redis()
    
    if r:
        pipeline_key = f"pipeline:company:{company_id}:job:{job_id}"
        cached = r.get(pipeline_key)
        
        if cached:
            data = json.loads(cached)
            return PipelineStateResponse(
                job_id=job_id,
                stages=data.get("stages", {}),
                total_candidates=sum(len(c) for c in data.get("stages", {}).values())
            )

    # Fallback: busca do banco
    apps = db.query(Application).filter(Application.job_id == job_id).all()
    
    stages = {}
    for app in apps:
        stage = app.status
        if stage not in stages:
            stages[stage] = []
        stages[stage].append(app.id)

    # Atualiza cache se Redis disponível
    if r:
        try:
            pipeline_key = f"pipeline:company:{company_id}:job:{job_id}"
            r.set(pipeline_key, json.dumps({"stages": stages}), ex=3600)
        except Exception:
            pass

    return PipelineStateResponse(
        job_id=job_id,
        stages=stages,
        total_candidates=len(apps)
    )


@router.post("/cache/clear/{job_id}")
def clear_pipeline_cache(
    job_id: int,
    company_id: int = Depends(require_active_company),
):
    """
    Limpa o cache do Redis para um job específico.
    Útil após alterações manuais no banco.
    """
    r = _get_redis()
    
    if r:
        pipeline_key = f"pipeline:company:{company_id}:job:{job_id}"
        r.delete(pipeline_key)
        return {"message": "Cache limpo", "job_id": job_id}
    else:
        return {"message": "Redis não disponível", "job_id": job_id}
