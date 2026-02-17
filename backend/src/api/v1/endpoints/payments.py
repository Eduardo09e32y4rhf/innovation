import mercadopago
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from core.config import settings
from infrastructure.database.sql.dependencies import get_db
from domain.models.user import User
from api.v1.endpoints.auth import get_current_user
from typing import Optional

router = APIRouter(prefix="/api/payments", tags=["payments"])

# Inicializa o SDK
# Use the token from settings, fallback to empty string if not set to avoid crash on init,
# but API calls will fail if token is invalid.
sdk = mercadopago.SDK(settings.MP_ACCESS_TOKEN or "TEST-TOKEN")


# 1. CRIA O LINK DE ASSINATURA (PREAPPROVAL)
@router.post("/create-subscription/{plan_type}")
async def create_subscription(
    plan_type: str, current_user: User = Depends(get_current_user)
):
    """
    Cria uma assinatura (Preapproval) no Mercado Pago.
    Retorna a URL de checkout (init_point) para o usuário autorizar.
    """

    # Preços (Isso poderia vir do banco)
    prices = {"starter": 29.90, "pro": 99.90, "enterprise": 499.90}
    price = prices.get(plan_type, 29.90)

    # Base URL logic: prefer the one from settings (which comes from env/ngrok)
    base_url = settings.BASE_URL

    # Dados da Assinatura (Preapproval)
    # Docs: https://www.mercadopago.com.br/developers/pt/reference/subscriptions/_preapproval/post
    preapproval_data = {
        "reason": f"Plano {plan_type.title()} - Innovation.ia",
        "external_reference": str(current_user.id),
        "payer_email": current_user.email,
        "auto_recurring": {
            "frequency": 1,
            "frequency_type": "months",
            "transaction_amount": float(price),
            "currency_id": "BRL"
        },
        "back_url": f"{base_url}/dashboard",
        "status": "pending",
    }

    try:
        # Cria a assinatura
        preapproval_response = sdk.preapproval().create(preapproval_data)
        response = preapproval_response["response"]

        # O link de checkout para assinatura
        init_point = response.get("init_point")

        if not init_point:
             # Fallback ou erro
             print(f"Erro MP Response: {response}")
             raise HTTPException(status_code=500, detail="Não foi possível gerar o link de assinatura.")

        return {"checkout_url": init_point}
    except Exception as e:
        print(f"Erro ao criar assinatura: {e}")
        raise HTTPException(
            status_code=500, detail="Erro ao comunicar com Mercado Pago"
        )


# 2. RECEBE A CONFIRMAÇÃO (WEBHOOK)
@router.post("/webhook")
async def mp_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Recebe notificações do Mercado Pago.
    Processa 'subscription_preapproval' para ativar o plano do usuário.
    """
    try:
        data = await request.json()
    except Exception:
        return {"status": "ignored_no_json"}

    # Mercado Pago envia notificações de subscription_preapproval ou payment
    # Verificamos o type ou topic

    event_type = data.get("type")
    entity_id = data.get("data", {}).get("id")

    if event_type == "subscription_preapproval" and entity_id:
        # Consulta o status da assinatura
        try:
            preapproval_info = sdk.preapproval().get(entity_id)

            if preapproval_info["status"] == 200:
                response = preapproval_info["response"]
                status = response["status"]
                external_ref = response["external_reference"]  # ID do usuário

                # Status de assinatura ativa é 'authorized'
                if status == "authorized":
                    user = db.query(User).filter(User.id == int(external_ref)).first()
                    if user:
                        user.subscription_status = "active"
                        user.is_active = True

                        # Atualiza plano baseado no valor (lógica simples de exemplo)
                        amount = float(response["auto_recurring"]["transaction_amount"])
                        if amount >= 400:
                            user.subscription_plan = "enterprise"
                        elif amount >= 90:
                            user.subscription_plan = "pro"
                        else:
                            user.subscription_plan = "starter"

                        db.commit()
                        print(f"✅ Assinatura confirmada! Usuário {user.email} agora é {user.subscription_plan.upper()}.")
        except Exception as e:
            print(f"Erro processando webhook MP: {e}")

    return {"status": "received"}
