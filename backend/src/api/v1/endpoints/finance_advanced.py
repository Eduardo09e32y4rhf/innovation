"""
Finance Advanced — OFX Import, Payroll Cost, Cost Centers, Digital Voucher
"""

import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List

from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User
from domain.models.finance import Transaction

router = APIRouter(prefix="/api/finance/v2", tags=["finance-advanced"])


# ─── OFX IMPORT ────────────────────────────────────────────────────────────────


def _parse_ofx(content: str) -> List[dict]:
    """Parse básico de OFX — extrai transações sem lib externa."""
    transactions = []
    stmttrn_blocks = re.findall(r"<STMTTRN>(.*?)</STMTTRN>", content, re.DOTALL)
    for block in stmttrn_blocks:

        def _get(tag):
            m = re.search(rf"<{tag}>(.*?)\n", block)
            return m.group(1).strip() if m else ""

        trntype = _get("TRNTYPE")
        dtposted = _get("DTPOSTED")[:8]
        amt_raw = _get("TRNAMT")
        memo = _get("MEMO") or _get("NAME")

        try:
            amount = float(amt_raw.replace(",", "."))
        except ValueError:
            continue

        try:
            tx_date = datetime.strptime(dtposted, "%Y%m%d")
        except ValueError:
            tx_date = datetime.utcnow()

        transactions.append(
            {
                "date": tx_date.isoformat(),
                "description": memo,
                "amount": abs(amount),
                "type": "credit" if amount > 0 else "debit",
                "ofx_type": trntype,
            }
        )
    return transactions


@router.post("/import-ofx")
async def import_ofx(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Importa extrato OFX do banco e cria transações correspondentes."""
    content_bytes = await file.read()
    content = content_bytes.decode("latin-1", errors="ignore")

    transactions = _parse_ofx(content)
    if not transactions:
        raise HTTPException(
            status_code=422, detail="Nenhuma transação encontrada no arquivo OFX"
        )

    created = []
    for tx in transactions:
        new_tx = Transaction(
            company_id=current_user.id,
            description=tx["description"] or "Importado OFX",
            amount=tx["amount"],
            type=tx["type"],
            category="Importação OFX",
            due_date=(
                datetime.fromisoformat(tx["date"])
                if tx.get("date")
                else datetime.utcnow()
            ),
        )
        db.add(new_tx)
        created.append(tx)

    db.commit()
    return {"imported": len(created), "transactions": created}


# ─── PAYROLL COST ───────────────────────────────────────────────────────────────


class PayrollEntry(BaseModel):
    employee_name: str
    gross_salary: float
    benefits: float = 0.0  # VR, VT, Plano de saúde
    equipment_cost: float = 0.0  # Notebook, celular etc

    @property
    def inss(self) -> float:
        # INSS patronal 20% + RAT ~3% + terceiros ~5.8% = ~28.8%
        return self.gross_salary * 0.288

    @property
    def fgts(self) -> float:
        return self.gross_salary * 0.08

    @property
    def total_real_cost(self) -> float:
        return (
            self.gross_salary
            + self.inss
            + self.fgts
            + self.benefits
            + self.equipment_cost
        )


class PayrollRequest(BaseModel):
    employees: List[PayrollEntry]


@router.post("/payroll-cost")
def calculate_payroll_cost(data: PayrollRequest):
    """Calcula custo REAL da folha incluindo impostos e benefícios."""
    total = 0.0
    breakdown = []
    for emp in data.employees:
        real_cost = (
            emp.gross_salary
            + emp.gross_salary * 0.288
            + emp.gross_salary * 0.08
            + emp.benefits
            + emp.equipment_cost
        )
        breakdown.append(
            {
                "employee": emp.employee_name,
                "gross_salary": emp.gross_salary,
                "inss_patronal": round(emp.gross_salary * 0.288, 2),
                "fgts": round(emp.gross_salary * 0.08, 2),
                "benefits": emp.benefits,
                "equipment": emp.equipment_cost,
                "total_real_cost": round(real_cost, 2),
                "overhead_factor": (
                    round(real_cost / emp.gross_salary, 2) if emp.gross_salary else 0
                ),
            }
        )
        total += real_cost

    return {
        "total_payroll_cost": round(total, 2),
        "total_employees": len(data.employees),
        "breakdown": breakdown,
    }


# ─── COST CENTERS ───────────────────────────────────────────────────────────────


@router.get("/cost-centers")
def get_cost_centers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Agrupa transações por categoria (centro de custo)."""
    # ⚡ Bolt: Fetch aggregated data directly from DB to eliminate O(N) memory/processing overhead.
    # Why: Previously, this fetched all debit transactions into memory and used Python loops to group and sum amounts.
    # Impact: Dramatically reduces memory footprint and latency for companies with large transaction histories.
    aggregated_results = (
        db.query(
            func.coalesce(Transaction.category, "Outros").label("category"),
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .filter(
            Transaction.company_id == current_user.id,
            Transaction.type == "debit",
        )
        .group_by(func.coalesce(Transaction.category, "Outros"))
        .all()
    )

    centers_list = []
    total_spend = 0.0

    for cat, total, count in aggregated_results:
        # If category was an empty string rather than NULL, map it to "Outros"
        final_cat = cat if cat else "Outros"
        val = float(total) if total else 0.0
        total_spend += val

        # We might have multiple rows if some were "" and some were NULL before coalesce,
        # so we merge them if necessary
        existing = next((c for c in centers_list if c["category"] == final_cat), None)
        if existing:
            existing["total"] += val
            existing["count"] += count
        else:
            centers_list.append({"category": final_cat, "total": val, "count": count})

    for v in centers_list:
        v["percentage"] = round(v["total"] / total_spend * 100, 1) if total_spend else 0

    return {
        "total_spend": round(total_spend, 2),
        "cost_centers": sorted(centers_list, key=lambda x: x["total"], reverse=True),
    }


# ─── DIGITAL VOUCHER VAULT ─────────────────────────────────────────────────────


class VoucherCreate(BaseModel):
    transaction_id: Optional[int] = None
    description: str
    file_url: str  # URL do arquivo (S3, base64 ou link)
    amount: float
    date: str


@router.post("/vouchers")
def add_voucher(
    data: VoucherCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Armazena comprovante/nota fiscal linkado a uma transação."""
    # Store as a transaction with metadata
    tx = Transaction(
        company_id=current_user.id,
        description=f"[COFRE] {data.description}",
        amount=data.amount,
        type="debit",
        category="Cofre Digital",
        due_date=datetime.fromisoformat(data.date) if data.date else datetime.utcnow(),
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return {
        "voucher_id": tx.id,
        "description": data.description,
        "file_url": data.file_url,
        "amount": data.amount,
        "linked_transaction": data.transaction_id,
        "stored_at": datetime.utcnow().isoformat(),
    }


@router.get("/vouchers")
def list_vouchers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vouchers = (
        db.query(Transaction)
        .filter(
            Transaction.company_id == current_user.id,
            Transaction.category == "Cofre Digital",
        )
        .order_by(Transaction.id.desc())
        .all()
    )
    return vouchers
