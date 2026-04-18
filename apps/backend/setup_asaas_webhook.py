#!/usr/bin/env python3
"""
setup_asaas_webhook.py — Registra o webhook no Asaas via API
============================================================
Execute após configurar ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN e ASAAS_WEBHOOK_URL no .env

Uso:
  cd backend
  python setup_asaas_webhook.py

O script irá:
  1. Verificar as variáveis obrigatórias
  2. Listar webhooks existentes para evitar duplicatas
  3. Criar o webhook com todos os eventos necessários
  4. Confirmar o registro
"""

import os
import sys
import json
import requests
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Carrega .env
try:
    from dotenv import load_dotenv

    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass

ASAAS_API_KEY = os.getenv("ASAAS_API_KEY", "")
ASAAS_API_URL = os.getenv("ASAAS_API_URL", "https://api.asaas.com/v3")
ASAAS_WEBHOOK_TOKEN = os.getenv("ASAAS_WEBHOOK_TOKEN", "")
ASAAS_WEBHOOK_URL = os.getenv("ASAAS_WEBHOOK_URL", "")
BASE_URL = os.getenv("BASE_URL", "")

# Inferir URL do webhook se não configurada
if not ASAAS_WEBHOOK_URL and BASE_URL:
    ASAAS_WEBHOOK_URL = f"{BASE_URL.rstrip('/')}/api/payments/webhook"

# Todos os eventos que o sistema trata
WEBHOOK_EVENTS = [
    "PAYMENT_CONFIRMED",  # Pagamento confirmado → ativa plano
    "PAYMENT_RECEIVED",  # Pagamento recebido → ativa plano
    "PAYMENT_OVERDUE",  # Pagamento vencido → bloqueia acesso
    "PAYMENT_DELETED",  # Cobrança deletada → cancela assinatura
    "SUBSCRIPTION_DELETED",  # Assinatura cancelada → rebaixa para FREE
    "PAYMENT_REFUNDED",  # Estorno → rebaixa para FREE
    "PAYMENT_CHARGEBACK_REQUESTED",  # Chargeback → bloqueia + alerta admin
    "PAYMENT_CHARGEBACK_DISPUTE",  # Disputa de chargeback em andamento
]

HEADERS = {
    "access_token": ASAAS_API_KEY,
    "Content-Type": "application/json",
}

print("=" * 60)
print("  Innovation.ia — Registro de Webhook no Asaas")
print("=" * 60)
print()


def check_config():
    """Verifica se todas as variáveis necessárias estão configuradas."""
    errors = []

    if not ASAAS_API_KEY:
        errors.append("ASAAS_API_KEY não configurada no .env")

    if not ASAAS_WEBHOOK_TOKEN:
        errors.append("ASAAS_WEBHOOK_TOKEN não configurada no .env")

    if not ASAAS_WEBHOOK_URL:
        errors.append(
            "ASAAS_WEBHOOK_URL não configurada no .env\n"
            "   Exemplo: ASAAS_WEBHOOK_URL=https://api.seudominio.com.br/api/payments/webhook"
        )
    elif "localhost" in ASAAS_WEBHOOK_URL:
        print("⚠️  AVISO: ASAAS_WEBHOOK_URL aponta para localhost.")
        print("   Para testes locais, use ngrok: https://ngrok.com")
        print(f"   URL atual: {ASAAS_WEBHOOK_URL}")
        print()

    if errors:
        print("❌ Configuração incompleta:\n")
        for e in errors:
            print(f"   • {e}")
        print()
        print("   Verifique o arquivo .env ou use .env.production.example como guia.")
        sys.exit(1)

    is_sandbox = "sandbox.asaas.com" in ASAAS_API_URL
    env_name = "SANDBOX 🧪" if is_sandbox else "PRODUÇÃO 🚀"

    print(f"📋 Configuração detectada:")
    print(f"   Ambiente: {env_name}")
    print(f"   API URL:  {ASAAS_API_URL}")
    print(f"   Webhook:  {ASAAS_WEBHOOK_URL}")
    print(f"   Token:    {'*' * min(len(ASAAS_WEBHOOK_TOKEN), 8)}...")
    print()


def list_existing_webhooks() -> list:
    """Lista webhooks já registrados para evitar duplicatas."""
    print("🔍 Verificando webhooks existentes...")
    try:
        res = requests.get(f"{ASAAS_API_URL}/webhooks", headers=HEADERS, timeout=15)
        if res.status_code == 200:
            data = res.json()
            webhooks = data.get("data", [])
            if webhooks:
                print(f"   Encontrados {len(webhooks)} webhook(s) já registrado(s):")
                for wh in webhooks:
                    status = "✅ ativo" if wh.get("enabled") else "⛔ inativo"
                    print(f"   • {wh.get('url')} [{status}] (id: {wh.get('id')})")
                print()
            else:
                print("   Nenhum webhook registrado ainda.")
            return webhooks
        else:
            print(
                f"   ⚠️  Erro ao listar webhooks: {res.status_code} — {res.text[:200]}"
            )
            return []
    except requests.RequestException as e:
        print(f"   ❌ Erro de rede: {e}")
        return []


