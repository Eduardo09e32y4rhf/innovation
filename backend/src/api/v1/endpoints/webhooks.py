from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from infrastructure.database.sql.dependencies import get_db
import logging

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])
logger = logging.getLogger(__name__)


@router.post("/n8n/callback")
async def n8n_callback(request: Request, db: Session = Depends(get_db)):
    """
    Recebe callbacks do n8n (ex: confirmação de envio de WhatsApp, atualização de status financeiro)
    """
    try:
        payload = await request.json()
        logger.info(f"Webhook n8n recebido: {payload}")

        # Aqui você pode implementar lógica específica baseada no payload
        # Exemplo: Atualizar status de candidatura se payload tiver 'application_id' e 'status'

        return {"status": "received", "payload": payload}
    except Exception as e:
        logger.error(f"Erro no webhook n8n: {e}")
        raise HTTPException(status_code=500, detail=str(e))
