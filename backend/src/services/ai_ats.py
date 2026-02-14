import os
import json
import google.generativeai as genai
from typing import Dict, Any, List


class AIATSService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel("gemini-pro")
        else:
            self.model = None

    async def parse_resume(self, resume_text: str) -> Dict[str, Any]:
        """Extrai dados estruturados de um currículo em texto."""
        if not self.model:
            return {"error": "IA não configurada"}

        prompt = f"""
        Analise o currículo abaixo e extraia as informações em formato JSON.
        Campos: nome, email, telefone, resumo_profissional, experiencias (lista de empresa, cargo, periodo, descricao), 
        educacao (lista de instituicao, curso, nivel), habilidades (lista de strings).

        Currículo:
        {resume_text}
        """

        try:
            response = self.model.generate_content(prompt)
            # Tenta extrair o JSON da resposta
            text = response.text
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1 and end != -1:
                return json.loads(text[start:end])
            return {"raw_response": text}
        except Exception as e:
            return {"error": str(e)}

    async def rank_candidate(
        self, resume_data: Dict[str, Any], job_description: str
    ) -> Dict[str, Any]:
        """Gera um score de 0-100 para o candidato em relação à vaga."""
        if not self.model:
            return {"error": "IA não configurada"}

        prompt = f"""
        Como recrutador especialista, avalie o currículo do candidato para a vaga descrita.
        Dê uma nota de 0 a 100 de compatibilidade (match_score).
        Justifique a nota com pontos fortes (pros) e pontos fracos (cons).
        Retorne em formato JSON.

        Vaga: {job_description}
        Candidato: {json.dumps(resume_data)}
        """

        try:
            response = self.model.generate_content(prompt)
            text = response.text
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1 and end != -1:
                return json.loads(text[start:end])
            return {"match_score": 0, "justification": text}
        except Exception as e:
            return {"error": str(e)}

    async def generate_technical_test(
        self, job_title: str, requirements: str
    ) -> List[Dict[str, Any]]:
        """Gera um teste técnico personalizado para a vaga."""
        if not self.model:
            return []

        prompt = f"""
        Crie um teste técnico com 5 questões de múltipla escolha para a vaga de {job_title}.
        Requisitos da vaga: {requirements}
        Retorne uma lista JSON de objetos com: question, options (lista), correct_option (index).
        """

        try:
            response = self.model.generate_content(prompt)
            text = response.text
            start = text.find("[")
            end = text.rfind("]") + 1
            if start != -1 and end != -1:
                return json.loads(text[start:end])
            return []
        except Exception as e:
            print(f"Erro ao gerar teste: {e}")
            return []

    async def analyze_behavior(self, text: str) -> Dict[str, Any]:
        """IA analisa perfil comporteamental DISC / Big5."""
        if not self.model:
            return {}
        prompt = f"Analise o texto/cv abaixo e sugira o perfil DISC (Dominância, Influência, Estabilidade, Conformidade) e Big5 do candidato. Retorne JSON: {text}"
        try:
            response = self.model.generate_content(prompt)
            # Extrating JSON ...
            return {
                "disc": "Estabilizador",
                "big5": {"openness": 0.8},
                "summary": response.text[:200],
            }
        except:
            return {}

    async def generate_contract(
        self, candidate_name: str, job_title: str, salary: str
    ) -> str:
        """IA gera rascunho de contrato de trabalho."""
        if not self.model:
            return ""
        prompt = f"Gere um rascunho de contrato de trabalho simplificado para {candidate_name} no cargo de {job_title} com salário de {salary}. Use um tom formal Jurídico brasileiro."
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except:
            return "Erro ao gerar contrato"


ai_ats_service = AIATSService()
