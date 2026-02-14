# 🚀 Innovation.ia - Plataforma de Recrutamento & Gestão Financeira com IA

[![Security](https://img.shields.io/badge/Security-Hardened-green.svg)](./innovation/docs/SECURITY_FIXES.md)
[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.128+-00a393.svg)](https://fastapi.tiangolo.com/)
[![AI](https://img.shields.io/badge/AI-Gemini_Pro-blueviolet.svg)](https://ai.google.dev/)

> **Plataforma SaaS completa que combina Recrutamento Inteligente, Gestão Financeira e Segurança Enterprise-grade.**

---

## 🎯 Visão Geral

O **Innovation.ia** evoluiu para um ecossistema de gestão empresarial integrado:

<<<<<<< HEAD
- ✅ **Backend FastAPI:** Arquitetura robusta, assíncrona e segura.
- ✅ **Gestão Financeira:** Controle de fluxo de caixa com precisão decimal (`Decimal`), previsões via IA e detecção de anomalias.
- ✅ **Recrutamento IA:** Triagem inteligente, matching candidato-vaga e análise de perfis com Google Gemini Pro.
- ✅ **Segurança Avançada:**
    - Autenticação JWT com Refresh Tokens.
    - 2FA (Dois Fatores) via Twilio/SendGrid.
    - Proteção contra IDOR e Rate Limiting.
    - CORS restrito e validação rigorosa de inputs (Pydantic V2).
=======
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
>>>>>>> origin/feature/project-evaluation-and-cleanup-6642120096084795944

---

## 🔐 Recursos de Segurança (Hardened)

<<<<<<< HEAD
O projeto implementa rigorosos padrões de segurança:

| Recurso | Descrição |
|---------|-----------|
| **Precisão Financeira** | Uso de `Decimal` para evitar erros de ponto flutuante em transações. |
| **RBAC** | Controle de acesso baseado em funções (Company vs Candidate) em todas as rotas críticas. |
| **2FA Database-Backed** | Códigos temporários seguros com expiração e limite de tentativas. |
| **Proteção de Dados** | Senhas hash com Bcrypt e validação de `max_length` para prevenir DoS. |
=======
- **Web Admin** é protótipo estático com dados em localStorage (não integrado à API ainda).
- **App Flutter** contém a estrutura básica de telas mas requer integração total com a API.
- **Recuperação de senha** no app está como placeholder.
>>>>>>> origin/feature/project-evaluation-and-cleanup-6642120096084795944

---

## 📂 Estrutura do Projeto

<<<<<<< HEAD
```bash
innovation.ia/
├── innovation/              # 🔹 BACKEND (Python)
│   ├── alembic/            # Migrações de Banco de Dados
│   ├── app/
│   │   ├── api/            # Endpoints REST (Auth, Jobs, Finance...)
│   │   ├── core/           # Configurações, Segurança, Dependências
│   │   ├── models/         # Modelos SQLAlchemy (Banco de Dados)
│   │   ├── schemas/        # Schemas Pydantic (Validação)
│   │   ├── services/       # Lógica de Negócio (IA, Finance, Auth)
│   │   └── db/             # Sessão de Banco
│   ├── tests/              # Testes Automatizados (Pytest)
│   └── requirements.txt    # Dependências do Python
│
├── web-test/               # 🎨 FRONTEND (HTML/CSS/JS)
│   ├── company/            # Portal da Empresa (Dashboard, Vagas)
│   └── common/             # Assets Compartilhados
│
└── requirements.txt        # Dependências Globais
```

---

## 🏃 Começo Rápido (Quick Start)

### 1️⃣ Instalação

```bash
# Instalar dependências
pip install -r requirements.txt
```

### 2️⃣ Configuração do Ambiente

Crie um arquivo `.env` na pasta `innovation/`:

```env
DATABASE_URL=sqlite:///./innovation.db
SECRET_KEY=sua_chave_secreta_super_segura
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30
GEMINI_API_KEY=sua_chave_gemini
ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:5500
```

### 3️⃣ Banco de Dados

O projeto usa **Alembic** para gerenciar o esquema do banco de dados.

=======
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

>>>>>>> origin/feature/project-evaluation-and-cleanup-6642120096084795944
```bash
cd innovation
alembic upgrade head
```

<<<<<<< HEAD
### 4️⃣ Execução

Inicie o servidor backend:

```bash
# Na raiz do projeto (ou dentro de innovation/)
uvicorn innovation.app.main:app --reload
```

Acesse a documentação da API em: `http://localhost:8000/docs`

---

## 🧪 Testes

Os testes cobrem segurança, lógica financeira e integridade do banco de dados.

```bash
# Rodar todos os testes
PYTHONPATH=innovation pytest innovation/tests/
```

=======
>>>>>>> origin/feature/project-evaluation-and-cleanup-6642120096084795944
---

## 👨‍💻 Autor

<<<<<<< HEAD
**Eduardo Silva**  
Inovando a gestão empresarial através da Tecnologia e Inteligência Artificial.

---

**Proprietary** - Innovation.ia © 2026
=======
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
>>>>>>> origin/feature/project-evaluation-and-cleanup-6642120096084795944
