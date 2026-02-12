# 🚀 Innovation.ia - Plataforma de Recrutamento com IA

[![Security](https://img.shields.io/badge/Security-Hardened-green.svg)](./innovation/docs/SECURITY_FIXES.md)
[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.128+-00a393.svg)](https://fastapi.tiangolo.com/)
[![IA](https://img.shields.io/badge/AI-Gemini_Pro-blueviolet.svg)](https://ai.google.dev/)

> **Plataforma SaaS completa de recrutamento que combina Inteligência Artificial, agendamento inteligente e segurança enterprise-grade.**

---

## 🎯 Visão Geral

O **Innovation.ia** é um ecossistema de recrutamento moderno projetado para automatizar o ciclo completo de contratação:

- ✅ **Backend FastAPI:** Arquitetura robusta, assíncrona e altamente segura.
- ✅ **IA Gemini Pro:** Triagem inteligente, matching candidato-vaga e análise de perfis.
- ✅ **Google Calendar:** Sincronização automática de entrevistas via OAuth 2.0.
- ✅ **SendGrid:** Automação total de convites, confirmações e lembretes por e-mail.
- ✅ **ViaCEP:** Integração nativa para preenchimento instantâneo de endereços.
- ✅ **Segurança 2FA:** Autenticação de dois fatores com Rate Limiting e Auditoria.

---

## 🔐 Recursos de Segurança (Hardened)

O projeto implementa rigorosos padrões de segurança para garantir a integridade dos dados:

| Recurso | Descrição |
|---------|-----------|
| **2FA Database-Backed** | Códigos 2FA persistentes e seguros via tokens temporários. |
| **JWT Refresh Tokens** | Sistema de tokens de curta duração com renovação via DB. |
| **Rate Limiting** | Proteção contra brute-force em endpoints críticos (Auth, 2FA). |
| **Auditoria Local** | Logs detalhados de todas as ações sensíveis no sistema. |
| **CORS Seguro** | Configuração restrita para origens autorizadas. |

---

## � Estrutura do Projeto

```bash
innovation.ia/
├── innovation/              # 🔹 BACKEND (FastAPI + PostgreSQL)
│   ├── app/
│   │   ├── api/            # Endpoints REST (Auth, Jobs, Calendar, Chat...)
│   │   ├── core/           # Configurações, Segurança, Dependências
│   │   ├── models/         # Modelos SQLAlchemy (Banco de Dados)
│   │   ├── services/       # Lógica de Negócio (IA, Email, Calendar)
│   │   └── db/             # Sessão de Banco, Migrações e Seeds
│   ├── docs/               # 📚 Documentação Técnica (Segurança, Admin)
│   ├── tests/              # Testes Automatizados (Pytest)
│   └── requirements.txt    # Dependências do Python
│
├── web-test/               # 🎨 WEB ADMIN (HTML/CSS/JS)
│   ├── index.html          # Landing Page Principal
│   ├── company/            # Portal da Empresa (Dashboard, Vagas, Config)
│   └── common/             # Assets Compartilhados (Tailwind, FontAwesome)
│
├── innovation_app/          # 📱 MOBILE APP (Flutter para Candidatos)
└── Dockerfile              # Configuração para Deploy em Containers
```

---

## 🏃 Começo Rápido (Quick Start)

### 1️⃣ Instalação

```bash
cd innovation
python -m venv .venv
.venv\Scripts\activate  # No Windows
pip install -r requirements.txt
```

### 2️⃣ Configuração do Ambiente

Crie um arquivo `.env` na pasta `innovation/` baseado no `.env.example`:

```env
DATABASE_URL=sqlite:///./innovation.db
SECRET_KEY=sua_chave_secreta_aqui
GEMINI_API_KEY=sua_chave_gemini
GOOGLE_CLIENT_ID=seu_client_id_google
SENDGRID_API_KEY=sua_id_sendgrid
```

> 📖 Consulte o [**Guia de Credenciais**](./CREDENTIALS_SETUP.md) para detalhes de configuração.

### 3️⃣ Execução

```bash
# Sincronizar banco de dados
alembic upgrade head
python -m app.db.seed

# Iniciar servidor
uvicorn app.main:app --reload
```

---

## 🛠️ Stack Tecnológica

### Backend
- **FastAPI** - Performance e rapidez no desenvolvimento.
- **SQLAlchemy 2.0** - ORM moderno para manipulação de dados.
- **Alembic** - Gerenciamento profissional de migrações de DB.
- **JWT & OAuth 2.0** - Autenticação e integrações seguras.

### Inteligência Artificial
- **Google Gemini Pro** - Processamento de linguagem natural e triagem.

### Frontend
- **HTML5 / Vanilla JS** - Agilidade e controle total sobre o DOM.
- **TailwindCSS** - Design moderno e responsivo.
- **Chart.js** - Dashboards financeiros e estatísticos.

---

## 📚 Documentação Adicional

| Documento | Link |
|-----------|-----------|
| **Guia de Credenciais** | [CREDENTIALS_SETUP.md](./CREDENTIALS_SETUP.md) |
| **Histórico de Correções** | [SECURITY_FIXES.md](./innovation/docs/SECURITY_FIXES.md) |
| **Resumo Executivo** | [EXECUTIVE_SUMMARY.md](./innovation/docs/EXECUTIVE_SUMMARY.md) |
| **Swagger UI** | `http://localhost:8000/docs` |

---

## 👨‍💻 Autor

**Eduardo Silva**  
Inovando o recrutamento através da Tecnologia e Inteligência Artificial.

---

**Proprietary** - Innovation.ia © 2026
