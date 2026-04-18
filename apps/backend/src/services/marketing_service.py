"""
Manager de Marketing Autônomo — Innovation.ia @Pro
────────────────────────────────────────────────────
Este módulo integra o ATS de vagas ao Instagram/LinkedIn
para gerar o "Zero-touch recruitment marketing".
"""
import logging
import requests
import os
from sqlalchemy.orm import Session
from domain.models.job import Job
# from app.config import settings

logger = logging.getLogger(__name__)

INSTAGRAM_BASE_URL = os.getenv("INSTAGRAM_BASE_URL", "https://graph.facebook.com")
INSTAGRAM_API_VERSION = os.getenv("INSTAGRAM_API_VERSION", "v18.0")
INSTAGRAM_BUSINESS_ACCOUNT_ID = os.getenv("INSTAGRAM_BUSINESS_ACCOUNT_ID", "")
INSTAGRAM_ACCESS_TOKEN = os.getenv("INSTAGRAM_ACCESS_TOKEN", "")

BASE_URL = f"{INSTAGRAM_BASE_URL}/{INSTAGRAM_API_VERSION}"

class MarketingAutonomo:
    @staticmethod
    def create_media(image_url: str, caption: str) -> str | None:
        """Cria mídia no Instagram API."""
        if not INSTAGRAM_ACCESS_TOKEN:
            logger.warning("[MARKETING] Token do Instagram não configurado. Simulação ativa.")
            return "simulated_media_123"

        url = f"{BASE_URL}/{INSTAGRAM_BUSINESS_ACCOUNT_ID}/media"
        payload = {
            "image_url": image_url,
            "caption": caption,
            "access_token": INSTAGRAM_ACCESS_TOKEN,
        }

        try:
            r = requests.post(url, data=payload, timeout=30)
            if r.status_code != 200:
                logger.error(f"[MARKETING] Erro ao criar media: {r.text}")
                return None
            return r.json()["id"]
        except Exception as e:
            logger.error(f"[MARKETING] Exceção ao criar media: {e}")
            return None

    @staticmethod
    def publish_media(creation_id: str):
        """Publica mídia no Instagram."""
        if not INSTAGRAM_ACCESS_TOKEN or creation_id == "simulated_media_123":
            logger.info("[MARKETING] Simulando postagem no Instagram...")
            return {"id": "simulated_post_123"}

        url = f"{BASE_URL}/{INSTAGRAM_BUSINESS_ACCOUNT_ID}/media_publish"
        payload = {
            "creation_id": creation_id,
            "access_token": INSTAGRAM_ACCESS_TOKEN,
        }

        try:
            r = requests.post(url, data=payload, timeout=30)
            if r.status_code != 200:
                logger.error(f"[MARKETING] Erro ao publicar media: {r.text}")
                return None
            return r.json()
        except Exception as e:
            logger.error(f"[MARKETING] Exceção ao publicar media: {e}")
            return None

    @classmethod
    def automatizar_anuncio_vaga(cls, job: Job, context: str = ""):
        """
        Recebe uma vaga recém-criada, aciona o AI Service para gerar
        uma copy estilo "Employer Branding" e faz a postagem.
        """
        # Exemplo simulado de integração
        logger.info(f"[MARKETING] ✨ Gerando arte e copy para a vaga: {job.title}")

        # 1. Geraria a imagem (usaria DALL-E, Midjourney ou template pre-renderizado)
        simulated_image_url = "https://innovation.ia/static/hiring-template.jpg"

        # 2. Geraria a Copy (Gemini)
        # prompt = f"Crie um post de Instagram atrativo pra vaga {job.title} pagando {job.salary} em {job.location}"
        simulated_copy = (
            f"Vem inovar com a gente! 🚀 Vaga aberta para {job.title}!\n\n"
            f"📍 {job.location or 'Remoto'}\n"
            f"💰 {job.salary or 'A combinar'}\n\n"
            f"Se inscreva agora pelo nosso portal Innovation.ia! O seu futuro te espera.\n"
            f"#Vagas #Contratando #{job.title.replace(' ', '')}"
        )

        logger.info(f"[MARKETING] Copy gerada: {simulated_copy}")

        # 3. Faz o post
        media_id = cls.create_media(simulated_image_url, simulated_copy)
        if media_id:
            resultado = cls.publish_media(media_id)
            logger.info(f"[MARKETING] ✅ Postado com sucesso! Info: {resultado}")
            return resultado
        return None
