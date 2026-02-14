import requests
import json

# URL do Webhook (Localhost)
WEBHOOK_URL = "http://localhost:8000/api/payments/webhook"

# Payload simulando um pagamento aprovado do Mercado Pago
payload = {
    "action": "payment.created",
    "api_version": "v1",
    "data": {
        "id": "1234567890" # Mock ID
    },
    "date_created": "2023-10-27T10:00:00Z",
    "id": 123456,
    "live_mode": False,
    "type": "payment",
    "user_id": 12345
}

# Como não temos o Mercado Pago real para confirmar o ID, 
# a nossa API vai tentar buscar, falhar, e provavelmente dar erro.
# Precisamos ajustar o payments.py para aceitar MOCK se estiver em ambiente de teste,
# OU mockar a chamada do SDK do Mercado Pago.
#
# Para este teste, vamos assumir que queremos testar a rota.
# No entanto, o `payments.py` faz `mp.payment().get(payment_id)`.
# Sem um ID real, isso falha.
# Vou criar um script que faz o patch do SDK ou acessa o DB diretamente para simular o resultado?
# Melhor: O User pediu "Simular uma transação".
# Vou criar um script que loga como admin e "força" a aprovação ou 
# MOCKA a resposta da API do Mercado Pago dentro do teste.

print("🚀 Enviando Webhook Simulado...")

try:
    # Nota: O endpoint atual vai tentar conectar no Mercado Pago Real e falhar com esse ID falso.
    # Mas vamos enviar para ver o log.
    response = requests.post(WEBHOOK_URL, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Erro ao conectar: {e}")
