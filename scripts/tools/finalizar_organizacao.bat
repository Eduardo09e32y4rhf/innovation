@echo off
set ROOT=c:\Users\eduar\Desktop\innovation.ia
cd /d %ROOT%

echo 🚀 Organizando Modulos na Raiz...

move "%ROOT%\apps\1-ia" "%ROOT%\IA"
move "%ROOT%\apps\2-whatsapp" "%ROOT%\WHATSAPP"
move "%ROOT%\apps\3-rh" "%ROOT%\RH"
move "%ROOT%\apps\4-financeiro" "%ROOT%\FINANCEIRO"
move "%ROOT%\apps\5-contabilidade" "%ROOT%\CONTABILIDADE"
move "%ROOT%\apps\6-media" "%ROOT%\MEDIA"
move "%ROOT%\apps\7-infra" "%ROOT%\INFRA"
move "%ROOT%\apps\8-frontend" "%ROOT%\FRONTEND"

echo 🧹 Limpando pastas antigas...
rd /s /q "%ROOT%\apps"
rd /s /q "%ROOT%\backend"
rd /s /q "%ROOT%\frontend"

echo ✅ Concluido!
