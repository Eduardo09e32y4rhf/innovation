from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
import requests
import os

from app.db.session import get_db
from app.models.subscription import Subscription

router = APIRouter(prefix="/payments", tags=["payments"])

MP_ACCESS_TOKEN = os.getenv("MP_ACCESS_TOKEN")
MP_BASE_URL = "https://api.mercadopago.com/preapproval"


@router.post("/webhook")
async def mp_webhook(request: Request, db: Session = Depends(get_db)):
    try:
        payload = await request.json()
    except Exception:
        return {"ignored": "empty body"}

    event_type = payload.get("type")
    data = payload.get("data", {})
    preapproval_id = data.get("id")

    if event_type != "preapproval" or not preapproval_id:
        return {"ignored": True}

    headers = {
        "Authorization": f"Bearer {MP_ACCESS_TOKEN}",
    }

    mp_response = requests.get(
        f"{MP_BASE_URL}/{preapproval_id}",
        headers=headers,
    )

    mp_data = mp_response.json()

    sub = (
        db.query(Subscription)
        .filter(Subscription.mp_preapproval_id == preapproval_id)
        .first()
    )

    if not sub:
        return {"error": "subscription not found"}

    sub.status = mp_data.get("status", sub.status)
    db.commit()

    print(f"[WEBHOOK MP] sub_id={sub.id} status={sub.status}")

    return {
        "subscription_id": sub.id,
        "new_status": sub.status,
    }
