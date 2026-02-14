import mercadopago
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from core.config import settings
from infrastructure.database.sql.dependencies import get_db
from domain.models.user import User
from api.v1.endpoints.auth import get_current_user # Ajuste conforme autenticação

router = APIRouter(prefix="/api/payments", tags=["payments"])

# Inicializa o SDK
# Use the token from settings, fallback to empty string if not set to avoid crash on init, 
# but API calls will fail if token is invalid.
sdk = mercadopago.SDK(settings.MP_ACCESS_TOKEN or "TEST-TOKEN")

# 1. CRIA O LINK DE PAGAMENTO
@router.post("/create-preference/{plan_type}")
async def create_preference(plan_type: str, current_user: User = Depends(get_current_user)):
    
    # Preços (Isso poderia vir do banco)
    prices = {"starter": 29.90, "pro": 99.90, "enterprise": 499.90}
    price = prices.get(plan_type, 29.90)

    # Base URL logic: prefer the one from settings (which comes from env/ngrok)
    base_url = settings.BASE_URL

    preference_data = {
        "items": [
            {
                "id": plan_type,
                "title": f"Plano {plan_type.title()} - Innovation.ia",
                "quantity": 1,
                "currency_id": "BRL",
                "unit_price": float(price)
            }
        ],
        "payer": {
            "email": current_user.email,
            "name": current_user.full_name or "Usuario"
        },
        "back_urls": {
            # Para onde o usuário volta depois de pagar
            "success": f"{base_url}/dashboard?status=success",
            "failure": f"{base_url}/dashboard?status=failure",
            "pending": f"{base_url}/dashboard?status=pending"
        },
        "auto_return": "approved",
        "notification_url": f"{base_url}/api/payments/webhook", # ONDE O MP VAI AVISAR
        "external_reference": str(current_user.id) # ID do usuário para sabermos quem pagou
    }

    try:
        preference_response = sdk.preference().create(preference_data)
        preference = preference_response["response"]
        return {"checkout_url": preference["init_point"]} # O link para o front abrir
    except Exception as e:
        print(f"Erro ao criar preferência: {e}")
        raise HTTPException(status_code=500, detail="Erro ao comunicar com Mercado Pago")

# 2. RECEBE A CONFIRMAÇÃO (WEBHOOK)
@router.post("/webhook")
async def mp_webhook(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
    except Exception:
         # Mercado Pago sometimes sends data as query params or other formats, 
         # but for 'payment' notifications usually it's JSON payload or we need to query by ID.
         # If JSON fails, check query params
         return {"status": "ignored_no_json"}

    # Action might be in query params? 
    # Mercado Pago standard: POST to URL with ?topic=payment&id=123... OR JSON body using types.
    # New webhook v2 uses 'type': 'payment' in body.
    
    if data.get("type") == "payment":
        payment_id = data.get("data", {}).get("id")
        
        if payment_id:
            # Consulta o Mercado Pago para ver o status real
            payment_info = sdk.payment().get(payment_id)
            
            if payment_info["status"] == 200:
                response = payment_info["response"]
                status = response["status"]
                external_ref = response["external_reference"] # Pegamos o ID do usuário de volta
                
                if status == "approved":
                    # Atualiza o usuário no banco
                    user = db.query(User).filter(User.id == int(external_ref)).first()
                    if user:
                        user.subscription_plan = "pro" # Simplificação: Ideal seria mapear produto -> plano
                        user.subscription_status = "active"
                        user.is_active = True
                        db.commit()
                        print(f"✅ Pagamento confirmado! Usuário {user.email} agora é PRO.")
                
    return {"status": "received"}
