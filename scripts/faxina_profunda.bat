@echo off
set ROOT=c:\Users\eduar\Desktop\innovation.ia
cd /d %ROOT%

echo 🧹 Removendo caches e arquivos compilados...
for /d /r . %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d"
for /d /r . %%d in (.pytest_cache) do @if exist "%%d" rd /s /q "%%d"
del /s /q *.pyc 2>nul

echo 🗑️ Removendo arquivos de lixo e logs...
del /q "%ROOT%\MIGRACAO_LOG.txt" 2>nul
del /q "%ROOT%\deploy.tar.gz" 2>nul
del /q "%ROOT%\REORGANIZACAO_STATUS.md" 2>nul
del /q "%ROOT%\.aider.chat.history.md" 2>nul
del /q "%ROOT%\.aider.input.history" 2>nul
del /q "%ROOT%\INFRA\deployment\dev.pid" 2>nul
del /q "%ROOT%\INFRA\deployment\ops\old_docker-compose.yml" 2>nul
del /q "%ROOT%\logs\*.log" 2>nul

echo 📦 Organizando Scripts...
if not exist "%ROOT%\scripts\tools" mkdir "%ROOT%\scripts\tools"

move "%ROOT%\scripts\reorganizar_blocos.ps1" "%ROOT%\scripts\tools\" 2>nul
move "%ROOT%\scripts\migrar_para_blocos.ps1" "%ROOT%\scripts\tools\" 2>nul
move "%ROOT%\scripts\finalizar_organizacao.bat" "%ROOT%\scripts\tools\" 2>nul
move "%ROOT%\scripts\ajuda.py" "%ROOT%\scripts\tools\" 2>nul
move "%ROOT%\scripts\diagnostico_finance.sh" "%ROOT%\scripts\tools\" 2>nul
move "%ROOT%\scripts\fix-auth.sh" "%ROOT%\scripts\tools\" 2>nul
move "%ROOT%\scripts\fix_conflicts.js" "%ROOT%\scripts\tools\" 2>nul
move "%ROOT%\scripts\innovation-enterprise-setup.ps1" "%ROOT%\scripts\tools\" 2>nul

echo ✨ Limpeza concluida!
