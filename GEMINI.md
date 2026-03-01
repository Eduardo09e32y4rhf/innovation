# Innovation.ia — Enterprise OS (Contexto de Projeto)

Este arquivo fornece contexto profundo para o Gemini CLI entender a arquitetura, objetivos e padrões de desenvolvimento do ecossistema Innovation.ia.

## 🚀 Visão Geral
A **Innovation.ia** é uma plataforma SaaS Next-Gen baseada em microserviços. Unifica IA, recrutamento (ATS), financeiro e analytics em um único sistema operacional corporativo.

## 🏗️ Arquitetura (Microserviços)
O sistema é composto pelos seguintes componentes principais:

### 1. Gateway (Kong)
- **Local:** `http://localhost:8000`
- **Função:** Ponto de entrada único, autenticação centralizada e roteamento.

### 2. Backend (FastAPI)
- **Caminho:** `/backend`
- **Tecnologia:** Python, FastAPI, SQLAlchemy, PostgreSQL.
- **Módulos:**
  - `auth`: Gestão de usuários e permissões (RBAC).
  - `ai`: Integração com Gemini Pro para análise de currículos e DISC.
  - `core`: Lógica de negócios, missões e gamificação.
  - `finance`: Integração com Mercado Pago e fluxo de caixa.

### 3. Frontend (Next.js)
- **Caminho:** `/frontend`
- **Tecnologia:** React, Next.js 16+, Tailwind CSS, Framer Motion.
- **Características:** Dashboard premium, glassmorphism e micro-animações.

### 4. AI Engine
- **Caminho:** `/ai_engine`
- **Função:** Trabalhadores (workers) assíncronos para processamento pesado de IA.

### 5. Infraestrutura
- **Docker:** Orquestração completa via `docker-compose.yml`.
- **Banco de Dados:** PostgreSQL centralizado.

## 🛠️ Padrões de Desenvolvimento

### Backend (Python/FastAPI)
- Use Pydantic para validação de dados.
- Siga o padrão de Repositórios/Serviços para separação de preocupações.
- As rotas de IA utilizam um sistema de rotação de chaves (`core/ai_key_manager.py`).

### Frontend (Next.js/React)
- Componentes reutilizáveis em `frontend/src/components/ui`.
- Framer Motion para animações fluidas.
- Consumo de API sempre via Gateway (`/api/...`).

## 📋 Comandos Úteis
- `scripts/iniciar_local.ps1`: Inicia todos os containers via PowerShell.
- `scripts/parar_tudo.ps1`: Para e limpa o ambiente.
- `scripts/reparo_total.sh`: Script de auto-cura para dependências e infra.

## 🎯 Objetivo "Nível Fllu"
O nível **Fllu (Full Level)** consiste em maximizar a eficiência operacional através da integração total entre os microserviços e a inteligência contextual. 
Ao interagir com este projeto via Gemini CLI:
1. Priorize soluções que respeitem o isolamento dos microserviços.
2. Utilize o Plan Mode para arquitetar mudanças complexas antes da execução.
3. Foque em UX/UI premium para qualquer alteração no frontend.
