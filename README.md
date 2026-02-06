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
- [`innovation_app/lib/screens/login.dart`](innovation_app/lib/screens/login.dart)
- [`innovation_app/lib/screens/dashboard.dart`](innovation_app/lib/screens/dashboard.dart)

### Empresa (Web Admin)
- Dashboard SPA (Single Page Application)
- Vagas + candidaturas (Mockup)
- Gestão de empresas e planos (Mockup)

Arquivos principais:
- [`web-test/index.html`](web-test/index.html)
- [`web-test/app.js`](web-test/app.js)

### Backend (FastAPI)
- Endpoints de **jobs** e **applications** com validação Pydantic
- Autenticação via JWT
- Auditoria de eventos

Arquivos principais:
- [`innovation/app/api/jobs.py`](innovation/app/api/jobs.py)
- [`innovation/app/api/applications.py`](innovation/app/api/applications.py)
- [`innovation/app/core/dependencies.py`](innovation/app/core/dependencies.py)

---

## ⚠️ Limitações atuais (transparentes)

- **Web Admin** é protótipo estático com dados em localStorage (não integrado à API ainda).
- **App Flutter** contém a estrutura básica de telas mas requer integração total com a API.
- **Recuperação de senha** no app está como placeholder.

---

## ✅ Requisitos

- **Python 3.10+**
- **pip**
- **Flutter SDK**

---

## 🔧 Variáveis de ambiente (backend)

As variáveis são carregadas de `innovation/.env`.

Obrigatórias:
- `DATABASE_URL` (ex: `sqlite:///./test.db`)
- `SECRET_KEY` (string aleatória para JWT)

---

## ⚡ Backend (FastAPI)

### Instalação

```bash
pip install -r innovation/requirements.txt
```

### Inicialização do Banco

```bash
cd innovation
PYTHONPATH=. python app/db/init_db.py
```

### Criar Admin de Teste

```bash
python force_admin.py
```

### Rodar o backend

```bash
cd innovation
uvicorn app.main:app --reload
```

---

## 📱 App Flutter (Candidato)

```bash
cd innovation_app
flutter pub get
flutter run
```

---

## 🧩 Web Admin (Empresa)

Abra o arquivo [`web-test/index.html`](web-test/index.html) no navegador. É uma SPA que simula o painel administrativo.

---

## 🗂 Estrutura de pastas (resumo)

```
innovation/          # Backend FastAPI (Core do Produto)
innovation_app/      # App Flutter (Candidato)
web-test/            # Web Admin Protótipo (Empresa)
plans/               # Documentação e planos
```

---

## 🧾 Licença

Projeto privado / uso interno.
