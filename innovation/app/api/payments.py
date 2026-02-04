from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any

from app.core.dependencies import require_role
from app.core.roles import Role

router = APIRouter(prefix="/payments", tags=["payments"])

class SubscribeRequest(BaseModel):
    plan_id: int
    method: str  # pix | boleto | card
    extra: Optional[Dict[str, Any]] = None

@router.post("/subscribe")
def subscribe(
    req: SubscribeRequest,
    _company_user=Depends(require_role(Role.COMPANY)),
):
    # Aqui você integra Mercado Pago depois.
    return {"ok": True, "plan_id": req.plan_id, "method": req.method}
