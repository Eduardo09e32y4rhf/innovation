import mercadopago
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from core.config import settings
from infrastructure.database.sql.dependencies import get_db
from domain.models.user import User
from api.v1.endpoints.auth import get_current_user
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/payments", tags=["payments"])

# Initialize SDK
sdk = mercadopago.SDK(settings.MP_ACCESS_TOKEN or "TEST-TOKEN")


@router.post("/create-subscription/{plan_type}")
async def create_subscription(
    plan_type: str, current_user: User = Depends(get_current_user)
):
    """
    Creates a recurring subscription (preapproval) for the streaming model.
    """
    prices = {"starter": 29.90, "pro": 99.90, "enterprise": 499.90}
    price = prices.get(plan_type, 29.90)
    base_url = settings.BASE_URL

    # Preapproval payload (Subscription)
    preapproval_data = {
        "reason": f"Assinatura Innovation.ia - {plan_type.title()}",
        "auto_recurring": {
            "frequency": 1,
            "frequency_type": "months",
            "transaction_amount": float(price),
            "currency_id": "BRL",
        },
        "payer_email": current_user.email,
        "back_url": f"{base_url}/dashboard",
        "status": "pending",
        "external_reference": str(current_user.id),
    }

    try:
        # Create Preapproval (Subscription)
        result = sdk.preapproval().create(preapproval_data)
        response = result["response"]

        # 'init_point' is the link for the user to authorize the subscription
        return {"checkout_url": response["init_point"], "id": response["id"]}
    except Exception as e:
        print(f"Erro ao criar assinatura: {e}")
        raise HTTPException(
            status_code=500, detail="Erro ao comunicar com Mercado Pago"
        )


@router.post("/webhook")
async def mp_webhook(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
    except Exception:
        return {"status": "ignored_no_json"}

    event_type = data.get("type")
    action = data.get("action")

    # Handle Subscription (preapproval) events
    if event_type == "subscription_preapproval":
        preapproval_id = data.get("data", {}).get("id")
        if preapproval_id:
            # Verify status with MP
            result = sdk.preapproval().get(preapproval_id)
            if result["status"] == 200:
                sub_data = result["response"]
                status = sub_data["status"]
                external_ref = sub_data["external_reference"]

                # 'authorized' means the user accepted the subscription
                if status == "authorized":
                    user = db.query(User).filter(User.id == int(external_ref)).first()
                    if user:
                        # Determine plan based on amount or reason logic
                        # Simplified: default to 'pro' or extract from reason string
                        reason = sub_data.get("reason", "").lower()
                        plan = "pro"
                        if "starter" in reason:
                            plan = "starter"
                        elif "enterprise" in reason:
                            plan = "enterprise"

                        user.subscription_plan = plan
                        user.subscription_status = "active"
                        user.is_active = True
                        db.commit()
                        print(f"✅ Assinatura Ativa: {user.email} - {plan}")

    # Keep handling individual payments for redundancy/legacy
    elif event_type == "payment":
        payment_id = data.get("data", {}).get("id")
        if payment_id:
            payment_info = sdk.payment().get(payment_id)
            if payment_info["status"] == 200:
                response = payment_info["response"]
                status = response["status"]
                external_ref = response.get("external_reference")

                if status == "approved" and external_ref:
                    user = db.query(User).filter(User.id == int(external_ref)).first()
                    if user:
                         # Update only if not already active to avoid overwriting subscription logic
                         if user.subscription_status != "active":
                            user.subscription_status = "active"
                            user.is_active = True
                            db.commit()

    return {"status": "received"}
