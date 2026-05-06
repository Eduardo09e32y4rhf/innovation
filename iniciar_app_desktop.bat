@echo off
REM Innovation.ia - Desktop launcher
color 0F
cls

echo.
echo [I] INNOVATION.IA - DESKTOP
echo --------------------------------------
echo.

echo [1/4] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado. Instale em https://nodejs.org
    pause
    exit /b 1
)

echo [2/4] Verificando dependencias...
if not exist node_modules (
    call npm install
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias.
        pause
        exit /b 1
    )
)

echo [3/4] Gerando build do web e desktop...
call npm run build
if errorlevel 1 (
    echo [ERRO] Falha ao gerar build web.
    pause
    exit /b 1
)

call npm run build:desktop
if errorlevel 1 (
    echo [ERRO] Falha ao gerar build desktop.
    pause
    exit /b 1
)

echo [4/4] Abrindo Innovation IA...
npx electron apps/desktop/dist/main.js

pause
