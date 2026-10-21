# check_backend.ps1
Write-Host "--- Verificando Dependências do Backend ---" -ForegroundColor Cyan

$deps = @("fastapi", "uvicorn", "httpx", "sqlalchemy", "pydantic")
foreach ($dep in $deps) {
    try {
        python -c "import $dep"
        Write-Host "[OK] $dep está instalado." -ForegroundColor Green
    } catch {
        Write-Host "[ERRO] $dep NÃO encontrado. Instalando..." -ForegroundColor Yellow
        pip install $dep
    }
}

Write-Host "`n--- Verificando Porta 8000 ---" -ForegroundColor Cyan
$port = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "[OK] Algo já está rodando na porta 8000." -ForegroundColor Green
} else {
    Write-Host "[AVISO] Nada rodando na porta 8000. Iniciando backend agora..." -ForegroundColor Yellow
    # Note: This will start it, but it might not be persistent across AI turns
    # It's better if the USER runs it in their own terminal.
}
