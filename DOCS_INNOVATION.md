# Innovation.ia - Plataforma de Gestão de RH com IA

## Visão Geral

A Innovation.ia é uma plataforma SaaS (Software as a Service) focada em gestão de Recursos Humanos, Recrutamento e Seleção (ATS), e Controle Financeiro Básico. A plataforma utiliza Inteligência Artificial para otimizar processos como triagem de currículos e análise financeira.

**Sede Virtual:** Osasco, SP.

## Arquitetura

O projeto segue uma arquitetura moderna e escalável:

- **Backend:** Python (FastAPI)
- **Frontend:** Next.js 16 (React)
- **Banco de Dados:** SQLite (Desenvolvimento) / PostgreSQL (Produção - Render/Railway)
- **Deploy:** Railway / Render / Vercel
- **Pagamentos:** Mercado Pago (Assinaturas Recorrentes)

## Fluxo de Pagamento (Assinaturas)

A monetização da plataforma é baseada em assinaturas mensais recorrentes (Modelo Streaming/SaaS).

1.  **Plano de Assinatura:** O cliente escolhe entre os planos disponíveis (Starter, Pro, Enterprise).
2.  **Criação de Preapproval:** O backend utiliza a API de `Preapproval` do Mercado Pago para gerar um link de checkout recorrente.
    - Endpoint: `POST /api/payments/create-preference/{plan_type}`
    - Ação: Cria um contrato de pagamento recorrente (auto_recurring).
3.  **Checkout:** O usuário é redirecionado para o Mercado Pago para autorizar a assinatura.
4.  **Webhook:** O Mercado Pago notifica o backend sobre eventos de assinatura (`subscription_preapproval`).
    - Endpoint: `POST /api/payments/webhook`
    - Ação: O sistema recebe a notificação, verifica o status (`authorized`, `cancelled`, etc.) e atualiza o registro na tabela `Subscription` e o status do `User`.
5.  **Acesso:** O acesso aos recursos Premium é liberado automaticamente após a confirmação da autorização.

## Melhores Práticas Implementadas ("Clonagem de Ideias")

Seguindo as melhores práticas de mercado observadas em grandes players de RH e SaaS:

### 1. Segurança e Controle de Acesso (RBAC)
- Implementação de **Role-Based Access Control (RBAC)**.
- Papéis definidos: `admin`, `company`, `candidate`.
- Rotas protegidas por decoradores como `@require_admin_role` ou verificações de `current_user.role`.
- Integração com **Google OAuth 2.0** para autenticação segura e simplificada.

### 2. Conformidade e Auditoria
- **Audit Logs:** Registro de ações críticas (quem fez o quê e quando) para conformidade e segurança.
- **LGPD/GDPR:** Termos de Uso e Regras de Conduta claros e acessíveis (`/terms`, `/rules`).
- Respeito à privacidade dos dados dos candidatos e empresas.

### 3. Gestão Financeira Integrada
- Dashboards financeiros com previsão de fluxo de caixa baseada em IA.
- Categorização automática de despesas (Salários, Infraestrutura, Marketing).
- Suporte a impostos brasileiros (DAS, INSS, FGTS).

### 4. Experiência do Usuário (UX)
- Interface moderna e responsiva com Tailwind CSS v4.
- Feedback visual imediato (Toasts, Loaders).
- Onboarding simplificado com preenchimento automático de dados via CNPJ (futuro).

## Comandos Úteis

### Backend
```bash
# Rodar testes
pytest backend/tests

# Rodar servidor
uvicorn backend.src.api.main:app --reload
```

### Frontend
```bash
# Instalar dependências
npm install

# Rodar desenvolvimento
npm run dev

# Build
npm run build
```
