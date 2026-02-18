# Documentação Técnica - Innovation.ia

## Visão Geral
A **Innovation.ia** é uma plataforma de Gestão de IA para RH e Recrutamento, com funcionalidades avançadas de análise de candidatos, gestão financeira simplificada e integrações com Google Workspace.

Este documento detalha a arquitetura atual, o fluxo de pagamentos por assinatura, e o roadmap para migração AWS.

---

## 1. Arquitetura do Sistema

### Backend (Python/FastAPI)
- **Framework:** FastAPI
- **Banco de Dados:** SQLite (Dev) / PostgreSQL (Prod) via SQLAlchemy.
- **Autenticação:** JWT com RBAC (Roles: `admin`, `company`, `candidate`).
- **Integrações:**
  - **Mercado Pago:** Pagamentos recorrentes (Assinaturas).
  - **Google Suite:** Stub pronto para integração com Calendar e Meet.
  - **Gemini AI:** Análise de currículos e perfis comportamentais.

### Frontend (Next.js 16)
- **Estilização:** Tailwind CSS v4 + Framer Motion.
- **Estado:** React Hooks + Axios services.
- **Componentes:** Dashboard interativo com gráficos (mockados visualmente, dados reais via API).

---

## 2. Fluxo de Pagamentos (Streaming Model)

A plataforma utiliza o modelo de **Assinatura Recorrente** (semelhante a serviços de streaming), onde o cliente paga mensalmente para manter o acesso.

### Implementação Técnica
- **Endpoint:** `POST /api/payments/create-subscription/{plan_type}`
- **Método:** Utiliza a API `preapproval` do Mercado Pago em vez de `preference`.
- **Webhook:** O endpoint `/api/payments/webhook` escuta eventos do tipo `subscription_preapproval`.
  - Quando o status muda para `authorized`, o sistema libera o acesso do usuário (`subscription_status = 'active'`).

### Planos
- **Starter:** R$ 29,90
- **Pro:** R$ 99,90
- **Enterprise:** R$ 499,90

---

## 3. Gestão Financeira Simplificada

O módulo financeiro não substitui um contador, mas organiza o fluxo de caixa da empresa.

### Funcionalidades
1.  **Fluxo de Caixa:** Receitas vs. Despesas (Realizado e Pendente).
2.  **Transações:** Listagem de entradas e saídas com categorias.
3.  **Impostos (Tax Summary):**
    - Agrupamento automático de despesas marcadas como `DAS`, `INSS`, `FGTS`.
    - Visualização clara de quanto foi pago e quanto está pendente para o governo.
    - Endpoint: `GET /api/finance/taxes`

---

## 4. Integrações Google (Agenda & Reunião)

A plataforma está preparada para agendar entrevistas automaticamente.

- **Serviço:** `backend/src/services/google_suite.py`
- **Status:** Stub implementado. Requer credenciais OAuth 2.0 de produção.
- **Escopos Configurados:**
  - `https://www.googleapis.com/auth/calendar`
  - `https://www.googleapis.com/auth/userinfo.email`

---

## 5. Roadmap de Migração AWS

Futuramente, a infraestrutura sairá do Railway para a AWS. Passos recomendados:

1.  **Banco de Dados:** Migrar de PostgreSQL (Railway) para **Amazon RDS for PostgreSQL**.
2.  **Backend:** Containerizar a aplicação (já existe Dockerfile) e implantar no **AWS ECS (Fargate)** ou **App Runner** para escalabilidade automática.
3.  **Frontend:** Hospedar estáticos no **S3** + **CloudFront** (ou manter na Vercel/Amplify para facilidade).
4.  **Armazenamento de Arquivos:** Substituir armazenamento local de currículos por **Amazon S3**.
5.  **Segurança:** Utilizar **AWS Secrets Manager** para chaves de API (Google, Mercado Pago).

---

## 6. Melhores Práticas e Ideias de Mercado ("Clonadas")

Baseado em análise de sistemas de RH (ATS) líderes de mercado (como Gupy, Greenhouse):

1.  **Parsing de Currículos com IA:**
    - Extração automática de skills para "Matching" (Implementado via Gemini).
2.  **Score de Compatibilidade:**
    - Ranking de candidatos baseado na descrição da vaga vs. currículo (Implementado).
3.  **Compliance & LGPD:**
    - Termos de Uso e Regras visíveis no rodapé.
    - Exclusão de dados a pedido do candidato (Feature futura).
4.  **Sede Virtual:**
    - Operação remota centralizada em Osasco (Configurado no Frontend).

---

**Innovation.ia** - *Transformando RH com Inteligência Artificial.*
