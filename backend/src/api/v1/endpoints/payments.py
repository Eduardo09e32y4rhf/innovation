import mercadopago
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from core.config import settings
from infrastructure.database.sql.dependencies import get_db
from domain.models.user import User
from api.v1.endpoints.auth import get_current_user  # Ajuste conforme autenticação

router = APIRouter(prefix="/api/payments", tags=["payments"])

# Inicializa o SDK
sdk = mercadopago.SDK(settings.MP_ACCESS_TOKEN or "TEST-TOKEN")


# 1. CRIA A ASSINATURA (PREAPPROVAL)
@router.post("/create-subscription/{plan_type}")
async def create_subscription(
    plan_type: str, current_user: User = Depends(get_current_user)
):
    """
    Cria uma assinatura (recorrência) no Mercado Pago.
    O cliente paga mensalmente (Streaming style).
    """

    # Preços mensais
    prices = {"starter": 29.90, "pro": 99.90, "enterprise": 499.90}
    price = prices.get(plan_type, 29.90)

    base_url = settings.BASE_URL

    # Dados da Assinatura (Preapproval)
    # https://www.mercadopago.com.br/developers/en/reference/preapproval/create
    subscription_data = {
        "reason": f"Assinatura Innovation.ia - Plano {plan_type.title()}",
        "external_reference": str(current_user.id),
        "payer_email": current_user.email,
        "auto_recurring": {
            "frequency": 1,
            "frequency_type": "months",
            "transaction_amount": float(price),
            "currency_id": "BRL",
        },
        "back_url": f"{base_url}/dashboard?status=success",
        "status": "pending",
        # Metadata não é suportado diretamente no create do preapproval da mesma forma que preference,
        # mas podemos confiar no external_reference para achar o usuário.
    }

    try:
        # Cria a assinatura
        subscription_response = sdk.preapproval().create(subscription_data)
        response = subscription_response["response"]

        # O link de checkout para assinatura
        init_point = response.get("init_point")

        return {"checkout_url": init_point}
    except Exception as e:
        print(f"Erro ao criar assinatura: {e}")
        raise HTTPException(
            status_code=500, detail="Erro ao comunicar com Mercado Pago"
        )


# 2. RECEBE A CONFIRMAÇÃO (WEBHOOK)
@router.post("/webhook")
async def mp_webhook(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
    except Exception:
        return {"status": "ignored_no_json"}

    event_type = data.get("type")

    # -----------------------------------------------------------
    # CASO 1: Atualização de Assinatura (subscription_preapproval)
    # -----------------------------------------------------------
    if event_type == "subscription_preapproval":
        preapproval_id = data.get("data", {}).get("id")
        if preapproval_id:
            # Consulta o status atual da assinatura
            sub_info = sdk.preapproval().get(preapproval_id)
            if sub_info["status"] == 200:
                resp = sub_info["response"]
                status = resp["status"]  # authorized, paused, cancelled
                external_ref = resp["external_reference"]

                if status == "authorized":
                    user = db.query(User).filter(User.id == int(external_ref)).first()
                    if user:
                        # Deduzimos o plano pelo valor ou pelo reason, simplificado aqui:
                        reason = resp.get("reason", "").lower()
                        plan = "starter"
                        if "pro" in reason:
                            plan = "pro"
                        elif "enterprise" in reason:
                            plan = "enterprise"

                        user.subscription_plan = plan
                        user.subscription_status = "active"
                        user.is_active = True
                        db.commit()
                        print(f"✅ Assinatura Ativa! Usuário {user.email} -> {plan}")

    # -----------------------------------------------------------
    # CASO 2: Pagamento Recorrente (payment)
    # -----------------------------------------------------------
    elif event_type == "payment":
        payment_id = data.get("data", {}).get("id")
        if payment_id:
            payment_info = sdk.payment().get(payment_id)
            if payment_info["status"] == 200:
                resp = payment_info["response"]
                status = resp["status"]
                external_ref = resp.get("external_reference")

                if status == "approved" and external_ref:
                    # Se for um pagamento avulso ou recorrência cobrada com sucesso
                    user = db.query(User).filter(User.id == int(external_ref)).first()
                    if user:
                        user.subscription_status = "active"
                        user.is_active = True
                        db.commit()
                        print(f"✅ Pagamento confirmado para {user.email}")

    return {"status": "received"}
