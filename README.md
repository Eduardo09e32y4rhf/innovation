# 🚀 Innovation.ia 
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

---

## 📱 App Flutter (Candidato)

```powershell
cd innovation_app
flutter pub get
flutter run
```

> A URL da API está em [`innovation_app/lib/services/api_client.dart`](innovation_app/lib/services/api_client.dart).

---

## 🧩 Web Admin (Empresa)

Protótipo estático em [`web-test/`](web-test/).

Abra o arquivo [`web-test/index.html`](web-test/index.html) no navegador.

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
