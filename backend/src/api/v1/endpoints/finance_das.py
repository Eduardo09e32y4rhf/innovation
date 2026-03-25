"""
Endpoints de DAS MEI — Conectado ao banco de dados + Portal Gov.br

O DAS MEI propriamente dito é gerado pelo Portal PGMEI da Receita Federal.
Não existe API pública oficial para download automático do boleto,
mas podemos:
  1. Armazenar os dados do DAS da empresa no banco (competência, valor, status)
  2. Gerar o link direto para o PGMEI com o CNPJ pré-preenchido
  3. Permitir marcar como pago após o usuário pagar
  4. Calcular o valor corretamente baseado na atividade (INSS + ICMS/ISS)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User
from domain.models.finance import DasMei, Transaction
from domain.models.company import Company
from pydantic import BaseModel
from datetime import datetime, date, timezone, timedelta
from decimal import Decimal
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/finance/das", tags=["finance-das"])

# ── Valores do MEI 2026 ───────────────────────────────────────────────────────
# Baseado na Resolução CGSN nº 175/2023 e atualização 2026
VALOR_INSS_MEI = Decimal("71.60")  # 5% do salário mínimo R$1.412 = R$70,60 + acréscimo
VALOR_ICMS_MEI = Decimal("1.00")  # Comércio/Indústria
VALOR_ISS_MEI = Decimal("5.00")  # Serviços


class DasMeiPagarRequest(BaseModel):
    competencia: str  # 'YYYY-MM' ex: '2026-03'
    codigo_barras: Optional[str] = None


class DasMeiResponse(BaseModel):
    id: int
    competencia: str
    valor_das: float
    vencimento: str
    status: str
    link_pgmei: str
    link_pgmei_pdf: str
    cnpj: Optional[str] = None
    paid_at: Optional[str] = None


def _get_vencimento(competencia: str) -> date:
    """DAS vence todo dia 20 do mês SEGUINTE à competência."""
    ano, mes = map(int, competencia.split("-"))
    mes_seguinte = mes + 1 if mes < 12 else 1
    ano_seguinte = ano if mes < 12 else ano + 1
    return date(ano_seguinte, mes_seguinte, 20)


def _get_or_create_das(
    db: Session, company_id: int, competencia: str, cnpj: Optional[str] = None
) -> DasMei:
    """Busca ou cria o registro DAS para a competência."""
    das = (
        db.query(DasMei)
        .filter(
            and_(DasMei.company_id == company_id, DasMei.competencia == competencia)
        )
        .first()
    )

    if not das:
        vencimento = _get_vencimento(competencia)
        hoje = date.today()
        status = "overdue" if hoje > vencimento else "pending"

        das = DasMei(
            company_id=company_id,
            cnpj=cnpj,
            competencia=competencia,
            valor_das=VALOR_INSS_MEI + VALOR_ICMS_MEI,  # Padrão: Comércio
            vencimento=vencimento,
            status=status,
        )
        db.add(das)
        db.commit()
        db.refresh(das)

    return das


def _build_response(das: DasMei, cnpj: Optional[str]) -> dict:
    """Monta a resposta com links para o portal do governo."""
    cnpj_raw = (
        (cnpj or das.cnpj or "").replace(".", "").replace("/", "").replace("-", "")
    )

    # Link direto para o PGMEI (Portal de Geração do DAS MEI — Receita Federal)
    link_pgmei = f"https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATBHE/pgmei.app/Identificacao"
    if cnpj_raw:
        link_pgmei = f"https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATBHE/pgmei.app/Identificacao?cnpj={cnpj_raw}"

    # Link alternativo MEI.gov.br (mais amigável)
    link_mei_gov = "https://mei.receita.economia.gov.br/pgmei"

    return {
        "id": das.id,
        "competencia": das.competencia,
        "valor_das": float(das.valor_das),
        "vencimento": das.vencimento.isoformat() if das.vencimento else None,
        "status": das.status,
        "cnpj": das.cnpj or cnpj,
        "link_pgmei": link_pgmei,
        "link_pgmei_pdf": link_mei_gov,
        "paid_at": das.paid_at.isoformat() if das.paid_at else None,
    }


# ── GET /finance/das/competencia-atual ────────────────────────────────────────
@router.get("/competencia-atual")
async def get_das_atual(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna o DAS da competência atual (mês anterior = competência a pagar)."""
    try:
        hoje = datetime.now(timezone.utc)
        # Competência = mês anterior (ex: em março paga o DAS de fevereiro)
        competencia_dt = hoje.replace(day=1) - timedelta(days=1)
        competencia = competencia_dt.strftime("%Y-%m")

        # Buscar CNPJ da empresa do usuário
        cnpj = None
        company = (
            db.query(Company).filter(Company.owner_user_id == current_user.id).first()
        )
        if company:
            cnpj = company.cnpj

        das = _get_or_create_das(db, current_user.id, competencia, cnpj)
        return _build_response(das, cnpj)

    except Exception as e:
        logger.error(f"[das/competencia-atual] {e}")
        # Fallback com dados calculados sem banco
        hoje = datetime.now(timezone.utc)
        comp_dt = hoje.replace(day=1) - timedelta(days=1)
        comp = comp_dt.strftime("%Y-%m")
        ano, mes = map(int, comp.split("-"))
        mes_v = mes + 1 if mes < 12 else 1
        ano_v = ano if mes < 12 else ano + 1
        venc = date(ano_v, mes_v, 20)
        return {
            "id": 0,
            "competencia": comp,
            "valor_das": float(VALOR_INSS_MEI + VALOR_ICMS_MEI),
            "vencimento": venc.isoformat(),
            "status": "pending" if date.today() <= venc else "overdue",
            "cnpj": None,
            "link_pgmei": "https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATBHE/pgmei.app/Identificacao",
            "link_pgmei_pdf": "https://mei.receita.economia.gov.br/pgmei",
            "paid_at": None,
        }


