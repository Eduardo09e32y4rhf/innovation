# 🚀 Innovation.ia — Plataforma de Recrutamento

Produto de recrutamento com:
- **Backend** em **Python/FastAPI**
- **App Mobile (candidato)** em **Flutter**
- **Web Admin (empresa)** em **HTML + JS**

---

## ✨ Visão geral (estado atual)

### Candidato (App Flutter)
- Login com 2FA
- Listagem de vagas
- Candidatura
- Status da candidatura

Arquivos principais:
- [`innovation_app/lib/presentation/screens/login_screen.dart`](innovation_app/lib/presentation/screens/login_screen.dart)
- [`innovation_app/lib/presentation/screens/dashboard_screen.dart`](innovation_app/lib/presentation/screens/dashboard_screen.dart)
- [`innovation_app/lib/services/auth_service.dart`](innovation_app/lib/services/auth_service.dart)

### Empresa (Web Admin)
- Dashboard simples (navegação)
- Vagas + candidaturas por vaga
- Alteração de status de candidatura
- Histórico de status

Arquivos principais:
- [`web-test/index.html`](web-test/index.html)
- [`web-test/jobs.html`](web-test/jobs.html)
- [`web-test/settings.html`](web-test/settings.html)

### Backend (FastAPI)
- Endpoints de **jobs** e **applications**
- Autenticação via JWT
- Regras de assinatura ativa para endpoints de empresa

Arquivos principais:
- [`innovation/app/api/jobs.py`](innovation/app/api/jobs.py)
- [`innovation/app/api/applications.py`](innovation/app/api/applications.py)
- [`innovation/app/core/dependencies.py`](innovation/app/core/dependencies.py)

---

## ⚠️ Limitações atuais (transparentes)

- **Web Admin** é protótipo estático (sem login próprio).
- Endpoints de empresa podem exigir **JWT** e **assinatura ativa** (HTTP 401/402).
- **Recuperação de senha** no app está como placeholder.

---

## ✅ Requisitos

- **Python 3.10+**
- **pip**
- **Flutter SDK**

> No Windows, use `py` no lugar de `python`.

---

## 🔧 Variáveis de ambiente (backend)

As variáveis são carregadas de `innovation/.env` (ver [`innovation/app/core/config.py`](innovation/app/core/config.py:1)).

Obrigatórias:
- `DATABASE_URL` (ex: `sqlite:///./innovation.db` ou Postgres)
- `SECRET_KEY` (string aleatória para JWT)
- `MP_ACCESS_TOKEN` (Mercado Pago)

Opcionais (conforme uso):
- `MP_PUBLIC_KEY`
- `SENDGRID_FROM_EMAIL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_PHONE`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `TERMS_VERSION`

> 2FA: o backend exige validação se o usuário tiver `two_factor_enabled=true` (ver [`innovation/app/api/auth.py`](innovation/app/api/auth.py:35)). No app, a UI informa que 2FA está desativado para testes (ver [`innovation_app/lib/presentation/screens/login_screen.dart`](innovation_app/lib/presentation/screens/login_screen.dart:83)).

---

## ⚡ Backend (FastAPI)

### Instalação

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r innovation/requirements.txt
```

### Rodar o backend

Opção 1 (scripts do projeto):

```powershell
./innovation/scripts/run.ps1
```

Opção 2 (manual):

```powershell
cd innovation
uvicorn app.main:app --reload
```

### Smoke test (backend)

1) Health check:
```powershell
curl http://localhost:8000/
```
Esperado: `{"status":"API rodando"}` (ver [`innovation/app/main.py`](innovation/app/main.py:38)).

2) Swagger:
Abra `http://localhost:8000/docs` no navegador.

### Seed de dados (opcional)

Existe um script simples para planos em [`innovation/app/db/seeds.py`](innovation/app/db/seeds.py:1).

```powershell
cd innovation
py -c "from app.db.seeds import seed_plans; seed_plans()"
```

---

## 📱 App Flutter (Candidato)

```powershell
cd innovation_app
flutter pub get
flutter run
```

Configurar base URL da API (default: `https://innovation-api.onrender.com`):

```powershell
flutter run --dart-define=API_BASE_URL=http://localhost:8000
```

> A URL da API está em [`innovation_app/lib/services/api_client.dart`](innovation_app/lib/services/api_client.dart:59).

---

## 🧩 Web Admin (Empresa)

Protótipo estático em [`web-test/`](web-test/).

Abra o arquivo [`web-test/index.html`](web-test/index.html) no navegador.

### Smoke test (web)

- Abrir `web-test/index.html`.
- Navegar para **Jobs** e **Settings** para validar carregamento de layout.

---

## ✅ Smoke test (fluxo básico)

1) Backend rodando e `GET /` respondendo OK.
2) App Flutter inicia e carrega tela de login.
3) Web Admin abre localmente (HTML estático).

---

## 🗂 Estrutura de pastas (resumo)

```
innovation/          # Backend FastAPI
innovation_app/      # App Flutter (candidato)
web-test/            # Web Admin (HTML/JS)
plans/               # Documentação e planos
```

---

## 🧾 Licença

Projeto privado / uso interno.
