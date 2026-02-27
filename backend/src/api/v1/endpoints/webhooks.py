from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from infrastructure.database.sql.dependencies import get_db
from domain.models.application import Application
from domain.models.application_status_history import ApplicationStatusHistory
import logging

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])
logger = logging.getLogger(__name__)

@router.post("/n8n/callback")
async def n8n_callback(request: Request, db: Session = Depends(get_db)):
    """
    Recebe callbacks do n8n.
    Payload esperado:
    {
        "event": "application_status_change",
        "application_id": 123,
        "status": "interview_scheduled" // ou outro status novo
    }
    """
    try:
        payload = await request.json()
        logger.info(f"Webhook n8n recebido: {payload}")

        event = payload.get("event")

        if event == "application_status_change":
            app_id = payload.get("application_id")
            new_status = payload.get("status")

            if app_id and new_status:
                app = db.query(Application).filter(Application.id == app_id).first()
                if app:
                    old_status = app.status
                    app.status = new_status

                    # Registrar histórico (assumindo system user ou null para changed_by)
                    # Para simplificar, não criamos histórico aqui ou assumimos ID 1 (admin)
                    # history = ApplicationStatusHistory(
                    #    application_id=app.id,
                    #    old_status=old_status,
                    #    new_status=new_status,
                    #    changed_by_user_id=1
                    # )
                    # db.add(history)

                    db.commit()
                    logger.info(f"Aplicação {app_id} atualizada para {new_status} via webhook")

        return {"status": "received", "payload": payload}
    except Exception as e:
        logger.error(f"Erro no webhook n8n: {e}")
        raise HTTPException(status_code=500, detail=str(e))