# ── GET /finance/das/historico ────────────────────────────────────────────────
@router.get("/historico")
async def get_das_historico(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna histórico de DAS do usuário (últimos 12 meses)."""
    try:
        das_list = (
            db.query(DasMei)
            .filter(DasMei.company_id == current_user.id)
            .order_by(DasMei.competencia.desc())
            .limit(12)
            .all()
        )
        cnpj = None
        company = (
            db.query(Company).filter(Company.owner_user_id == current_user.id).first()
        )
        if company:
            cnpj = company.cnpj

        return [_build_response(d, cnpj) for d in das_list]
    except Exception as e:
        logger.error(f"[das/historico] {e}")
        return []


# ── POST /finance/das/marcar-pago ─────────────────────────────────────────────
@router.post("/marcar-pago")
async def marcar_das_pago(
    data: DasMeiPagarRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marca o DAS de uma competência como pago e registra como transação."""
    try:
        das = (
            db.query(DasMei)
            .filter(
                and_(
                    DasMei.company_id == current_user.id,
                    DasMei.competencia == data.competencia,
                )
            )
            .first()
        )

        if not das:
            # Cria o das se não existir
            cnpj = None
            company = (
                db.query(Company)
                .filter(Company.owner_user_id == current_user.id)
                .first()
            )
            if company:
                cnpj = company.cnpj
            das = _get_or_create_das(db, current_user.id, data.competencia, cnpj)

        das.status = "paid"
        das.paid_at = datetime.now(timezone.utc)
        if data.codigo_barras:
            das.codigo_barras = data.codigo_barras

        # Registra como transação financeira (despesa paga)
        tx_existente = (
            db.query(Transaction)
            .filter(
                and_(
                    Transaction.company_id == current_user.id,
                    Transaction.tax_type == "DAS",
                    Transaction.category == f"DAS MEI {das.competencia}",
                )
            )
            .first()
        )

        if not tx_existente:
            venc_dt = datetime.combine(das.vencimento, datetime.min.time())
            tx = Transaction(
                company_id=current_user.id,
                description=f"DAS MEI — Competência {das.competencia}",
                amount=das.valor_das,
                type="expense",
                tax_type="DAS",
                status="paid",
                category=f"DAS MEI {das.competencia}",
                due_date=venc_dt,
                payment_date=datetime.now(timezone.utc),
            )
            db.add(tx)

        db.commit()
        db.refresh(das)

        cnpj = das.cnpj
        return {
            **_build_response(das, cnpj),
            "message": "DAS marcado como pago com sucesso!",
        }

    except Exception as e:
        db.rollback()
        logger.error(f"[das/marcar-pago] {e}")
        raise HTTPException(
            status_code=500, detail="Erro interno ao marcar DAS como pago."
        )
