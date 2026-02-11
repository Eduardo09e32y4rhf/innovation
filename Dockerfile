FROM python:3.10-slim

WORKDIR /app

# Instala dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código e a pasta web
COPY . .

# Ajusta diretório de trabalho para manter consistência com ../web-test
WORKDIR /app/innovation

# Expõe a porta do FastAPI
EXPOSE 8000

# Comando para rodar
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
