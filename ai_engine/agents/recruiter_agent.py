from infrastructure.ai_clients.gemini_pro import GeminiService
import logging

class RecruiterAgent:
    def __init__(self):
        self.gemini = GeminiService()
        self.logger = logging.getLogger("ai_engine.recruiter")

    async def process_resume_analysis(self, resume_text: str, job_description: str):
        """
        Tarefa pesada: Analisar currículo vs vaga
        """
        self.logger.info("Iniciando análise de currículo via Agente Autônomo...")
        try:
            analysis = await self.gemini.analyze_resume(resume_text, job_description)
            self.logger.info("Análise concluída com sucesso.")
            return analysis
        except Exception as e:
            self.logger.error(f"Erro no processamento do agente: {str(e)}")
            raise

recruiter_agent = RecruiterAgent()
