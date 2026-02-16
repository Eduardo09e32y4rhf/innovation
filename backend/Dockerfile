FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements (assuming build context is backend folder)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Set PYTHONPATH to include src directory
ENV PYTHONPATH=/app/src:/app

# Expose port
EXPOSE 8000

# Run uvicorn (assuming api module is importable via PYTHONPATH)
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
