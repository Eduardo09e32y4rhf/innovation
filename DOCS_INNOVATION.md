# Innovation.IA - Documentação Técnica & Visão de Futuro

## 1. Visão Geral
A **Innovation.IA** é uma plataforma de Gestão de RH impulsionada por Inteligência Artificial, projetada para simplificar processos de recrutamento e gestão financeira para empresas. Com sede virtual em **Osasco-SP**, a plataforma oferece uma experiência moderna, segura e integrada.

## 2. Arquitetura do Sistema
O projeto segue uma arquitetura moderna baseada em microsserviços monolíticos (Modular Monolith), preparada para escalabilidade em nuvem.

- **Backend:** Python (FastAPI) com SQLAlchemy e Pydantic.
- **Frontend:** Next.js 16 (React) com Tailwind CSS v4 e Lucide Icons.
- **Banco de Dados:** SQLite (Desenvolvimento) / PostgreSQL (Produção - Railway/Render).
- **Infraestrutura:** Docker & Kubernetes (K8s) manifests prontos.

## 3. Sistema de Pagamentos (Streaming Model)
Inspirado em plataformas de streaming (Netflix, Spotify), implementamos um modelo de **Assinatura Recorrente** via Mercado Pago.

### Como funciona:
Diferente de sistemas tradicionais que geram cobranças manuais, utilizamos a API `preapproval` do Mercado Pago.
1. O cliente escolhe o plano (Starter, Pro, Enterprise).
2. O sistema gera um link de autorização de assinatura.
3. Após o aceite, o Mercado Pago cobra automaticamente todo mês.
4. **Webhooks:** O backend escuta eventos `subscription_preapproval` para ativar/desativar o acesso automaticamente.

**Benefício:** Reduz inadimplência e automatiza o fluxo de caixa.

## 4. Gestão Financeira Simplificada (Best Practice)
Baseado em softwares de gestão financeira líderes de mercado (como ContaAzul e Nibo), criamos um dashboard que traduz "o básico do financeiro" para o empreendedor.

- **Fluxo de Caixa Real-Time:** Gráficos de entrada vs. saída.
- **Hub de Contabilidade:** Uma aba dedicada para impostos (DAS, INSS, FGTS).
  - O sistema agrupa despesas automaticamente por `tax_type`.
  - Alertas visuais para vencimentos (Dia 20 para DAS, Dia 05 para Folha).
- **Previsão via IA:** Utilizamos IA para analisar o histórico e prever a saúde financeira do próximo mês.

## 5. Integração Google Workspace (Interview Scheduling)
A plataforma possui uma estrutura pronta para integração com Google Calendar e Google Meet.

- **Serviço:** `GoogleSuiteService` (`backend/src/services/google_suite.py`).
- **Funcionalidade:**
  - Criação automática de eventos na agenda do recrutador.
  - Geração de links do Google Meet para entrevistas.
- **Status:** Atualmente operando em modo STUB (simulação) para testes. Para ativar, basta configurar as credenciais OAuth no `config.py`.

## 6. Inteligência Artificial (ATS)
O coração da Innovation é o `AIATSService`.
- **Matching de Candidatos:** Analisa currículos (PDF/Texto) e compara com a descrição da vaga, gerando um score (0-100).
- **Análise Comportamental:** Estima perfil DISC e Big5 baseado no texto do candidato.
- **Geração de Testes:** Cria testes técnicos personalizados para cada vaga.

## 7. Migração Futura para AWS
A estrutura atual já é "Cloud Native". Para migrar do Railway para AWS:
1. **Banco de Dados:** Migrar para AWS RDS (PostgreSQL).
2. **Backend:** Deploy no AWS App Runner ou ECS (Fargate) usando a imagem Docker existente.
3. **Frontend:** Deploy no AWS Amplify ou Vercel (conectado ao backend AWS).
4. **Storage:** Alterar o armazenamento de currículos para AWS S3 (atualmente local/banco).

## 8. Setup Local
Para rodar o projeto e validar as melhorias:

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

---
*Documento gerado por Jules (AI Engineer Host) para Innovation.IA*
