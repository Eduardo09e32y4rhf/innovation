@echo off
REM ==========================================
REM Innovation.ia - Launcher Full Enterprise
REM ==========================================
color 0D
cls

echo.
echo  ╔══════════════════════════════════════╗
  ║   INNOVATION.IA - ENTERPRISE OS      ║
  ╚══════════════════════════════════════╝
echo.

REM 1. Limpeza de processos antigos
echo [1/3] Limpando ambiente...
taskkill /F /IM electron.exe >nul 2>&1
REM Mata qualquer processo na porta 3001 (Microservico)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

REM 2. Iniciando Microserviço de WhatsApp (em segundo plano)
echo [2/3] Iniciando Microservico WhatsApp (Porta 3001)...
cd WHATSAPP
start /B node microservice.js
cd ..

REM Aguarda 2 segundos para o microservico subir
timeout /t 3 /nobreak >nul

REM 3. Iniciando o Aplicativo Desktop
echo [3/3] Iniciando Innovation.ia Desktop...
echo.
npx electron apps/desktop/dist/main.js

echo.
echo [!] Aplicativo fechado.
pause
