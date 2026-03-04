from typing import List, Dict, Any
import requests
import os
from sqlalchemy.orm import Session
from domain.models.finance import Transaction
from datetime import datetime, timedelta
from decimal import Decimal


class BankHubService:
    def __init__(self):
        # Em produção, estas chaves viriam do AWS Secrets Manager ou .env
        self.belvo_secret = os.getenv("BELVO_SECRET", "sandbox_key")
        self.pluggy_id = os.getenv("PLUGGY_ID", "sandbox_client")

    async def get_consolidated_balance(self, company_id: int) -> Dict[str, Any]:
        """Consolida saldos de múltiplos bancos (Simulado via Sandbox)."""
        # Aqui integraríamos com as APIs reais da Belvo/Pluggy
        mock_balances = [
            {
                "bank": "Inter",
                "balance": 15450.00,
                "currency": "BRL",
                "status": "active",
            },
            {
                "bank": "Nubank",
                "balance": 5200.50,
                "currency": "BRL",
                "status": "active",
            },
            {
                "bank": "Itaú",
                "balance": 89400.00,
                "currency": "BRL",
                "status": "active",
            },
        ]

        total = sum(b["balance"] for b in mock_balances)

        return {
            "total_balance": total,
            "banks": mock_balances,
            "last_update": "2026-03-02T19:00:00Z",
        }

    async def sync_transactions(
        self, db: Session, bank_account_id: str, company_id: int
    ):
        """Sincroniza transações bancárias via Webhook/Polling."""
        # TODO: Implementar lógica de fetch da Pluggy/Belvo
        # Implementação Simulada/Mock para fins de demonstração

        # Simula criação de 2 transações recentes do extrato
        recent_tx1 = Transaction(
            company_id=company_id,
            description=f"Pagamento Fornecedor ({bank_account_id})",
            amount=Decimal("450.00"),
            type="expense",
            category="operational",
            status="paid",
            due_date=datetime.now() - timedelta(days=1),
            bank_account=bank_account_id,
        )

        recent_tx2 = Transaction(
            company_id=company_id,
            description=f"Recebimento Cliente XYZ ({bank_account_id})",
            amount=Decimal("1200.00"),
            type="income",
            category="sales",
            status="paid",
            due_date=datetime.now() - timedelta(hours=5),
            bank_account=bank_account_id,
        )

        db.add(recent_tx1)
        db.add(recent_tx2)
        db.commit()

        return {
            "status": "success",
            "message": "Extrato sincronizado com 2 novas transações",
        }

    async def get_burn_rate(self, db: Session, company_id: int) -> Dict[str, Any]:
        """Calcula o Burn Rate mensal atual cruzando dados do FinanceService."""
        # Simulação de cálculo baseado em transações reais
        return {"monthly_burn": 12500.0, "runway_months": 8.5, "trend": "decreasing"}


bank_hub_service = BankHubService()
