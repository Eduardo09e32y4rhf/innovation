"""
FinanceService — Fluxo de Caixa e IA Preditiva Real
---------------------------------------------------
Correções aplicadas:
- ai_cash_flow_prediction: agora chama Gemini com dados históricos reais do BD
- detect_anomalies: calcula desvios reais comparando médias mensais por categoria
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from domain.models.finance import Transaction, CostCenter
import os
import json
import logging

logger = logging.getLogger(__name__)

GEMINI_KEY = os.getenv("GEMINI_API_KEY", os.getenv("GEMINI_API_KEY_1", ""))

try:
    from google import genai as google_genai

    _GENAI_AVAILABLE = True
except ImportError:
    _GENAI_AVAILABLE = False


def _get_gemini_client():
    try:
        from core.ai_key_manager import ai_key_manager

        keys = ai_key_manager.get_all_active_keys()
        api_key = keys[0] if keys else GEMINI_KEY
    except Exception:
        api_key = GEMINI_KEY

    if not api_key or not _GENAI_AVAILABLE:
        return None
    return google_genai.Client(api_key=api_key)


class FinanceService:

    # ──────────────────────────────────────────────────────────────────────────
    # FLUXO DE CAIXA (REAL — já estava correto)
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def get_cash_flow_summary(db: Session, company_id: int):
        """Agrega dados diretamente do banco — sem loops Python O(N)."""
        results = (
            db.query(
                Transaction.type,
                Transaction.status,
                func.sum(Transaction.amount).label("total"),
            )
            .filter(Transaction.company_id == company_id)
            .group_by(Transaction.type, Transaction.status)
            .all()
        )

        income = expenses = pending_income = pending_expenses = 0.0

        for t_type, t_status, total in results:
            val = float(total) if total else 0.0
            if t_type == "income":
                if t_status == "paid":
                    income += val
                elif t_status == "pending":
                    pending_income += val
            elif t_type == "expense":
                if t_status == "paid":
                    expenses += val
                elif t_status == "pending":
                    pending_expenses += val

        return {
            "balance": round(income - expenses, 2),
            "total_income": round(income, 2),
            "total_expenses": round(expenses, 2),
            "pending_income": round(pending_income, 2),
            "pending_expenses": round(pending_expenses, 2),
        }

    # ──────────────────────────────────────────────────────────────────────────
    # RESUMO FISCAL (REAL — já estava correto)
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def get_tax_summary(db: Session, company_id: int):
        """Agrega despesas por tipo de imposto (DAS, INSS, FGTS, etc.)."""
        transactions = (
            db.query(Transaction)
            .filter(
                Transaction.company_id == company_id,
                Transaction.tax_type.isnot(None),
                Transaction.type == "expense",
            )
            .all()
        )

        summary = {}
        total_tax = 0.0
        for t in transactions:
            ttype = t.tax_type.upper()
            if ttype not in summary:
                summary[ttype] = {
                    "total": 0.0,
                    "pending": 0.0,
                    "paid": 0.0,
                    "items": [],
                }

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

        return {"total_taxes": round(total_tax, 2), "breakdown": summary}

    # ──────────────────────────────────────────────────────────────────────────
    # HISTÓRICO MENSAL (Util para a IA)
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def get_monthly_history(db: Session, company_id: int, months: int = 6) -> list:
        """Retorna histórico mensal agrupado para alimentar a IA preditiva."""
        start_date = datetime.utcnow() - timedelta(days=30 * months)

        results = (
            db.query(
                extract("year", Transaction.due_date).label("year"),
                extract("month", Transaction.due_date).label("month"),
                Transaction.type,
                func.sum(Transaction.amount).label("total"),
            )
            .filter(
                Transaction.company_id == company_id,
                Transaction.status == "paid",
                Transaction.due_date >= start_date,
            )
            .group_by("year", "month", Transaction.type)
            .order_by("year", "month")
            .all()
        )

        history = {}
        for year, month, tx_type, total in results:
            key = f"{int(year)}-{int(month):02d}"
            if key not in history:
                history[key] = {"month": key, "income": 0.0, "expenses": 0.0}
            if tx_type == "income":
                history[key]["income"] += float(total or 0)
            elif tx_type == "expense":
                history[key]["expenses"] += float(total or 0)

        for k in history:
            history[k]["net"] = round(history[k]["income"] - history[k]["expenses"], 2)
            history[k]["income"] = round(history[k]["income"], 2)
            history[k]["expenses"] = round(history[k]["expenses"], 2)

        return sorted(history.values(), key=lambda x: x["month"])

    # ──────────────────────────────────────────────────────────────────────────
    # PREVISÃO DE CAIXA COM GEMINI (AGORA REAL)
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    async def ai_cash_flow_prediction(db: Session, company_id: int) -> dict:
        """
        Usa dados históricos reais do banco + Gemini para prever o próximo mês.
        Retorna JSON estruturado com previsão, alertas e recomendações.
        """
        summary = FinanceService.get_cash_flow_summary(db, company_id)
        history = FinanceService.get_monthly_history(db, company_id, months=3)

        client = _get_gemini_client()

        if not client or not history:
            # Fallback sem IA: usa média simples dos últimos meses
            if history:
                avg_income = sum(m["income"] for m in history) / len(history)
                avg_expense = sum(m["expenses"] for m in history) / len(history)
                projected_net = avg_income - avg_expense
                return {
                    "prediction_method": "simple_average",
                    "projected_income": round(avg_income, 2),
                    "projected_expenses": round(avg_expense, 2),
                    "projected_net": round(projected_net, 2),
                    "current_balance": summary["balance"],
                    "pending_receivable": summary["pending_income"],
                    "pending_payable": summary["pending_expenses"],
                    "alerts": [
                        "Ative o GEMINI_API_KEY para previsões mais precisas com IA"
                    ],
                    "recommendations": [
                        f"Baseado nos últimos {len(history)} meses, sua receita média é R$ {avg_income:.2f}"
                    ],
                    "confidence": 40,
                }
            return {
                "prediction_method": "insufficient_data",
                "message": "Sem dados históricos suficientes para fazer previsão.",
                "current_balance": summary["balance"],
            }

        # Monta histórico formatado para o prompt
        history_str = "\n".join(
            [
                f"- {m['month']}: Receita R${m['income']:.2f}, Despesas R${m['expenses']:.2f}, Saldo R${m['net']:.2f}"
                for m in history
            ]
        )

        prompt = f"""Você é um analista financeiro especialista em PMEs brasileiras.