def create_webhook(existing: list) -> bool:
    """Cria o webhook no Asaas."""
    # Verifica se já existe webhook para a mesma URL
    for wh in existing:
        if wh.get("url") == ASAAS_WEBHOOK_URL:
            print(f"✅ Webhook já registrado para esta URL (id: {wh.get('id')})")
            print(
                "   Atualizando eventos para garantir que todos estão configurados..."
            )
            return update_webhook(wh["id"])

    print(f"📡 Criando novo webhook...")
    print(f"   URL: {ASAAS_WEBHOOK_URL}")
    print(f"   Eventos: {', '.join(WEBHOOK_EVENTS)}")
    print()

    payload = {
        "name": "Innovation.ia — Pagamentos",
        "url": ASAAS_WEBHOOK_URL,
        "email": os.getenv("SMTP_USER", ""),
        "enabled": True,
        "interrupted": False,
        "apiVersion": 3,
        "authToken": ASAAS_WEBHOOK_TOKEN,
        "sendType": "NON_SEQUENTIALLY",  # Envio em paralelo (mais rápido)
        "events": WEBHOOK_EVENTS,
    }

    try:
        res = requests.post(
            f"{ASAAS_API_URL}/webhooks",
            headers=HEADERS,
            json=payload,
            timeout=20,
        )

        if res.status_code in (200, 201):
            data = res.json()
            print(f"✅ Webhook criado com sucesso!")
            print(f"   ID: {data.get('id')}")
            print(f"   Status: {'ativo' if data.get('enabled') else 'inativo'}")
            return True
        else:
            print(f"❌ Erro ao criar webhook: {res.status_code}")
            print(f"   Resposta: {res.text[:500]}")
            print()
            print("   Possíveis causas:")
            print("   • ASAAS_API_KEY inválida ou sem permissão WEBHOOK:WRITE")
            print("   • URL do webhook não acessível publicamente")
            print("   • Conta Asaas em modo de avaliação")
            return False

    except requests.RequestException as e:
        print(f"❌ Erro de rede ao criar webhook: {e}")
        return False


def update_webhook(webhook_id: str) -> bool:
    """Atualiza eventos de um webhook existente."""
    payload = {
        "events": WEBHOOK_EVENTS,
        "url": ASAAS_WEBHOOK_URL,
        "authToken": ASAAS_WEBHOOK_TOKEN,
        "enabled": True,
    }
    try:
        res = requests.put(
            f"{ASAAS_API_URL}/webhooks/{webhook_id}",
            headers=HEADERS,
            json=payload,
            timeout=20,
        )
        if res.status_code == 200:
            print("✅ Webhook atualizado com todos os eventos!")
            return True
        else:
            print(
                f"⚠️  Não foi possível atualizar ({res.status_code}): {res.text[:300]}"
            )
            return False
    except Exception as e:
        print(f"❌ Erro ao atualizar webhook: {e}")
        return False


def show_test_instructions():
    """Exibe como testar o webhook após o registro."""
    is_sandbox = "sandbox.asaas.com" in ASAAS_API_URL
    print()
    print("=" * 60)
    print("  📋 Como testar o webhook")
    print("=" * 60)
    print()

    if is_sandbox:
        print("Você está no SANDBOX. Para simular um pagamento:")
        print()
        print("1. Acesse o painel Sandbox do Asaas")
        print("2. Crie uma cobrança de teste")
        print("3. Use o cartão de teste: 5162306219378829 CVV: 318 Validade: 05/2050")
        print("4. Confirme o pagamento")
        print(
            "5. Verifique os logs do backend — o evento PAYMENT_CONFIRMED deve aparecer"
        )
        print()
        print("Ou force o disparo via API Asaas Sandbox:")
        print(f"  POST {ASAAS_API_URL}/payments/{{id}}/receiveInCash")
    else:
        print("Você está em PRODUÇÃO.")
        print(
            "Os eventos serão disparados automaticamente quando houver transações reais."
        )
        print()
        print("Para verificar se o webhook está funcionando:")
        print("  → Painel Asaas → Configurações → Webhooks → Logs")


if __name__ == "__main__":
    check_config()
    existing = list_existing_webhooks()
    success = create_webhook(existing)
    if success:
        show_test_instructions()
    else:
        print(
            "\n❌ Webhook não registrado. Verifique os erros acima e tente novamente."
        )
        sys.exit(1)
