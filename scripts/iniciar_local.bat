@echo off
echo ====================================================
echo   Innovation.ia - Iniciando Servidores...
echo ====================================================

echo.
echo [1/2] Abrindo backend...
start "BACKEND" /min cmd /k "cd backend && set PYTHONPATH=. && set ALLOWED_ORIGINS=http://localhost:3000 && python server.py"

echo [2/2] Abrindo frontend...
start "FRONTEND" /min cmd /k "cd FRONTEND && npm run dev"

echo.
echo ====================================================
echo   Servidores iniciados em segundo plano!
echo   Aguarde ~20 segundos e acesse:
echo.
echo   http://localhost:3000/login              (Login)
echo   http://localhost:8000/docs               (API Swagger)
echo ====================================================
