@echo off
REM ==========================================
REM Innovation.ia - Launcher de Teste Rapido
REM ==========================================
color 0B
cls

echo.
echo  ╔══════════════════════════════════════╗
echo  ║   INNOVATION.IA - MODO TESTE         ║
echo  ╚══════════════════════════════════════╝
echo.

REM Verifica Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado!
    pause
    exit /b 1
)

echo [OK] Node.js detectado.

REM Verifica se o build do desktop existe
if not exist "apps\desktop\dist\main.js" (
    echo [!] Compilando Electron...
    call npm --prefix apps/desktop run build
    if errorlevel 1 (
        echo [ERRO] Falha ao compilar o Electron.
        pause
        exit /b 1
    )
)

echo [OK] Electron compilado.

REM Verifica se o build do frontend existe
if not exist "apps\web\out\index.html" (
    echo [!] Construindo Frontend (Next.js)...
    call npm --prefix apps/web run build
    if errorlevel 1 (
        echo [ERRO] Falha ao construir o frontend.
        pause
        exit /b 1
    )
)

echo [OK] Frontend pronto.
echo.
echo [INICIANDO] Abrindo Innovation.ia...
echo.

REM Inicia o Electron da RAIZ do projeto apontando para o main.js correto
npx electron apps/desktop/dist/main.js

pause
