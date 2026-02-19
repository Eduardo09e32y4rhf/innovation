import mercadopago
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from core.config import settings
from infrastructure.database.sql.dependencies import get_db
from domain.models.user import User
from domain.models.subscription import Subscription
from domain.models.company import Company
from api.v1.endpoints.auth import get_current_user
from typing import Optional

router = APIRouter(prefix="/api/payments", tags=["payments"])

# Initialize SDK
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
            "currency_id": "BRL",
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
        preapproval_id = response.get("id")

        if not init_point:
            # Fallback ou erro
            print(f"Erro MP Response: {response}")
            raise HTTPException(
                status_code=500, detail="Não foi possível gerar o link de assinatura."
            )

        return {"checkout_url": init_point, "preapproval_id": preapproval_id}
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
    Processa 'subscription_preapproval' e 'payment' para ativar o plano do usuário.
    """
    try:
        data = await request.json()
    except Exception:
        return {"status": "ignored_no_json"}

    # Mercado Pago envia notificações de subscription_preapproval ou payment
    # Verificamos o type, action ou topic

    event_type = data.get("type")
    action = data.get("action")
    entity_id = data.get("data", {}).get("id")

    # Alguns webhooks mandam id direto no data sem aninhamento ou vice-versa,
    # mas o padrao V1 costuma ser data: { id: ... }

    # ---------------------------------------------------
    # 1. SUBSCRIPTION PREAPPROVAL (Assinatura Recorrente)
    # ---------------------------------------------------
    if event_type == "subscription_preapproval" and entity_id:
        try:
            preapproval_info = sdk.preapproval().get(entity_id)

            if preapproval_info["status"] == 200:
                response = preapproval_info["response"]
                status = response["status"]
                external_ref = response["external_reference"]  # ID do usuário

                # Valor para definir plano
                transaction_amount = response.get("auto_recurring", {}).get(
                    "transaction_amount", 0
                )
                amount = float(transaction_amount)

                # Busca usuário
                user = db.query(User).filter(User.id == int(external_ref)).first()

                if user:
                    # Lógica de definição do plano baseada no valor
                    # Ajuste conforme seus preços reais
                    # prices = {"starter": 29.90, "pro": 99.90, "enterprise": 499.90}
                    plan_id = 1  # Default (Starter)
                    plan_name = "starter"

                    if amount >= 400:
                        plan_id = 3  # Enterprise
                        plan_name = "enterprise"
                    elif amount >= 90:
                        plan_id = 2  # Pro
                        plan_name = "pro"

                    # Se autorizado, ativa
                    if status == "authorized":
                        user.subscription_status = "active"
                        user.is_active = True
                        user.subscription_plan = plan_name
                    else:
                        # Se cancelado, pendente, etc.
                        user.subscription_status = status

                    # Atualiza ou cria registro na tabela Subscription
                    # Tenta achar a company do usuário
                    company = (
                        db.query(Company)
                        .filter(Company.owner_user_id == user.id)
                        .first()
                    )
                    # Fallback de company_id = 1 se não achar (para evitar erro de constraint se aplicável)
                    company_id = company.id if company else 1

                    sub = (
                        db.query(Subscription)
                        .filter(Subscription.user_id == user.id)
                        .first()
                    )

                    if not sub:
                        sub = Subscription(
                            user_id=user.id,
                            company_id=company_id,
                            plan_id=plan_id,
                            mp_preapproval_id=entity_id,
                            status=status,
                        )
                        db.add(sub)
                    else:
                        sub.status = status
                        sub.mp_preapproval_id = entity_id
                        sub.plan_id = plan_id
                        # Atualizamos o company_id? Talvez não precise, mas se mudou...
                        # sub.company_id = company_id

                    db.commit()
                    print(
                        f"✅ Assinatura confirmada/atualizada! Usuário {user.email}: {status} ({plan_name})."
                    )

        except Exception as e:
            print(f"Erro processando webhook MP (subscription): {e}")

    # ---------------------------------------------------
    # 2. PAYMENT (Pagamento Avulso ou Fatura da Assinatura)
    # ---------------------------------------------------
    elif (action == "payment.created" or event_type == "payment") and entity_id:
        try:
            payment_info = sdk.payment().get(entity_id)
            if payment_info["status"] == 200:
                response = payment_info["response"]
                status = response["status"]
                external_ref = response.get("external_reference")

                if status == "approved" and external_ref:
                    # Garante que usuário está ativo
                    user = db.query(User).filter(User.id == int(external_ref)).first()
                    if user:
                        user.subscription_status = "active"
                        user.is_active = True
                        # Aqui não temos como saber o plano só pelo pagamento facilmente,
                        # a menos que busquemos a assinatura associada ou metadata.
                        # Mas o preapproval webhook já deve ter cuidado disso.
                        # Este bloco serve como redundância ou para pagamentos avulsos.
                        db.commit()
                        print(f"✅ Pagamento aprovado para user {user.id}")

        except Exception as e:
            print(f"Erro processando webhook MP (payment): {e}")

    return {"status": "received"}
