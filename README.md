# 🚀 Innovation-Enterprise - Plataforma de Recrutamento & Gestão com IA

![Innovation Enterprise Architecture](https://img.shields.io/badge/Architecture-Microservices-blue)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-green)
![Next.js](https://img.shields.io/badge/Frontend-Next.js_16-black)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue)

Bem-vindo ao repositório oficial da **Innovation-Enterprise**. Esta plataforma unifica recrutamento inteligente (ATS), gestão financeira e operações empresariais em uma arquitetura moderna e escalável.

---

## 🏗️ Arquitetura do Projeto

O sistema é dividido em dois componentes principais (Monorepo):

1.  **Backend (`backend/`)**: API RESTful desenvolvida em Python com **FastAPI**.
    *   **Autenticação**: JWT (JSON Web Tokens) com suporte a RBAC.
    *   **Banco de Dados**: SQLAlchemy ORM (PostgreSQL).
    *   **IA**: Integração com Google Gemini Pro.
    *   **Segurança**: Proteção contra ataques (SQLi, XSS, CSRF), Rate Limiting.

2.  **Frontend (`frontend/`)**: Interface moderna desenvolvida em **Next.js 16**.
    *   **Estilização**: Tailwind CSS + Shadcn UI.
    *   **Estado**: React Server Components.

---

## 🚂 Como Deployar no Railway (Recomendado)

Este projeto foi otimizado para deploy no **Railway** como um Monorepo.

### Passo 1: Fork/Clone
Certifique-se de que este repositório está no seu GitHub.

### Passo 2: Criar Projeto no Railway
1.  Acesse [railway.app](https://railway.app) e crie um novo projeto ("New Project").
2.  Selecione "Deploy from GitHub repo" e escolha este repositório.

### Passo 3: Configurar Serviços (Monorepo)
O Railway importará o repo. Você precisará adicionar dois serviços (um para o backend, outro para o frontend).

#### **Serviço 1: Backend**
*   No painel do Railway, vá em Settings -> **Root Directory** e mude para: `/backend`
*   No **Start Command**, verifique se está: `uvicorn src.api.main:app --host 0.0.0.0 --port $PORT`
*   Adicione as **Variáveis de Ambiente**:
    *   `DATABASE_URL`: (Adicione um plugin PostgreSQL no Railway e use a URL interna)
    *   `SECRET_KEY`: Gere uma string aleatória segura.
    *   `GEMINI_API_KEY`: Sua chave da API do Google Gemini.
    *   `MP_ACCESS_TOKEN`: Token do Mercado Pago (se usar pagamentos).

#### **Serviço 2: Frontend**
*   Adicione um novo serviço ("+ New" -> "GitHub Repo" -> mesmo repo).
*   Vá em Settings -> **Root Directory** e mude para: `/frontend`
*   No **Start Command**, use: `npm start`
*   Adicione as **Variáveis de Ambiente**:
    *   `NEXT_PUBLIC_API_URL`: A URL pública do serviço do Backend (ex: `https://backend-production.up.railway.app`)

### 4. Deploy
O Railway fará o build e deploy automaticamente.

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
*   Python 3.10+
*   Node.js 18+

### 1. Backend
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn src.api.main:app --reload
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🛡️ Segurança
O projeto segue práticas rigorosas de segurança:
*   **Validação**: Pydantic v2.
*   **Auth**: OAuth2 com Password Flow (JWT).
*   **Rate Limiting**: `slowapi`.

---

## 🤝 Contribuição
1.  Fork o projeto.
2.  Crie uma Branch (`git checkout -b feature/NovaFeature`).
3.  Commit (`git commit -m 'Add some feature'`).
4.  Push (`git push origin feature/NovaFeature`).
5.  Open a Pull Request.

---
**Innovation-Enterprise © 2026**
