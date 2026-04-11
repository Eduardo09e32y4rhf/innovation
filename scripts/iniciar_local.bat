@echo off
echo ====================================================
echo   Innovation.ia - Iniciando Servidores...
echo ====================================================

echo.
echo [1/2] Abrindo backend...
start "BACKEND" cmd /k "cd apps\backend & set PYTHONPATH=src & set ALLOWED_ORIGINS=http://localhost:3000 & echo = BACKEND: http://localhost:8000 = & python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --env-file ..\..\.env"

timeout /t 2 > nul

echo [2/2] Abrindo frontend...
start "FRONTEND" cmd /k "cd apps\frontend & echo = FRONTEND: http://localhost:3000 = & npm run dev"

echo.
echo ====================================================
echo   Duas janelas abertas!
echo   Aguarde ~20 segundos e acesse:
echo.
echo   http://localhost:3000/login              (Login)
echo   http://localhost:3000/dashboard/ponto    (Ponto Eletronico)
echo   http://localhost:3000/dashboard/rh       (Painel RH)
echo   http://localhost:3000/dashboard/analytics (B.I. Analytics)
echo   http://localhost:8000/docs               (API Swagger)
echo ====================================================
