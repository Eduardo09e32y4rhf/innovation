FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema para psycopg2, curl (healthcheck) e outras
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements primeiro para aproveitar o cache do Docker
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar o restante do código
# O contexto de build é ./backend, então COPY . . copia src/, alembic/, etc.
COPY . .

# PYTHONPATH aponta para /app/src onde ficam os pacotes: api, core, domain, services, infrastructure
ENV PYTHONPATH=/app/src:/app

# Expor a porta (documentação)
EXPOSE 8000

# Comando para iniciar a aplicação
# /app/src está no PYTHONPATH, então 'api.main:app' resolve corretamente
CMD sh -c "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"
