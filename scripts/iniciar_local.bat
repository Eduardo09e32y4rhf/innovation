@echo off
echo ====================================================
3: echo   Innovation.ia - Iniciando Servidores...
4: echo ====================================================
5: 
6: echo.
7: echo [1/2] Abrindo backend...
8: start "BACKEND" cmd /k "cd apps\backend & set PYTHONPATH=src & set ALLOWED_ORIGINS=http://localhost:3000 & echo = BACKEND: http://localhost:8000 = & python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --env-file ..\..\.env"
9: 
10: timeout /t 2 > nul
11: 
12: echo [2/2] Abrindo frontend...
13: start "FRONTEND" cmd /k "cd apps\frontend & echo = FRONTEND: http://localhost:3000 = & npm run dev"
14: 
15: echo.
16: echo ====================================================
17: echo   Duas janelas abertas!
18: echo   Aguarde ~20 segundos e acesse:
19: echo.
20: echo   http://localhost:3000/login              (Login)
21: echo   http://localhost:3000/dashboard/ponto    (Ponto Eletronico)
22: echo   http://localhost:3000/dashboard/rh       (Painel RH)
23: echo   http://localhost:3000/dashboard/analytics (B.I. Analytics)
24: echo   http://localhost:8000/docs               (API Swagger)
25: echo ====================================================
