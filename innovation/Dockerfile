FROM python:3.9-slim-buster

WORKDIR /app

COPY requirements.txt ./innovation/requirements.txt
RUN pip install --no-cache-dir -r ./innovation/requirements.txt

COPY . .

EXPOSE 8000

CMD ["gunicorn", "innovation.app.main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]