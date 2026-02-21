import google.genai as genai
from typing import List, Dict
import os
import json
import re


from .base import AIProvider


class GeminiService(AIProvider):
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = None
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"Warning: Failed to initialize GeminiService: {e}")

    async def _generate(self, prompt: str) -> str:
        if not self.client:
            return "IA não configurada"
        response = self.client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        return response.text

    async def analyze_resume(self, resume_text: str, job_description: str) -> Dict:
        """
        Analisar currículo vs vaga usando Gemini
        """
        prompt = f"""
        Analise o currículo abaixo em relação à descrição da vaga.
        
        VAGA:
        {job_description}
        
        CURRÍCULO:
        {resume_text}
        
        Forneça:
        1. Score de compatibilidade (0-100)
        2. Principais pontos fortes
        3. Lacunas identificadas
        4. Recomendação (Entrevistar/Revisar/Rejeitar)
        
        Responda em formato JSON.
        """

        response_text = await self._generate(prompt)
        return self._parse_json_response(response_text)

    async def chat_recruiter(self, message: str, context: str = "") -> str:
        """
        Chat com IA para recrutamento
        """
        prompt = f"""
        Você é um assistente de RH especializado em recrutamento.
        
        Contexto: {context}
        
        Pergunta: {message}
        
        Responda de forma profissional e concisa.
        """

        return await self._generate(prompt)

    async def financial_insights(self, transactions: List[Dict]) -> Dict:
        """
        Gerar insights financeiros
        """
        prompt = f"""
        Analise as transações financeiras abaixo e forneça:
        1. Padrões identificados
        2. Anomalias detectadas
        3. Recomendações de economia
        4. Previsão de fluxo de caixa (próximo mês)
        
        Transações:
        {transactions}
        
        Responda em JSON.
        """

        response_text = await self._generate(prompt)
        return self._parse_json_response(response_text)

    async def project_insights(self, tasks: List[Dict]) -> Dict:
        """
        Insights sobre progresso de projetos
        """
        prompt = f"""
        Analise as tarefas do projeto:
        {tasks}
        
        Forneça:
        1. Taxa de conclusão prevista
        2. Gargalos identificados
        3. Membros sobrecarregados
        4. Sugestões de otimização
        
        JSON format.
        """

        response_text = await self._generate(prompt)
        return self._parse_json_response(response_text)

    async def admin_audit(self, db_stats: Dict) -> Dict:
        """
        Auditoria do sistema pelo Admin IA
        """
        prompt = f"""
        Você é a IA Administradora do Sistema Innovation.ia.
        Analise o estado atual do sistema:
        
        Métricas:
        {json.dumps(db_stats, indent=2)}
        
        Forneça um relatório executivo com:
        1. Estado de saúde do sistema (Crítico/Alerta/Saudável)
        2. Análise das métricas de recrutamento
        3. Possíveis gargalos
        4. Ações recomendadas para o administrador humano
        
        Responda em JSON estrito.
        """

        response_text = await self._generate(prompt)
        return self._parse_json_response(response_text)

    def _parse_json_response(self, text: str) -> Dict:
        """Parse JSON from Gemini response"""

        # Remover markdown code blocks
        text = re.sub(r"```json\n|\n```|```", "", text)

        try:
            return json.loads(text)
        except:
            return {"raw": text}
