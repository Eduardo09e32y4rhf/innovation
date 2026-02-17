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

# Expor a porta (documentação)
EXPOSE 8000

# Comando para iniciar a aplicação usando a variável de ambiente PORT (padrão Railway)
CMD sh -c "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"