Analise os dados financeiros reais abaixo e faça uma previsão para o próximo mês:

SITUAÇÃO ATUAL:
- Saldo atual: R${summary['balance']:.2f}
- Receitas recebidas: R${summary['total_income']:.2f}
- Despesas pagas: R${summary['total_expenses']:.2f}
- A receber (pendente): R${summary['pending_income']:.2f}
- A pagar (pendente): R${summary['pending_expenses']:.2f}

HISTÓRICO DOS ÚLTIMOS {len(history)} MESES:
{history_str}

Retorne APENAS um JSON válido com esta estrutura exata:
{{
  "projected_income": número em reais,
  "projected_expenses": número em reais,
  "projected_net": número em reais (receita - despesa),
  "projected_balance_end_of_month": número (saldo atual + líquido projetado),
  "confidence": número de 0 a 100,
  "trend": "crescimento" | "estabilidade" | "queda",
  "alerts": ["lista de alertas importantes"],
  "recommendations": ["lista de até 3 ações recomendadas"],
  "risk_level": "baixo" | "médio" | "alto"
}}"""

        try:
            response = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=[{"role": "user", "parts": [{"text": prompt}]}],
                config={"temperature": 0.3},
            )

            raw = response.text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()

            prediction = json.loads(raw)
            prediction["prediction_method"] = "gemini_ai"
            prediction["current_balance"] = summary["balance"]
            prediction["pending_receivable"] = summary["pending_income"]
            prediction["pending_payable"] = summary["pending_expenses"]
            logger.info(
                f"Previsão de caixa gerada com {prediction.get('confidence', '?')}% de confiança"
            )
            return prediction

        except json.JSONDecodeError as e:
            logger.error(f"Gemini retornou resposta inválida na previsão de caixa: {e}")
        except Exception as e:
            logger.error(f"Erro ao chamar Gemini para previsão financeira: {e}")

        # Fallback em caso de erro
        return {
            "prediction_method": "fallback_average",
            "message": "Previsão por média simples (IA indisponível temporariamente)",
            "current_balance": summary["balance"],
        }

    # ──────────────────────────────────────────────────────────────────────────
    # DETECTOR DE ANOMALIAS (AGORA REAL)
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def detect_anomalies(db: Session, company_id: int) -> list:
        """
        Detecta anomalias reais comparando gastos do mês atual
        com a média dos 3 meses anteriores por categoria.
        Alerta quando desvio > 30%.
        """
        now = datetime.utcnow()
        current_month_start = datetime(now.year, now.month, 1)
        three_months_ago = current_month_start - timedelta(days=90)

        # Gastos do mês atual por categoria
        current_expenses = (
            db.query(Transaction.category, func.sum(Transaction.amount).label("total"))
            .filter(
                Transaction.company_id == company_id,
                Transaction.type == "expense",
                Transaction.due_date >= current_month_start,
            )
            .group_by(Transaction.category)
            .all()
        )

        if not current_expenses:
            return []

        # Média mensal dos últimos 3 meses por categoria
        historical_expenses = (
            db.query(Transaction.category, func.sum(Transaction.amount).label("total"))
            .filter(
                Transaction.company_id == company_id,
                Transaction.type == "expense",
                Transaction.due_date >= three_months_ago,
                Transaction.due_date < current_month_start,
            )
            .group_by(Transaction.category)
            .all()
        )

        # Monta dicionário de médias históricas
        historical_avg = {}
        for cat, total in historical_expenses:
            historical_avg[cat] = float(total or 0) / 3  # Média dos 3 meses

        anomalies = []
        for cat, current_total in current_expenses:
            current_val = float(current_total or 0)
            avg_val = historical_avg.get(cat, 0)

            if avg_val == 0:
                # Categoria nova — pode ser anomalia
                if current_val > 500:  # Threshold mínimo de R$500
                    anomalies.append(
                        {
                            "category": cat or "sem categoria",
                            "current_month": round(current_val, 2),
                            "historical_avg": 0,
                            "deviation_pct": 100,
                            "description": f"Nova categoria de gasto: {cat}",
                            "impact": "Médio",
                            "suggestion": f"Verificar se o gasto em '{cat}' (R${current_val:.2f}) é esperado.",
                        }
                    )
                continue

            deviation = ((current_val - avg_val) / avg_val) * 100

            if deviation >= 30:  # 30% acima da média = anomalia
                impact = (
                    "Alto"
                    if deviation >= 100
                    else "Médio" if deviation >= 50 else "Baixo"
                )
                anomalies.append(
                    {
                        "category": cat or "sem categoria",
                        "current_month": round(current_val, 2),
                        "historical_avg": round(avg_val, 2),
                        "deviation_pct": round(deviation, 1),
                        "description": f"Gasto em '{cat}' {deviation:.0f}% acima da média histórica",
                        "impact": impact,
                        "suggestion": (
                            f"O gasto atual em '{cat}' é R${current_val:.2f}. "
                            f"A média dos últimos 3 meses era R${avg_val:.2f}. "
                            "Verifique se houve mudança contratual, novo fornecedor ou erro de lançamento."
                        ),
                    }
                )

        # Ordena por maior desvio
        anomalies.sort(key=lambda x: x["deviation_pct"], reverse=True)
        return anomalies


finance_service = FinanceService()
