@echo off
echo ====================================================
echo   Innovation.ia - Iniciando Servidores...
echo ====================================================

echo.
echo [1/2] Abrindo API Nest...
start "API" /min cmd /k "cd /d %~dp0\.. && npm run dev:api"

echo [2/2] Abrindo frontend Next...
start "WEB" /min cmd /k "cd /d %~dp0\.. && npm run dev:web"

echo.
echo ====================================================
echo   Servidores iniciados em segundo plano!
echo   Aguarde ~20 segundos e acesse:
echo.
echo   http://localhost:3000                    (App Web)
echo   http://localhost:3000/dashboard          (Dashboard)
echo   http://localhost:3333/docs               (API Swagger)
echo ====================================================
