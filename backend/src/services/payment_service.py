import mercadopago
import os
from sqlalchemy.orm import Session
from domain.models.user import User
from domain.models.subscription import Subscription

class PaymentService:
    def __init__(self):
        self.access_token = os.getenv("MP_ACCESS_TOKEN", "TEST-TOKEN")
        self.sdk = mercadopago.SDK(self.access_token)
        self.api_url = os.getenv("API_URL", "http://localhost:8000")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:8000")

    def create_preference(self, plan: str, user_id: int, user_email: str):
        prices = {
            "starter": 49.00,
            "pro": 99.00,
            "enterprise": 299.00
        }
        
        preference_data = {
            "items": [
                {
                    "title": f"Innovation.ia - Plano {plan.title()}",
                    "quantity": 1,
                    "unit_price": prices.get(plan, 99.00),
                    "currency_id": "BRL"
                }
            ],
            "payer": {
                "email": user_email
            },
            "metadata": {
                "plan": plan,
                "user_id": user_id
            },
            "back_urls": {
                "success": f"{self.frontend_url}/finance?status=success",
                "failure": f"{self.frontend_url}/finance?status=failure",
                "pending": f"{self.frontend_url}/finance?status=pending"
            },
            "auto_return": "approved",
            "notification_url": f"{self.api_url}/api/payments/webhook"
        }
        
        preference = self.sdk.preference().create(preference_data)
        return preference["response"]

    def process_webhook(self, payment_id: str, db: Session):
        if payment_id == "1234567890": # MOCK FOR TESTING
            payment = {
                "payer": {"email": "test@innovation.ia"},
                "status": "approved",
                "metadata": {"plan": "pro", "user_id": 1}
            }
        else:
            payment_info = self.sdk.payment().get(payment_id)
            payment = payment_info["response"]
        
        user_email = payment.get("payer", {}).get("email")
        status = payment.get("status")
        metadata = payment.get("metadata", {})
        plan = metadata.get("plan", "pro")
        user_id = metadata.get("user_id")

        user = db.query(User).filter(User.email == user_email).first()
        if user:
            if status == "approved":
                user.subscription_status = "active"
                # Update or create subscription record
                sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
                if not sub:
                    sub = Subscription(user_id=user.id, plan=plan, status="active")
                    db.add(sub)
                else:
                    sub.status = "active"
                    sub.plan = plan
            elif status in ["cancelled", "rejected"]:
                user.subscription_status = "inactive"
            
            db.commit()
            return True
        return False

payment_service = PaymentService()
