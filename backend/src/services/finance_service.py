from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from domain.models.finance import Transaction, CostCenter
from sqlalchemy import func
import logging


class FinanceService:
    @staticmethod
    def get_cash_flow_summary(db: Session, company_id: int):
        transactions = (
            db.query(Transaction).filter(Transaction.company_id == company_id).all()
        )
        income = sum(
            t.amount for t in transactions if t.type == "income" and t.status == "paid"
        )
        expenses = sum(
            t.amount for t in transactions if t.type == "expense" and t.status == "paid"
        )
        pending_income = sum(
            t.amount
            for t in transactions
            if t.type == "income" and t.status == "pending"
        )
        pending_expenses = sum(
            t.amount
            for t in transactions
            if t.type == "expense" and t.status == "pending"
        )

        return {
            "balance": income - expenses,
            "total_income": income,
            "total_expenses": expenses,
            "pending_income": pending_income,
            "pending_expenses": pending_expenses,
        }

    @staticmethod
    def get_tax_summary(db: Session, company_id: int):
        """Agrega despesas por tipo de imposto (DAS, INSS, FGTS, etc)."""
        transactions = (
            db.query(Transaction)
            .filter(
                Transaction.company_id == company_id,
                Transaction.tax_type.isnot(None),
                Transaction.type == "expense",
            )
            .all()
        )

        # Agrupa por tax_type
        summary = {}
        total_tax = 0
        for t in transactions:
            ttype = t.tax_type.upper()
            if ttype not in summary:
                summary[ttype] = {"total": 0, "pending": 0, "paid": 0, "items": []}

            val = float(t.amount)
            summary[ttype]["total"] += val
            total_tax += val

            if t.status == "paid":
                summary[ttype]["paid"] += val
            else:
                summary[ttype]["pending"] += val

            summary[ttype]["items"].append(
                {
                    "description": t.description,
                    "amount": val,
                    "due_date": t.due_date,
                    "status": t.status,
                }
            )

        return {"total_taxes": total_tax, "breakdown": summary}

    @staticmethod
    def ai_cash_flow_prediction(db: Session, company_id: int):
        # Implementação "Real" baseada em dados reais
        summary = FinanceService.get_cash_flow_summary(db, company_id)
        balance = float(summary["balance"])
        pending_exp = float(summary["pending_expenses"])

        # Lógica simples de projeção: Saldo Atual - Despesas Pendentes + Receitas Pendentes
        projected_balance = balance + float(summary["pending_income"]) - pending_exp

        status = "estável"
        if projected_balance > balance * 1.1:
            status = "crescimento"
        elif projected_balance < balance * 0.9:
            status = "alerta"

        prediction_text = (
            f"Projeção de caixa para o fim do mês: R$ {projected_balance:.2f}. "
            f"Status: {status.upper()}. "
            f"Considerando R$ {pending_exp:.2f} em contas a pagar."
        )

        return {
            "prediction": prediction_text,
            "recommended_action": (
                "Priorizar pagamento de impostos e fornecedores críticos."
                if status == "alerta"
                else "Investir excedente em CDB ou Tesouro."
            ),
        }

    @staticmethod
    def detect_anomalies(db: Session, company_id: int):
        """Detecta gastos acima da média por categoria."""
        # Obter média de gastos por categoria
        expenses = (
            db.query(
                Transaction.category,
                func.avg(Transaction.amount).label("avg_amount"),
                func.stddev(Transaction.amount).label("std_amount"),
            )
            .filter(Transaction.company_id == company_id, Transaction.type == "expense")
            .group_by(Transaction.category)
            .all()
        )

        # Verificar transações recentes (últimos 30 dias) que fogem do padrão (ex: > média + 2*desvio)
        recent_cutoff = datetime.now() - timedelta(days=30)
        recent_txs = (
            db.query(Transaction)
            .filter(
                Transaction.company_id == company_id,
                Transaction.type == "expense",
                Transaction.created_at >= recent_cutoff,
            )
            .all()
        )

        anomalies = []
        stats_map = {
            e.category: (float(e.avg_amount or 0), float(e.std_amount or 0))
            for e in expenses
        }

        for tx in recent_txs:
            if tx.category in stats_map:
                avg, std = stats_map[tx.category]
                if std > 0 and float(tx.amount) > (avg + 2 * std):
                    anomalies.append(
                        {
                            "description": f"Gasto atípico em {tx.category}: {tx.description}",
                            "impact": "Alto",
                            "suggestion": f"Valor R$ {tx.amount} é significativamente maior que a média histórica (R$ {avg:.2f}).",
                        }
                    )

        if not anomalies:
            return [
                {
                    "description": "Nenhuma anomalia detectada recentemente.",
                    "impact": "Baixo",
                    "suggestion": "Monitoramento continua ativo.",
                }
            ]

        return anomalies


finance_service = FinanceService()
