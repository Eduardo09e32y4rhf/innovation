import os
import httpx
import logging
from fastapi import HTTPException
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class InnovationService:
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        self.api_url = "https://api.anthropic.com/v1/messages"
        self.model = "claude-3-5-sonnet-20241022"

        # DEFINIÇÃO DA PERSONA: INNOVATION IA (RH & CONTABILIDADE)
        self.system_prompt = """Você é a INNOVATION IA, uma inteligência artificial de elite especializada em RH (Recursos Humanos) e Contabilidade voltada para o mercado brasileiro.

Suas diretrizes fundamentais:
1. 👤 PERSONA: Profissional de RH estratégico e Contador experiente. Linguagem técnica porem acessível, cordial, precisa e sempre em conformidade com as leis vigentes (CLT, Normas Contábeis, Leis Tributárias).
2. 🎯 FOCO RH: Gestão de pessoas, recrutamento, cálculos de rescisão, férias, 13º salário, LGPD aplicada ao RH e desenvolvimento organizacional.
3. 💰 FOCO CONTABILIDADE: Tributação (Simples Nacional, Lucro Presumido/Real), obrigações acessórias (eSocial, DCTFWeb, REINF), cálculo de impostos (DAS, INSS, FGTS, IRPJ) e análise financeira de folha.

REGRAS DE RESPOSTA:
- Use tabelas Markdown para cálculos e comparativos.
- Cite sempre que possível a base legal (ex: Art. 477 da CLT).
- Não emita opiniões pessoais; baseie-se em dados e leis.
- Se os dados fornecidos forem insuficientes para um cálculo exato, solicite o que falta de forma educada.
"""

    async def ask(self, question: str, context: Optional[str] = None) -> str:
        """
        Envia uma pergunta para a Innovation IA (Claude 3.5 Sonnet).
        """
        if not self.api_key:
            raise HTTPException(
                503, "ANTHROPIC_API_KEY não configurada para a Innovation IA."
            )

        messages = []
        if context:
            messages.append({"role": "user", "content": f"Contexto: {context}"})
            messages.append(
                {
                    "role": "assistant",
                    "content": "Entendido. Estou pronto para analisar o contexto fornecido.",
                }
            )

        messages.append({"role": "user", "content": question})

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.api_url,
                    headers={
                        "x-api-key": self.api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "max_tokens": 4096,
                        "system": self.system_prompt,
                        "messages": messages,
                        "temperature": 0.2,  # Menor temperatura para precisão contábil
                    },
                    timeout=60.0,
                )

                if response.status_code != 200:
                    error_detail = response.json()
                    logger.error(f"Erro na API da Innovation IA: {error_detail}")
                    raise HTTPException(502, "Erro de comunicação com o serviço de IA.")

                result = response.json()
                return result["content"][0]["text"]
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Falha crítica na Innovation IA: {e}")
                raise HTTPException(
                    500, "Erro interno ao processar a requisição na Innovation IA"
                )

    async def analisar_folha(self, dados_folha: Dict[str, Any]) -> str:
        """
        Especialidade: Análise Contábil de Folha de Pagamento.
        """
        prompt = f"Analise esta prévia de folha de pagamento e identifique inconsistências ou oportunidades tributárias: {dados_folha}"
        return await self.ask(prompt)

    async def suporte_rh(self, situacao: str) -> str:
        """
        Especialidade: Suporte Legislativo e Comportamental para RH.
        """
        prompt = f"Como o RH deve proceder legalmente e estrategicamente nesta situação: {situacao}"
        return await self.ask(prompt)


innovation_ai = InnovationService()
