# 🚀 Innovation.ia - Plataforma de Recrutamento & Gestão Financeira com IA

[![Security](https://img.shields.io/badge/Security-Hardened-green.svg)](./innovation/docs/SECURITY_FIXES.md)
[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.128+-00a393.svg)](https://fastapi.tiangolo.com/)
[![AI](https://img.shields.io/badge/AI-Gemini_Pro-blueviolet.svg)](https://ai.google.dev/)

> **Plataforma SaaS completa que combina Recrutamento Inteligente, Gestão Financeira e Segurança Enterprise-grade.**

---

## 🎯 Visão Geral

O **Innovation.ia** evoluiu para um ecossistema de gestão empresarial integrado:

- ✅ **Backend FastAPI:** Arquitetura robusta, assíncrona e segura.
- ✅ **Gestão Financeira:** Controle de fluxo de caixa com precisão decimal (`Decimal`), previsões via IA e detecção de anomalias.
- ✅ **Recrutamento IA:** Triagem inteligente, matching candidato-vaga e análise de perfis com Google Gemini Pro.
- ✅ **Segurança Avançada:**
    - Autenticação JWT com Refresh Tokens.
    - 2FA (Dois Fatores) via Twilio/SendGrid.
    - Proteção contra IDOR e Rate Limiting.
    - CORS restrito e validação rigorosa de inputs (Pydantic V2).

---

## 🔐 Recursos de Segurança (Hardened)

O projeto implementa rigorosos padrões de segurança:

| Recurso | Descrição |
|---------|-----------|
| **Precisão Financeira** | Uso de `Decimal` para evitar erros de ponto flutuante em transações. |
| **RBAC** | Controle de acesso baseado em funções (Company vs Candidate) em todas as rotas críticas. |
| **2FA Database-Backed** | Códigos temporários seguros com expiração e limite de tentativas. |
| **Proteção de Dados** | Senhas hash com Bcrypt e validação de `max_length` para prevenir DoS. |
| **Proteção de Rotas** | Validação de caminhos (`Path Traversal`) e verificação de assinatura JWT em rotas estáticas protegidas. |

---

## 📂 Estrutura do Projeto

```bash
innovation.ia/
├── innovation/              # 🔹 BACKEND (Python - FastAPI)
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
├── innovation_app/          # 📱 APP MOBILE (Flutter - Candidato)
│
├── web-test/               # 🎨 FRONTEND ADMIN (HTML/CSS/JS - Empresa)
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

```bash
cd innovation
# Inicializar banco
PYTHONPATH=. python app/db/init_db.py
# Aplicar migrações
alembic upgrade head
```

### 4️⃣ Execução

Inicie o servidor backend:

```bash
# Na raiz do projeto
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

---

## 👨‍💻 Autor

**Eduardo Silva**  
Inovando a gestão empresarial através da Tecnologia e Inteligência Artificial.

---

**Proprietary** - Innovation.ia © 2026
