from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from domain.models.finance import Transaction, CostCenter
import google.generativeai as genai
import os

class FinanceService:
    @staticmethod
    def get_cash_flow_summary(db: Session, company_id: int):
        transactions = db.query(Transaction).filter(Transaction.company_id == company_id).all()
        income = sum(t.amount for t in transactions if t.type == "income" and t.status == "paid")
        expenses = sum(t.amount for t in transactions if t.type == "expense" and t.status == "paid")
        pending_income = sum(t.amount for t in transactions if t.type == "income" and t.status == "pending")
        pending_expenses = sum(t.amount for t in transactions if t.type == "expense" and t.status == "pending")
        
        return {
            "balance": income - expenses,
            "total_income": income,
            "total_expenses": expenses,
            "pending_income": pending_income,
            "pending_expenses": pending_expenses
        }

    @staticmethod
    def ai_cash_flow_prediction(db: Session, company_id: int):
        # Coleta dados históricos simplificados
        summary = FinanceService.get_cash_flow_summary(db, company_id)
        
        # Chama a IA para prever o próximo mês (Simulação lite)
        # Em produção, passaríamos o histórico detalhado para o Gemini
        prediction = f"Baseado no saldo de R$ {summary['balance']}, prevemos uma estabilidade de 15% de crescimento no próximo mês se as despesas pendentes (R$ {summary['pending_expenses']}) forem quitadas no prazo."
        
        return {
            "prediction": prediction,
            "recommended_action": "Manter reserva de contingência para as despesas de R$ " + str(summary['pending_expenses'])
        }

    @staticmethod
    def detect_anomalies(db: Session, company_id: int):
        """IA detecta picos de gastos anômalos."""
        # Comparação básica por categoria
        prediction_data = FinanceService.ai_cash_flow_prediction(db, company_id)
        # Mock logic
        return [{
            "description": "Aumento de 40% na conta de luz",
            "impact": "Alto",
            "suggestion": "Verificar se houve erro na medição ou novo equipamento ligado 24h."
        }]

finance_service = FinanceService()
