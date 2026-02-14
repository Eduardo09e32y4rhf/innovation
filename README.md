# 🚀 Innovation-Enterprise - Plataforma de Recrutamento & Gestão com IA

[![Arquitetura](https://img.shields.io/badge/Architecture-Enterprise--Grade-gold.svg)](#)
[![Security](https://img.shields.io/badge/Security-Hardened-green.svg)](#)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Elite-00a393.svg)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](#)

> **O ecossistema definitivo para escalabilidade global.** Unindo recrutamento inteligente, gestão financeira enterprise e agentes autônomos de IA.

---

## 🏗️ Arquitetura Global (Nível Gupy)

O projeto segue agora uma estrutura modular e escalável, preparada para microsserviços e alta performance:

```bash
innovation-enterprise/
├── backend/                    # 🧠 O CÉREBRO (API Python/FastAPI)
│   ├── src/
│   │   ├── api/v1/endpoints/   # Rotas versionadas (auth, jobs, finance)
│   │   ├── core/               # Configurações Globais e Segurança
│   │   ├── domain/             # Lógica de Negócio (Models & Schemas)
│   │   ├── infrastructure/     # SQL, NoSQL, Cache (Redis), AI Clients
│   │   └── services/           # Serviços de integração (Auth, Reports)
│   └── tests/                  # Testes Unitários e Integração
│
├── frontend/                   # 🎨 A CARA (React/Next.js e Legado HTML)
│   ├── legacy_web_admin/       # Portal Administrativo
│   └── legacy_web_test/        # Landing Page e Testes
│
├── ai_engine/                  # 🤖 O AGENTE AUTÔNOMO (Workers Jules & Admin IA)
│   ├── agents/                 # Recruiter Agent, Finance Auditor
│   └── worker.py               # Celery/Background Tasks
│
└── ops/                        # 🛠️ OPERAÇÕES & INFRAESTRUTURA
    ├── docker-compose.yml      # Orquestração (App + DB + Redis + Worker)
    └── Dockerfile              # Receita de build otimizada
```

---

## ⚡ Recursos Principais (Enterprise Level)

### 🏎️ Módulo de Cache (Redis)
Utilizamos **Redis** para acelerar o carregamento de dados pesados (como currículos analisados) e gerenciar sessões rápidas, garantindo que o sistema "voe" mesmo com milhares de usuários.

### 🤖 AI Engine & Agentes em Background
A IA (Jules) agora processa tarefas pesadas (como análise profunda de currículos) em **segundo plano** usando **Celery Workers**. Isso libera a API para responder instantaneamente ao usuário enquanto a IA trabalha no background.

### 🐳 Dockerização Completa
O sistema está 100% pronto para rodar em containers, facilitando o deploy em qualquer nuvem (**AWS, Azure, GCP**) com um único comando.

---

## 🏃 Como Rodar (Modo Enterprise)

A forma oficial e mais fácil de rodar o ecossistema completo é usando Docker:

### 1️⃣ Configure suas chaves
Crie um arquivo `.env` na raiz do projeto seguindo o modelo:
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=innovation_db
REDIS_URL=redis://redis:6379/0
SECRET_KEY=sua_chave_secreta
GEMINI_API_KEY=sua_chave_gemini
```

### 2️⃣ Suba o ecossistema com um comando
```bash
cd ops
docker-compose up --build
```

Isso irá iniciar:
- **Banco de Dados** (PostgreSQL)
- **Cache & Message Broker** (Redis)
- **API Principal** (FastAPI na porta 8000)
- **AI Worker** (Agente Jules processando backgrounds)

---

## 👨‍💻 Status do Projeto
- [x] Agente de Recrutamento & Triagem (ATS) com Gemini Pro.
- [x] Módulo Financeiro com Fluxo de Caixa e Integração Mercado Pago.
- [x] Gestão de Projetos (Kanban) e Chamados de Suporte (Service Desk).
- [x] Interface Futurista "Glassmorphism" Responsiva.
- [x] Agentes de IA em Background (Jules & Claude).

---
**Innovation-Enterprise © 2026** - Escalando o futuro com inteligência.
