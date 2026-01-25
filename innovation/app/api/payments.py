from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import requests
from datetime import datetime

from app.db.session import get_db
from app.models.subscription import Subscription
from app.models.plan import Plan
from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/payments", tags=["payments"])

MP_URL = "https://api.mercadopago.com/preapproval"

@router.post("/subscribe")
def subscribe(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(404, "Plano não encontrado")

    payload = {
        "reason": f"Plano {plan.name}",
        "external_reference": str(current_user.id),
        "payer_email": current_user.email,
        "auto_recurring": {
            "frequency": 1,
            "frequency_type": "months",
            "transaction_amount": plan.price,
            "currency_id": "BRL"
        },
        "back_url": "https://seusite.com/retorno"
    }

    resp = requests.post(
        MP_URL,
        json=payload,
        headers={"Authorization": f"Bearer {settings.MP_ACCESS_TOKEN}"}
    )

    if resp.status_code not in (200, 201):
        raise HTTPException(400, "Erro ao criar assinatura MP")

    data = resp.json()

    sub = Subscription(
        user_id=current_user.id,
        plan_id=plan.id,
        status="pending",
        mp_subscription_id=data["id"]
    )

    db.add(sub)
    db.commit()

    return {
        "checkout_url": data["init_point"],
        "subscription_id": data["id"]
    }
