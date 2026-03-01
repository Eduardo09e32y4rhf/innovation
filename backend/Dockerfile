FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema para psycopg2, curl (healthcheck) e outras
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements da pasta backend (já que o contexto do docker-compose é a raiz do projeto)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar o restante do código
COPY . .

# PYTHONPATH aponta para onde os pacotes (api, core, etc) estão (suportando tanto o contexto backend/ quanto o contexto root /)
ENV PYTHONPATH=/app/backend/src:/app/src:/app

# Expor a porta
EXPOSE 8000

# Única fonte de verdade para o comando
# Usamos Gunicorn com 2 workers para evitar pico de memória
CMD ["gunicorn", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "api.main:app", "--bind", "0.0.0.0:8000", "--timeout", "120"]
