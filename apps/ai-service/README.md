# Innovation IA AI Service

Servico Python/FastAPI separado do NestJS. O backend principal chama este servico por HTTP usando `AI_SERVICE_URL`.

## Rodar local

```bash
cd apps/ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```
