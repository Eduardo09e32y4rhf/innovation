$ErrorActionPreference = "Stop"
if (Test-Path ".\.venv\Scripts\Activate.ps1") { & .\.venv\Scripts\Activate.ps1 } else { throw "Sem .venv" }

Write-Host "Checando imports principais..." -ForegroundColor Cyan
python -c "from app.core.security import create_access_token; print('SECURITY OK')"
python -c "from app.db.session import SessionLocal; print('DB OK')"
python -c "from app.api.auth import router; print('AUTH ROUTER OK')"
Write-Host "Tudo OK ✅" -ForegroundColor Green
