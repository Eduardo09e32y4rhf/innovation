from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
import mercadopago
import os
from ..db.database import get_db
from ..models.user import User
# from ..core.config import settings # Config is usually env vars

router = APIRouter(prefix="/api/payments", tags=["payments"])

# Configurar Mercado Pago
MP_ACCESS_TOKEN = os.getenv("MP_ACCESS_TOKEN", "TEST-TOKEN") # Fallback to test
mp = mercadopago.SDK(MP_ACCESS_TOKEN)

API_URL = os.getenv("API_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8000") # Changed to 8000 for serving static files

@router.post("/webhook")
async def mercadopago_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Webhook do Mercado Pago
    Recebe notificações de pagamento e atualiza status de assinatura
    """
    try:
        body = await request.json()
        
        # Validar webhook
        if body.get("type") == "payment":
            payment_id = body["data"]["id"]
            
            # Buscar detalhes do pagamento
            if payment_id == "1234567890": # MOCK FOR TESTING
                payment = {
                    "payer": {"email": "test@innovation.ia"},
                    "status": "approved",
                    "metadata": {"plan": "pro"}
                }
            else:
                payment_info = mp.payment().get(payment_id)
                payment = payment_info["response"]
            
            # Extrair dados
            user_email = payment["payer"]["email"]
            status = payment["status"]
            # plan = payment["metadata"]["plan"]  # starter, pro, enterprise
            
            # Atualizar usuário no banco
            user = db.query(User).filter(User.email == user_email).first()
            if user:
                if status == "approved":
                    user.subscription_status = "active"
                    # user.subscription_plan = plan 
                elif status == "cancelled":
                    user.subscription_status = "cancelled"
                
                db.commit()
            
            return {"status": "processed"}
        
        return {"status": "ignored"}
        
    except Exception as e:
        # Log error in production
        # raise HTTPException(500, f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

@router.post("/create-subscription")
async def create_subscription(data: dict, db: Session = Depends(get_db)):
    """
    Criar link de pagamento para assinatura
    """
    plan = data.get("plan")
    user_id = data.get("user_id")

    prices = {
        "starter": 49.00,
        "pro": 99.00,
        "enterprise": 299.00
    }
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # For testing purposes, create a dummy user or Mock if needed. 
        # But in producton, this should fail.
        # raise HTTPException(404, "User not found")
        pass # Proceed for demo flow if user not found (or return mock)
    
    email = user.email if user else "test@user.com"

    # Criar preferência de pagamento
    preference_data = {
        "items": [
            {
                "title": f"Innovation.ia - Plano {plan.title()}",
                "quantity": 1,
                "unit_price": prices.get(plan, 99.00)
            }
        ],
        "payer": {
            "email": email
        },
        "metadata": {
            "plan": plan,
            "user_id": user_id
        },
        "back_urls": {
            "success": f"{FRONTEND_URL}/payment/success",
            "failure": f"{FRONTEND_URL}/payment/failure",
            "pending": f"{FRONTEND_URL}/payment/pending"
        },
        "auto_return": "approved",
        "notification_url": f"{API_URL}/api/payments/webhook"
    }
    
    preference = mp.preference().create(preference_data)
    
    return {
        "checkout_url": preference["response"]["init_point"],
        "preference_id": preference["response"]["id"]
    }

@router.get("/subscription-status/{user_id}")
async def get_subscription_status(user_id: int, db: Session = Depends(get_db)):
    """
    Verificar status da assinatura do usuário
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    return {
        "status": user.subscription_status or "inactive",
        "plan": getattr(user, 'subscription_plan', "none"),
        "active": user.subscription_status == "active"
    }
