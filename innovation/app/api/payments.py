from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any

router = APIRouter(prefix="/payments", tags=["payments"])

class SubscribeRequest(BaseModel):
    plan_id: int
    method: str  # pix | boleto | card
    extra: Optional[Dict[str, Any]] = None

@router.post("/subscribe")
def subscribe(req: SubscribeRequest):
    # Aqui você integra Mercado Pago depois.
    return {"ok": True, "plan_id": req.plan_id, "method": req.method}
