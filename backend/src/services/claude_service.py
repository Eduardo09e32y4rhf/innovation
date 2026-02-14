from anthropic import Anthropic
import os
from typing import List, Dict
import json
import re

class ClaudeService:
    def __init__(self):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    async def support_chat(self, message: str, history: List[Dict] = None) -> str:
        """
        Chat de suporte com Claude
        """
        messages = history or []
        messages.append({
            "role": "user",
            "content": message
        })
        
        response = self.client.messages.create(
            model="claude-3-sonnet-20240229", # Using a known valid model name
            max_tokens=1024,
            system="Você é um assistente de suporte técnico da Innovation.ia. Ajude os usuários com dúvidas sobre a plataforma.",
            messages=messages
        )
        
        return response.content[0].text
    
    async def code_review(self, code: str, language: str = "python") -> Dict:
        """
        Revisar código automaticamente
        """
        prompt = f"""
        Revise o código {language} abaixo:
        
        ```{language}
        {code}
        ```
        
        Forneça:
        1. Problemas de segurança
        2. Bugs potenciais
        3. Melhorias de performance
        4. Sugestões de refatoração
        
        Responda em JSON.
        """
        
        response = self.client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return self._parse_json(response.content[0].text)
    
    async def generate_report(self, data: Dict, report_type: str) -> str:
        """
        Gerar relatórios com Claude
        """
        prompt = f"""
        Gere um relatório {report_type} baseado nos dados:
        
        {data}
        
        Formato: Markdown profissional com gráficos em formato mermaid.
        """
        
        response = self.client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return response.content[0].text
    
    async def analyze_document(self, document_text: str) -> Dict:
        """
        Analisar documentos (contratos, políticas, etc)
        """
        prompt = f"""
        Analise o documento abaixo e extraia:
        1. Informações principais
        2. Datas importantes
        3. Valores financeiros
        4. Pessoas/empresas mencionadas
        5. Ações requeridas
        
        Documento:
        {document_text}
        
        JSON format.
        """
        
        response = self.client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return self._parse_json(response.content[0].text)
    
    def _parse_json(self, text: str) -> Dict:
        text = re.sub(r'```json\n|\n```|```', '', text)
        try:
            return json.loads(text)
        except:
            return {"raw": text}
