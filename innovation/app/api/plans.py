from fastapi import APIRouter
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.plan import Plan
from fastapi import Depends

router = APIRouter(prefix="/plans", tags=["plans"])

@router.get("")
def list_plans(db: Session = Depends(get_db)):
    plans = db.query(Plan).order_by(Plan.id.asc()).all()
    return [
        {"id": plan.id, "name": plan.name, "price": plan.price, "features": plan.features}
        for plan in plans
    ]
