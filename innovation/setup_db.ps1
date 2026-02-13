Write-Host "Configurando banco de dados..." -ForegroundColor Cyan

# Verifica se está na pasta correta
if ($PWD.Path -notlike "*innovation") {
    if (Test-Path "innovation") {
        Set-Location "innovation"
    }
}

Write-Host "1. Criando tabelas..." -ForegroundColor Yellow
python -c "from app.db.init_db import init_database; init_database()"

Write-Host "2. Populando dados de exemplo..." -ForegroundColor Yellow
python -m app.db.seed

Write-Host "Pronto! Banco configurado." -ForegroundColor Green
Write-Host ""
Write-Host "Use estas credenciais:"
Write-Host "  Admin: admin@innovation.ia / admin123"
Write-Host "  Empresa: empresa1@test.com / senha123"
Write-Host "  Candidato: candidato1@test.com / senha123"
