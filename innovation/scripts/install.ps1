\
$ErrorActionPreference = "Stop"

function Assert-RepoRoot {
  if (!(Test-Path ".\app\main.py")) { throw "Não achei .\app\main.py. Rode isso na pasta do projeto (a que tem app/ e alembic.ini)." }
}

function Ensure-Venv {
  if (!(Test-Path ".\.venv\Scripts\python.exe")) {
    Write-Host "Criando venv (.venv)..." -ForegroundColor Cyan
    python -m venv .venv
  }
  Write-Host "Ativando venv..." -ForegroundColor Cyan
  & .\.venv\Scripts\Activate.ps1
}

function Ensure-EnvFile {
  if (!(Test-Path ".\.env")) {
    Write-Host "Criando .env padrão..." -ForegroundColor Cyan
@"
DATABASE_URL=sqlite:///./innovation.db
SECRET_KEY=super-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
TERMS_VERSION=v1
"@ | Set-Content -Path .\.env -Encoding UTF8
  } else {
    Write-Host ".env já existe (ok)." -ForegroundColor Green
  }
}

Assert-RepoRoot
Ensure-Venv

Write-Host "Atualizando pip/setuptools/wheel..." -ForegroundColor Cyan
python -m pip install -U pip setuptools wheel

Write-Host "Instalando dependências..." -ForegroundColor Cyan
pip install -r .\requirements.txt

Write-Host "Instalando o projeto em modo editable (pip install -e .)..." -ForegroundColor Cyan
pip install -e .

Ensure-EnvFile

if (Test-Path ".\alembic.ini") {
  try {
    Write-Host "Rodando migrations (alembic upgrade head)..." -ForegroundColor Cyan
    alembic upgrade head
  } catch {
    Write-Host "Aviso: falhou rodar Alembic agora. Você pode rodar depois: alembic upgrade head" -ForegroundColor Yellow
  }
}

Write-Host "OK! Ambiente pronto." -ForegroundColor Green
Write-Host "Agora rode: .\scripts\run.ps1" -ForegroundColor Green
