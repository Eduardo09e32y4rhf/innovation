import mercadopago
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from core.config import settings
from infrastructure.database.sql.dependencies import get_db
from domain.models.user import User
from domain.models.subscription import Subscription
from domain.models.plan import Plan  # Assuming Plan model exists
from api.v1.endpoints.auth import get_current_user

router = APIRouter(prefix="/api/payments", tags=["payments"])

# Initialize SDK
sdk = mercadopago.SDK(settings.MP_ACCESS_TOKEN or "TEST-TOKEN")


# 1. CREATE SUBSCRIPTION (PREAPPROVAL)
@router.post("/create-preference/{plan_type}")
async def create_preference(
    plan_type: str, current_user: User = Depends(get_current_user)
):
    """
    Creates a recurring payment preference (subscription) via Mercado Pago Preapproval.
    """
    # Define prices/plans (In a real app, fetch from DB)
    # Mapping plan_type to an internal Plan ID or similar logic
    prices = {"starter": 29.90, "pro": 99.90, "enterprise": 499.90}
    price = prices.get(plan_type, 29.90)

    base_url = settings.BASE_URL

    # Preapproval payload for monthly subscription
    preapproval_data = {
        "reason": f"Assinatura {plan_type.title()} - Innovation.ia",
        "external_reference": str(current_user.id),
        "payer_email": current_user.email,
        "auto_recurring": {
            "frequency": 1,
            "frequency_type": "months",
            "transaction_amount": float(price),
            "currency_id": "BRL",
        },
        "back_url": f"{base_url}/dashboard",
        "status": "pending",
    }

    try:
        # Create Preapproval
        result = sdk.preapproval().create(preapproval_data)
        response = result["response"]

        # The init_point is where the user goes to authorize the subscription
        init_point = response.get("init_point")
        preapproval_id = response.get("id")

        if not init_point:
            # Fallback or error handling
            raise HTTPException(
                status_code=500, detail="Failed to generate subscription link."
            )

        return {"checkout_url": init_point, "preapproval_id": preapproval_id}

    except Exception as e:
        print(f"Error creating preapproval: {e}")
        raise HTTPException(
            status_code=500, detail="Error communicating with Mercado Pago"
        )


# 2. WEBHOOK HANDLER
@router.post("/webhook")
async def mp_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handles Mercado Pago webhooks for subscriptions (preapproval) and payments.
    """
    try:
        data = await request.json()
        action = data.get("action")
        type_ = data.get("type")

        # Log incoming webhook for debugging
        print(f"Webhook received: action={action}, type={type_}, data={data}")

        # Handle Preapproval events (subscription created/updated)
        if type_ == "subscription_preapproval":
            preapproval_id = data.get("data", {}).get("id")
            if preapproval_id:
                # Fetch status from MP
                search_result = sdk.preapproval().get(preapproval_id)
                if search_result["status"] == 200:
                    info = search_result["response"]
                    status = info.get("status")  # authorized, paused, cancelled
                    external_ref = info.get("external_reference")  # user_id

                    if external_ref:
                        user_id = int(external_ref)
                        user = db.query(User).filter(User.id == user_id).first()

                        if user:
                            # Update or Create Subscription Record
                            sub = (
                                db.query(Subscription)
                                .filter(Subscription.user_id == user.id)
                                .first()
                            )

                            # Determine Plan ID based on amount (simplification)
                            # Ideally, store plan_id in metadata, but preapproval metadata support varies
                            amount = info.get("auto_recurring", {}).get(
                                "transaction_amount", 0
                            )
                            plan_id = 1  # Default
                            if amount > 90:
                                plan_id = 2  # Pro
                            if amount > 400:
                                plan_id = 3  # Enterprise

                            if not sub:
                                sub = Subscription(
                                    user_id=user.id,
                                    company_id=user.active_company_id or 1,  # Fallback
                                    plan_id=plan_id,
                                    mp_preapproval_id=preapproval_id,
                                    status=status,
                                )
                                db.add(sub)
                            else:
                                sub.status = status
                                sub.mp_preapproval_id = preapproval_id
                                sub.plan_id = plan_id

                            # Update User status
                            if status == "authorized":
                                user.subscription_status = "active"
                                user.is_active = True
                            else:
                                user.subscription_status = status

                            db.commit()
                            print(
                                f"✅ Subscription updated for user {user.email}: {status}"
                            )

        # Handle Payment events (invoice paid)
        elif action == "payment.created" or type_ == "payment":
            payment_id = data.get("data", {}).get("id")
            if payment_id:
                payment_info = sdk.payment().get(payment_id)
                if payment_info["status"] == 200:
                    response = payment_info["response"]
                    status = response["status"]
                    external_ref = response.get("external_reference")

                    if status == "approved" and external_ref:
                        # Ensure user is active
                        user = (
                            db.query(User).filter(User.id == int(external_ref)).first()
                        )
                        if user:
                            user.subscription_status = "active"
                            user.is_active = True
                            db.commit()

    except Exception as e:
        print(f"Webhook error: {e}")
        return {"status": "error", "detail": str(e)}

    return {"status": "received"}
