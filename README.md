# 🚀 Innovation-Enterprise - Plataforma de Recrutamento & Gestão com IA

[![Arquitetura](https://img.shields.io/badge/Architecture-Enterprise--Grade-gold.svg)](#)
[![Security](https://img.shields.io/badge/Security-Hardened-green.svg)](#)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Elite-00a393.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-blue.svg)](#)
[![Docker](https://img.shields.io/badge/Docker-Enterprise-blue.svg)](#)

> **O ecossistema definitivo para escalabilidade global.** Unindo recrutamento inteligente, gestão financeira enterprise e agentes autônomos de IA.

---

## 🏗️ Arquitetura Global (Nível Gupy)

O projeto segue agora uma estrutura modular e escalável, preparada para microsserviços e alta performance:

```bash
innovation-enterprise/
├── backend/                    # 🧠 O CÉREBRO (API Python/FastAPI)
│   ├── src/                    # Código Fonte (Clean Architecture)
│   └── tests/                  # Testes Automatizados
│
├── frontend-next/              # 🎨 NOVA INTERFACE (Next.js 16 + App Router)
│   ├── app/                    # Páginas e Layouts (Server Components)
│   └── components/             # UI Kit e Componentes Reutilizáveis
│
├── frontend/                   # 🏛️ LEGADO (Landing Page Marketing)
│
├── ai_engine/                  # 🤖 AGENTES DE IA (Gemini Pro)
│   ├── agents/                 # Recruiter Agent, Finance Auditor
│   └── worker.py               # Celery Worker para Background Tasks
│
├── k8s/                        # ☸️ KUBERNETES (Manifests de Produção)
│
├── docker-compose.enterprise.yml # 🐳 Setup Full Scale (Kong, Kafka, etc)
│
└── ops/                        # 🛠️ INFRA (Docker, Render, Vercel)
    └── docker-compose.yml      # Setup Padrão
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

## 🏃 Como Rodar

### 1️⃣ Configure suas chaves
Crie um arquivo `.env` na raiz do projeto:
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=innovation_db
REDIS_URL=redis://redis:6379/0
SECRET_KEY=sua_chave_secreta
GEMINI_API_KEY=sua_chave_gemini
```

### 2️⃣ Escolha seu modo de execução

#### 🐳 Opção 1: Docker (Padrão)
Ideal para testar o sistema completo rapidamente.
```bash
cd ops
docker-compose up --build
```

#### 🏢 Opção 2: Docker (Enterprise Simulation)
Simula um ambiente de grande escala com Kong, Kafka, Prometheus, etc.
```bash
docker-compose -f docker-compose.enterprise.yml up --build
```

#### ☸️ Opção 3: Kubernetes (Produção)
Para deploy em cluster K8s.
```bash
./deploy_k8s.ps1
```

#### 💻 Opção 4: Desenvolvimento Local
Para trabalhar no código.

**Backend:**
```bash
./run_backend.ps1
# ou
cd backend && uvicorn src.api.main:app --reload
```

**Frontend (Next.js):**
```bash
cd frontend-next
npm install
npm run dev
```

---

## 👨‍💻 Status do Projeto
- [x] Agente de Recrutamento & Triagem (ATS) com Gemini Pro.
- [x] Módulo Financeiro com Fluxo de Caixa e Integração Mercado Pago.
- [x] Gestão de Projetos (Kanban) e Chamados de Suporte (Service Desk).
- [x] Interface Futurista "Glassmorphism" Responsiva.
- [x] Agentes de IA em Background (Jules & Claude).

---
**Innovation-Enterprise © 2026** - Escalando o futuro com inteligência.
