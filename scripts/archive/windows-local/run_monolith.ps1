$env:PYTHONPATH = "$PSScriptRoot\..\apps\backend\src"
$env:DATABASE_URL = "sqlite:///innovation.db"
if (-not $env:SECRET_KEY) { $env:SECRET_KEY = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N") }
$env:GEMINI_API_KEYS = "dummy-gemini-key"
$env:OPENAI_API_KEY = "sk-dummy-openai-key"
$env:ASAAS_API_KEY = "dummy-asaas-key"

Write-Host "🚀 Iniciando Monolito Innovation.ia (Porta 8000)..." -ForegroundColor Cyan
cd "$PSScriptRoot\..\apps\backend"
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
