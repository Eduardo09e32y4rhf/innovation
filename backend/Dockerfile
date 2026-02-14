FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema para psycopg2 e outras
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements primeiro para aproveitar o cache do Docker
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar o restante do código
COPY . .

# Setar o PYTHONPATH para encontrar os módulos
ENV PYTHONPATH=/app/backend/src:/app

# Expor a porta que o FastAPI usa
EXPOSE 8000

# Comando padrão (pode ser sobrescrito pelo docker-compose)
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
