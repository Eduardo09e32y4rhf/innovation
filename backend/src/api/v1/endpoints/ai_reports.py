from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User
from domain.models.report import Report
from services.nvidia_service import NvidiaService
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-reports", tags=["AI Reports"])
nvidia_service = NvidiaService()


class InsightRequest(BaseModel):
    enterprise_data: Dict[str, Any]
    report_name: str = "Relatório de Gestão Estratégica"


@router.post("/generate-insight")
async def generate_management_insight(
    data: InsightRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Recebe dados da empresa, gera um insight estratégico usando NVIDIA AI
    e salva o resultado no banco de dados como um Report.
    """
    try:
        # 1. Preparar os dados para o serviço
        # Convertemos o dicionário para uma string formatada para facilitar a análise da IA
        context_str = ", ".join([f"{k}: {v}" for k, v in data.enterprise_data.items()])

        # 2. Gerar o insight usando o serviço da NVIDIA
        insight_text = nvidia_service.generate_management_insight(context_str)

        if "[ERRO]" in insight_text:
            raise HTTPException(status_code=502, detail=insight_text)

        # 3. Salvar o relatório no banco de dados
        new_report = Report(
            name=data.report_name,
            description=f"Insight gerado automaticamente para {current_user.full_name}",
            content=insight_text,
            report_type="management",
            created_by=current_user.id,
        )

        db.add(new_report)
        db.commit()
        db.refresh(new_report)

        return {
            "status": "success",
            "report_id": new_report.id,
            "report_name": new_report.name,
            "insight": insight_text,
            "created_at": new_report.created_at,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[ai-reports/generate-insight] {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao processar insight.",
        )


@router.get("/")
async def list_my_reports(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """
    Lista todos os relatórios de IA gerados pelo usuário logado.
    """
    reports = (
        db.query(Report)
        .filter(Report.created_by == current_user.id)
        .order_by(Report.created_at.desc())
        .all()
    )
    return reports
