from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import require_admin_role
from infrastructure.database.sql.dependencies import get_db
from domain.models.plan import Plan

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("")
def list_plans(
    db: Session = Depends(get_db),
    _admin=Depends(require_admin_role),
):
    plans = db.query(Plan).order_by(Plan.id.asc()).all()
    return [
        {
            "id": plan.id,
            "name": plan.name,
            "price": plan.price,
            "features": plan.features,
        }
        for plan in plans
    ]
