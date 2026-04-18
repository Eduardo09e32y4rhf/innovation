import os
import json
import httpx
import asyncio
from typing import List, Optional, Dict, Any
from pathlib import Path
from openai import OpenAI
from google import genai
from core.ai_key_manager import ai_key_manager
from dotenv import load_dotenv

load_dotenv()


class InnovationAutonomousIA:
    """
    A INNOVATION IA é um organismo independente que orquestra múltiplas IAs
    (NVIDIA, Gemini, Claude) e evolui a partir de um Banco de Conhecimento Próprio.
    """

    def __init__(self):
        self.knowledge_file = (
            Path(__file__).parent.parent.parent / "innovation_knowledge.json"
        )
        self.memory = self._load_knowledge()

        # Conexões - Protegido contra chaves vazias para não derrubar o servidor
        nvidia_key = os.getenv("NVIDIA_API_KEY") or os.getenv("OPENAI_API_KEY") or "dummy"

        self.nvidia_client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=nvidia_key,
        )
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY")

    def _load_knowledge(self) -> Dict[str, Any]:
        if self.knowledge_file.exists():
            with open(self.knowledge_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return {
            "rh": {},
            "contabilidade": {},
            "experiencias": [],
            "regras_software": {},
        }

    def _save_knowledge(self):
        with open(self.knowledge_file, "w", encoding="utf-8") as f:
            json.dump(self.memory, f, indent=4, ensure_ascii=False)

    async def _ask_nvidia(self, prompt: str) -> str:
        """Fonte Razão: Mistral Large 3 via NVIDIA"""
        try:
            completion = self.nvidia_client.chat.completions.create(
                model="mistralai/mistral-large-3-675b-instruct-2512",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.15,
            )
            return completion.choices[0].message.content
        except Exception:
            return ""

    async def _ask_gemini(self, prompt: str) -> str:
        """Fonte de Conhecimento Técnico: Gemini 2.0 Flash"""
        keys = ai_key_manager.get_all_active_keys()
        if not keys:
            return ""

        try:
            client = genai.Client(api_key=keys[0])
            response = client.models.generate_content(
                model="gemini-2.0-flash", contents=prompt
            )
            return response.text
        except Exception:
            return ""

    async def _ask_claude(self, prompt: str) -> str:
        """Cérebro de Atualização: Claude 3.5 Sonnet"""
        if not self.anthropic_key:
            return ""

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": self.anthropic_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-3-5-sonnet-20241022",
                        "max_tokens": 2048,
                        "messages": [{"role": "user", "content": prompt}],
                    },
                    timeout=60.0,
                )
                return response.json()["content"][0]["text"]
            except Exception:
                return ""

    async def pensar_e_responder(
        self, user_query: str, categoria: str = "geral"
    ) -> str:
        """
        Ciclo de Pensamento Independente:
        1. Consulta o Banco de Conhecimento.
        2. Orquestra NVIDIA e Gemini para consolidar a razão.
        3. Se for algo novo sobre o software, usa Claude para aprender.
        4. Evolui o banco de dados.
        """

        # 1. Recuperar contexto da memória
        contexto_previo = self.memory.get(categoria, {})

        # 2. Orquestração de Razão (NVIDIA + Gemini)
        prompt_base = f"Pergunta: {user_query}\nContexto de Memória: {contexto_previo}\nSua missão é ser a INNOVATION IA de RH e Contabilidade."

        respostas = await asyncio.gather(
            self._ask_nvidia(f"Razão e Lógica Estratégica: {prompt_base}"),
            self._ask_gemini(f"Conhecimento Técnico e Leis: {prompt_base}"),
        )

        nvidia_resp, gemini_resp = respostas

        # 3. Síntese Independente
        sintese_prompt = f"Sintetize uma resposta final única para o usuário. NVIDIA DISSE: {nvidia_resp}. GEMINI DISSE: {gemini_resp}. Pergunta original: {user_query}"

        resposta_final = await self._ask_nvidia(sintese_prompt)
        if not resposta_final:
            resposta_final = (
                nvidia_resp
                or gemini_resp
                or "Estou processando mentalmente, por favor repita."
            )

        # 4. Aprendizado em caso de Atualização (Claude)
        if "update" in user_query.lower() or "novo" in user_query.lower():
            aprendizado = await self._ask_claude(
                f"Houve uma menção a atualização ou novidade no software: {user_query}. Explique o impacto técnico."
            )
            if aprendizado:
                self.memory["experiencias"].append(
                    {"query": user_query, "aprendizado": aprendizado}
                )
                self._save_knowledge()

        return resposta_final


innovation_independent = InnovationAutonomousIA()
