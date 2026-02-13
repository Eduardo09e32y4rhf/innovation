FROM python:3.12-slim

WORKDIR /app

# Usa explicitamente o requirements.txt do backend (build a partir da raiz: docker build -f innovation/Dockerfile .)
COPY innovation/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Gunicorn com workers Uvicorn (recomendado para FastAPI), porta 8000
CMD ["gunicorn", "innovation.app.main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]