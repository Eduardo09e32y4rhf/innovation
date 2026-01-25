from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.subscription import Subscription
from app.schemas.payment import SubscribeRequest

router = APIRouter(prefix="/payments")

@router.post("/subscribe")
def subscribe(
    data: SubscribeRequest,
    user_id: int,
    db: Session = Depends(get_db)
):
    sub = Subscription(
        user_id=user_id,
        plan_id=data.plan_id,
        status="active",
        mp_subscription_id="fake-mp-id"
    )
    db.add(sub)
    db.commit()
    return {"status": "subscribed"}

@router.post("/webhook")
async def webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.json()
    mp_id = payload.get("id")
    status = payload.get("status")

    sub = db.query(Subscription).filter(
        Subscription.mp_subscription_id == mp_id
    ).first()

    if sub:
        sub.status = status
        db.commit()

    return {"ok": True}
