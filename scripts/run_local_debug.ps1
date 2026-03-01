# run_local_debug.ps1

$ROOT = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# Backend
Write-Host "Starting backend..."
cd $ROOT\backend
$env:PYTHONPATH='src'
$env:OPENAI_API_KEY='<SUA_CHAVE_OPENAI_AQUI>'
$env:GEMINI_API_KEYS='AIzaSyD9ejCdvSK5_oGIOKUCJgkBngNvWKGhwQo'
$env:MP_ACCESS_TOKEN='TEST-6557276044940245-122113-96e11c5a6415e5d9d5af0957ff0dc294-419957141'
$env:SECRET_KEY='innovation_v2_premium_dark'
$env:DATABASE_URL="sqlite:///$ROOT/backend/innovation_rh.db"
$env:ALLOWED_ORIGINS='http://localhost:3000'
Start-Job -ScriptBlock { python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload }

# Frontend
Write-Host "Starting frontend..."
cd $ROOT\frontend
npm run dev
