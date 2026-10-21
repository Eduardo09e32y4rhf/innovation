@echo off
set SRC="C:\Users\eduar\Desktop\Omnius AI 6.0"
set DST="C:\Users\eduar\Desktop\innovation.ia\WHATSAPP"

echo 🧹 Limpando destino...
if exist %DST% rd /s /q %DST%
mkdir %DST%

echo 🚀 Copiando arquivos (isso pode levar alguns segundos)...
robocopy %SRC% %DST% /E /R:3 /W:5 /MT:32 > nul

echo ✅ Verificando resultado...
dir %DST%
