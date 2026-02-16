# 🚀 Innovation-Enterprise - Plataforma de Recrutamento & Gestão com IA

![Innovation Enterprise Architecture](https://img.shields.io/badge/Architecture-Microservices-blue)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-green)
![Next.js](https://img.shields.io/badge/Frontend-Next.js_16-black)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue)

Bem-vindo ao repositório oficial da **Innovation-Enterprise**. Esta plataforma unifica recrutamento inteligente (ATS), gestão financeira e operações empresariais em uma arquitetura moderna e escalável.

---

## 🏗️ Arquitetura do Projeto

O sistema é dividido em dois componentes principais:

1.  **Backend (`backend/`)**: API RESTful desenvolvida em Python com **FastAPI**.
    *   **Autenticação**: JWT (JSON Web Tokens) com suporte a RBAC (Role-Based Access Control).
    *   **Banco de Dados**: SQLAlchemy ORM (PostgreSQL em produção, SQLite em dev).
    *   **IA**: Integração com Google Gemini Pro para análise de currículos e chatbots.
    *   **Segurança**: Proteção contra ataques comuns (SQLi, XSS, CSRF), Rate Limiting.

2.  **Frontend (`frontend/`)**: Interface moderna desenvolvida em **Next.js 16** (App Router).
    *   **Estilização**: Tailwind CSS + Shadcn UI.
    *   **Estado**: React Server Components e Client Components otimizados.

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos
*   Python 3.10+
*   Node.js 18+
*   Docker (opcional, mas recomendado)

### 1. Configuração do Backend

```bash
cd backend

# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente (.env)
cp .env.example .env  # Crie um .env baseado no exemplo se houver
# Exemplo básico de .env:
# DATABASE_URL=sqlite:///./sql_app.db
# SECRET_KEY=sua_chave_secreta_super_segura

# Rodar migrações (se necessário)
alembic upgrade head

# Iniciar o servidor
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

O Backend estará rodando em `http://localhost:8000`.
Documentação da API (Swagger UI): `http://localhost:8000/docs`

### 2. Configuração do Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

O Frontend estará rodando em `http://localhost:3000`.

---

## 🛡️ Segurança (Hacker Mode)

O projeto segue práticas rigorosas de segurança:
*   **Validação de Input**: Pydantic v2 para validação estrita de dados.
*   **Autenticação**: Senhas hash com Bcrypt, Tokens JWT assinados.
*   **Autorização**: Middleware de verificação de escopo e role.
*   **Rate Limiting**: Proteção contra força bruta em rotas sensíveis (`/login`).

## 🧪 Testes

Para rodar os testes do backend:

```bash
cd backend
pytest
```

---

## 🤝 Contribuição

1.  Faça um Fork do projeto.
2.  Crie uma Branch para sua Feature (`git checkout -b feature/NovaFeature`).
3.  Faça o Commit (`git commit -m 'Add some feature'`).
4.  Push para a Branch (`git push origin feature/NovaFeature`).
5.  Abra um Pull Request.

---
**Innovation-Enterprise © 2024**
