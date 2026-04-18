$ErrorActionPreference = "Stop"

Write-Host "== Innovation.ia bootstrap local ==" -ForegroundColor Cyan

$repoRoot = Join-Path $PSScriptRoot ".."
$composeFile = Join-Path $repoRoot "infrastructure/ops/docker-compose.yml"
$envFile = Join-Path $repoRoot ".env"

if (-not (Test-Path $composeFile)) {
    throw "Compose file nao encontrado: $composeFile"
}

if (-not (Test-Path $envFile)) {
    throw ".env raiz nao encontrado: $envFile"
}

$dockerSvc = Get-Service -Name "com.docker.service" -ErrorAction SilentlyContinue
if ($null -eq $dockerSvc -or $dockerSvc.Status -ne "Running") {
    throw "Docker Desktop nao esta ativo. Inicie o Docker e rode novamente."
}

Push-Location $repoRoot
try {
    Write-Host "Subindo stack..." -ForegroundColor Yellow
    docker compose --env-file ".env" -f "infrastructure/ops/docker-compose.yml" up -d --build

    Write-Host "Executando seed de usuario admin..." -ForegroundColor Yellow
    docker compose --env-file ".env" -f "infrastructure/ops/docker-compose.yml" exec -T auth_service python seed_root_user.py

    Write-Host "Health checks..." -ForegroundColor Yellow
    curl.exe -sS "http://localhost:8001/health"
    Write-Host ""
    curl.exe -sS "http://localhost:8000/"
    Write-Host ""

    Write-Host "Bootstrap concluido com sucesso." -ForegroundColor Green
    Write-Host "Login seed: eduardo998468@gmail.com / senha123" -ForegroundColor Green
}
finally {
    Pop-Location
}
