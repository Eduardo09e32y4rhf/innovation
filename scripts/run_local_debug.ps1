# run_local_debug.ps1

$ROOT = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# Lê as variáveis do .env
$envFile = "$ROOT\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match "^[^#]+=.*" } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        [Environment]::SetEnvironmentVariable($name, $value.Trim(), "Process")
    }
    Write-Host "Variáveis de ambiente carregadas de .env" -ForegroundColor Green
} else {
    Write-Host "Arquivo .env não encontrado. Iniciando sem variáveis adicionais." -ForegroundColor Yellow
}

# Backend
Write-Host "Starting backend..."
cd $ROOT\backend
$env:PYTHONPATH='src'
$env:DATABASE_URL="sqlite:///$ROOT/backend/innovation_rh.db"
$env:ALLOWED_ORIGINS='http://localhost:3000'
Start-Job -ScriptBlock { python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload }

# Frontend
Write-Host "Starting frontend..."
cd $ROOT\frontend
npm run dev
