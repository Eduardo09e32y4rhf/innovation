# Innovation - Instalador rápido (Windows / PowerShell)

Objetivo: deixar o projeto "instalado" no seu `.venv` (editable install), para **parar** com:
- `ModuleNotFoundError: No module named 'app'`
- depender de `PYTHONPATH` / rodar sempre na mesma pasta

## Como usar (bem direto)

1) Extraia este ZIP **dentro da pasta do projeto** (a que tem `app/` e `alembic.ini`)
   Exemplo: `C:\Users\eduar\Desktop\innovation.ia\innovation`

2) Abra o PowerShell nessa pasta e rode:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\scripts\install.ps1
```

3) Para rodar:
```powershell
.\scripts\run.ps1
```

4) Para checar imports:
```powershell
.\scripts\check.ps1
```
