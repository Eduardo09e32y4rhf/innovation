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
COPY . .

# PYTHONPATH aponta para onde os pacotes (api, core, etc) estão
ENV PYTHONPATH=/app/src:/app

# Expor a porta
EXPOSE 8000

# Única fonte de verdade para o comando
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
