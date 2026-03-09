import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class NvidiaService:
    def __init__(self):
        self.api_key = os.getenv("NVIDIA_API_KEY")
        self.client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=self.api_key
        )
        self.model = "mistralai/mistral-large-3-675b-instruct-2512"

    def generate_management_insight(self, enterprise_data: str) -> str:
        """
        Gera insights estratégicos usando o modelo Mistral Large 3 da NVIDIA.
        """
        try:
            prompt = (
                "Você é um consultor estratégico de elite. Analise os seguintes dados da empresa "
                f"e identifique 3 oportunidades críticas de melhoria ou crescimento: {enterprise_data}"
            )
            
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.15,
                max_tokens=2048,
                top_p=1.0
            )
            
            return completion.choices[0].message.content
        except Exception as e:
            return f"Erro ao processar insights: {str(e)}"

    def processar_gestao(self, enterprise_context: dict) -> str:
        """
        Transforma um dicionário de contexto em uma string e gera o insight.
        """
        context_str = ". ".join([f"{k}: {v}" for k, v in enterprise_context.items()])
        return self.generate_management_insight(context_str)
