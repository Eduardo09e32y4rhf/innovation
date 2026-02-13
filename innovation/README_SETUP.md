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

---

## Variáveis de ambiente (backend)

Crie `innovation/.env` (mesma pasta do `app/`) com:

```env
DATABASE_URL=sqlite:///./innovation.db
SECRET_KEY=change_me
MP_ACCESS_TOKEN=change_me
```

Opcionais: `MP_PUBLIC_KEY`, `SENDGRID_FROM_EMAIL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_PHONE`.

> A carga do `.env` é feita por [`innovation/app/core/config.py`](innovation/app/core/config.py:1).
