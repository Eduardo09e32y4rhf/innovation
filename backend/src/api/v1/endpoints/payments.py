from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from infrastructure.database.sql.dependencies import get_db
from domain.models.user import User
from domain.models.subscription import Subscription
from domain.models.company import Company
from api.v1.endpoints.auth import get_current_user
from services.asaas_service import asaas_service

router = APIRouter(prefix="/api/payments", tags=["payments"])


class CheckoutRequest(BaseModel):
    plan: str


# 0. CHECKOUT UNIFICADO (usado pela página /pricing)
@router.post("/checkout")
async def checkout(
    data: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cria preferência e retorna init_point para a página de pricing."""
    prices = {"starter": 299.0, "growth": 799.0, "enterprise": 1999.0}
    price = prices.get(data.plan.lower())
    if not price:
        raise HTTPException(status_code=400, detail="Plano inválido")

    # Integration with Asaas
    try:
        # Determine due date (example: +7 days)
        import datetime

        due_date = (datetime.datetime.now() + datetime.timedelta(days=7)).strftime(
            "%Y-%m-%d"
        )

        # Process the customer and generate subscription via AsaasService
        response = asaas_service.assinar_plano(
            current_user, data.plan, price, due_date, db
        )

        return {
            "invoiceUrl": response.get("invoiceUrl"),
            "plan": data.plan,
            "price": price,
        }
    except Exception as e:
        print(f"Erro interno no Asaas: {e}")
        raise HTTPException(
            status_code=500, detail="Erro interno ao processar o pagamento."
        )


# 1. CRIA O LINK DE PAGAMENTO (legacy route)
@router.post("/create-preference/{plan_type}")
async def create_preference(
    plan_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cria uma assinatura (Preapproval) no Mercado Pago.
    Retorna a URL de checkout (init_point) para o usuário autorizar.
    """

    # Preços (Isso poderia vir do banco)
    prices = {"starter": 29.90, "pro": 99.90, "enterprise": 499.90}
    price = prices.get(plan_type, 29.90)

    # Integration with Asaas
    try:
        import datetime

        due_date = (datetime.datetime.now() + datetime.timedelta(days=7)).strftime(
            "%Y-%m-%d"
        )
        response = asaas_service.assinar_plano(
            current_user, plan_type, price, due_date, db
        )

        # O link de checkout para fatura/assinatura
        invoice_url = response.get("invoiceUrl")
        payment_id = response.get("id")

        if not invoice_url:
            raise HTTPException(
                status_code=500, detail="Não foi possível gerar o link de assinatura."
            )

        return {"checkout_url": invoice_url, "payment_id": payment_id}
    except Exception as e:
        print(f"Erro ao criar assinatura no Asaas: {e}")
        raise HTTPException(status_code=500, detail="Erro ao comunicar com Asaas")


# 2. RECEBE A CONFIRMAÇÃO (WEBHOOK ASAAS)
@router.post("/webhook")
async def asaas_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Recebe notificações do Asaas.
    Processa eventos como PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE, PAYMENT_REFUNDED.
    """
    try:
        data = await request.json()
    except Exception:
        return {"status": "ignored_no_json"}

    # Signature Verification para Asaas
    asaas_token = request.headers.get("asaas-access-token")

    import os
    import secrets

    expected_token = os.getenv("ASAAS_WEBHOOK_TOKEN")

    if not expected_token:
        print(
            "⚠️ ASAAS_WEBHOOK_TOKEN não configurado. Rejeitando requisição por segurança."
        )
        raise HTTPException(status_code=500, detail="Erro de configuração interna")

    if not asaas_token or not secrets.compare_digest(asaas_token, expected_token):
        print("⚠️ Token de Webhook do Asaas inválido ou ausente.")
        raise HTTPException(status_code=401, detail="Token Asaas inválido")

    event = data.get("event")
    payment_data = data.get("payment", {})
    external_ref = payment_data.get("externalReference")
    status = payment_data.get("status")

    if not external_ref:
        return {"status": "ignored_no_external_reference"}

    user = db.query(User).filter(User.id == int(external_ref)).first()
    if not user:
        return {"status": "ignored_user_not_found"}

    try:
        # Quando a assinatura é criada/atualizada
        if event in ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]:
            user.subscription_status = "active"
            user.is_active = True

            # Extract basic plan info based on value if possible, default to BASIC
            amount = float(payment_data.get("value", 0))
            plan_name = "BASIC"
            if amount >= 199.0:
                plan_name = "COMPLETE"
            elif amount == 0:
                plan_name = "FREE"

            user.subscription_plan = plan_name
            print(
                f"✅ Pagamento Asaas recebido/confirmado para user {user.id} -> Plano: {plan_name}"
            )

            # Atualiza assinatura na tabela
            company = db.query(Company).filter(Company.owner_user_id == user.id).first()
            company_id = company.id if company else 1

            # Aqui deveriamos pegar o plan_id correspondente
            # (simplificando para ID estático baseado no valor, o ideal eh dar match no nome)

            sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
            if not sub:
                sub = Subscription(
                    user_id=user.id,
                    company_id=company_id,
                    plan_id=1,  # Default, you might want to fetch the real plan.id
                    asaas_subscription_id=payment_data.get("subscription")
                    or payment_data.get("id"),
                    status="active",
                )
                db.add(sub)
            else:
                sub.status = "active"
                sub.asaas_subscription_id = payment_data.get(
                    "subscription"
                ) or payment_data.get("id")

        elif event in ["PAYMENT_OVERDUE", "SUBSCRIPTION_DELETED", "PAYMENT_REFUNDED"]:
            status_map = {
                "PAYMENT_OVERDUE": "overdue",
                "SUBSCRIPTION_DELETED": "cancelled",
                "PAYMENT_REFUNDED": "refunded",
            }
            new_status = status_map.get(event, "inactive")

            user.subscription_status = new_status
            user.subscription_plan = "FREE"
            if event == "SUBSCRIPTION_DELETED":
                # For cancelation, keep active until cycle ends? For simplicity, immediate fallback to FREE
                user.is_active = True  # O usuario continua ativo no sistema, so no plano FREE (ou False dependo do negocio)
            else:
                user.is_active = False

            sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
            if sub:
                sub.status = new_status
            print(
                f"⚠️ Evento Asaas '{event}' para user {user.id} -> Downgrade para FREE."
            )

        db.commit()

    except Exception as e:
        print(f"Erro processando webhook Asaas: {e}")
        db.rollback()

    return {"status": "received"}
