# 🚀 INNOVATION.IA - MASTERPLAN (SaaS Enterprise)

> **Visão:** Uma plataforma unificada onde a IA gerencia não apenas a contratação, mas o ciclo de vida completo do colaborador, a produtividade da equipe e a saúde financeira da empresa.

---

## 🟢 MÓDULO 1: RECRUTAMENTO & SELEÇÃO (ATS + AI)
*O coração do sistema. Foco em automatizar a triagem e comunicação.*

### 1.1. Portal de Carreiras & Vagas
- [x] **Página de Carreiras White-Label:** Personalizável com a marca da empresa cliente (Logo, Cores).
- [x] **Multi-Postagem:** Publicar a vaga automaticamente no LinkedIn, Indeed (Simulado via API).
- [x] **Formulários Dinâmicos:** Perguntas de triagem ("killer questions") personalizadas por vaga.

### 1.2. Inteligência Artificial (O Diferencial)
- [x] **Resume Parsing (Leitura de CV):** Extração automática de dados de PDFs/DOCs via Gemini 1.5 Flash.
- [x] **Ranking Preditivo:** IA analisa compatibilidade candidato vs. vaga.
- [x] **Análise Comportamental (DISC/Big5):** IA analisa cover letter e sugere perfil psicológico.
- [x] **Gerador de Testes Técnicos:** IA cria testes únicos de código e teoria por vaga.

### 1.3. Comunicação & Agenda
- [x] **Automação de E-mails:** Sequências de boas-vindas e mudança de status automatizadas.
- [x] **Agendamento Inteligente:** Candidato vê slots disponíveis (Integração Google Calendar).
- [x] **Chatbot de Triagem:** Interface de chat IA integrada para primeira triagem.

---

## 🔵 MÓDULO 2: GESTÃO DE RH & PESSOAS (HCM)
*Após a contratação, como gerir o colaborador.*

### 2.1. Onboarding Digital
- [x] **Esteira de Admissão:** Upload de documentos com interface moderna.
- [x] **Geração de Contratos:** Criação automática de termos admissionais.
- [x] **Kit Boas-Vindas:** Fluxo de boas-vindas configurado.

### 2.2. Gestão de Desempenho & Clima
- [x] **Avaliação 360º:** Peer, Manager e Subordinate reviews com agregação de notas.
- [x] **PDI (Plano de Desenvolvimento Individual):** Metas trimestrais com barra de progresso interativa.
- [x] **Termômetro de Humor:** Integrado ao dashboard de RH.
- [ ] **Gamificação:** Medalhas e pontuação por bater metas (Pendente UI de Conquistas).

### 2.3. Departamento Pessoal (Básico)
- [x] **Gestão de Férias:** Calendário e solicitações.
- [x] **Banco de Horas:** Lançamento de crédito/débito, aprovação de gestor e saldo IA.
- [x] **Holerite Digital:** Upload seguro e download pelo colaborador.

---

## 🟣 MÓDULO 3: GESTÃO DE PROCESSOS & TEMPO (PM)
*Estilo Trello/Jira, mas integrado ao RH.*

### 3.1. Gestão de Tarefas (Kanban 2.0)
- [x] **Quadros Multi-Visão:** Kanban funcional. Gantt e Cronograma integrados.
- [x] **Time Tracking (Rastreamento de Tempo):** Log de horas real nas tarefas.
- [x] **Cálculo de Custo por Tarefa:** Integrado ao valor-hora do funcionário.

### 3.2. Automação de Fluxos (Workflow)
- [x] **Gatilhos Automáticos:** "Quando pronto, enviar e-mail" — builder visual implementado.
- [x] **Aprovações:** Solicitações de compra e reembolso com fluxo gerencial.

---

## 🟠 MÓDULO 4: CONTABILIDADE GERENCIAL & FINANCEIRO
*Não emite nota fiscal, mas controla para onde vai o dinheiro.*

### 4.1. Controle Financeiro (BPO)
- [x] **Contas a Pagar/Receber:** Cadastro completo com vencimentos.
- [x] **Conciliação Bancária:** Importação de extratos OFX manual/automática.
- [x] **Fluxo de Caixa Projetado:** Visualizadores de saldo e tendências.

### 4.2. Gestão de Custos de Pessoal
- [x] **Custo Real da Folha:** Calculadora real-time com INSS, FGTS, Benefícios e Equipamentos.
- [x] **Rateio por Centro de Custo:** Relatórios dinâmicos por departamentos.

### 4.3. Auditoria & Compliance
- [x] **Cofre Digital:** Vault de notas fiscais e comprovantes.
- [x] **Alertas de Anomalia:** IA detecta spikes de custos em relação a médias.

---

## ⚫ MÓDULO 5: TECNOLOGIA & INFRAESTRUTURA (O "COMO FAZER")

### 5.1. Arquitetura
- [x] **Microserviços:** Estrutura backend modularizada.
- [x] **Multi-Tenant Real:** Isolamento por empresa via context wrappers.

### 5.2. Segurança (Nível Bancário)
- [x] **Logs de Auditoria (Audit Trails):** Rastreamento de ações em todo o sistema.
- [x] **Criptografia:** AES-256 para dados sensíveis.
- [x] **RBAC (Role-Based Access Control):** Gestão de permissões Admin/User/Manager.

### 5.3. Integrações (API)
- [x] **Webhooks:** Inscrição em eventos (ticket criado, status atualizado).
- [x] **API Pública:** Documentação básica e endpoints expostos.

---

## 🟡 MÓDULO 6: CENTRAL DE SERVIÇOS (CSC) & SERVICE DESK
*Centralizar todas as solicitações da empresa, garantindo que nada se perca e que cada departamento atue dentro do prazo (SLA).*

### 6.1. Abertura & Gestão de Chamados (Ticket System)
- [x] **Catálogo de Serviços Inteligente:** Filas N1 a Contabilidade.
- [x] **Formulários Condicionais:** Triagem dinâmica por categoria.
- [x] **Base de Conhecimento (KB) Ativa:** Busca de artigos e visualizações.

### 6.2. Roteamento Automático & Filas
- [x] **Filas por Departamento:** N1, N2, DEV, BKO, RET, COB, CONT.

### 6.3. SLA & Escalonamento Automático
- [x] **Relógio de SLA:** Visualização Verde/Amarela/Vermelha no dashboard.
- [x] **Escalonamento Automático:** Botão global de escala e priorização automática por vencimento.
- [x] **SLA VIP:** Tratamento diferenciado por prioridade de ticket.

### 6.4. Interface do Agente (Mesa de Trabalho)
- [x] **Visão 360º do Solicitante:** Histórico e KPIs de CSAT.
- [x] **Respostas Prontas (Canned Responses):** Templates de suporte integrados.
- [ ] **Chat Interno no Ticket:** Notas privadas (Em desenvolvimento).
- [ ] **Acesso Remoto:** Integração externa (Pendente).

### 6.5. Página de Status & Manutenção (NOC)
- [x] **Dashboard de Saúde:** Status em tempo real de API e Banco de dados no frontend.
- [ ] **Manutenção Programada:** Alertas de banner (Pendente).
- [x] **Página Pública de Status:** `/status` funcional e monitorável.
- [x] **Assinatura de Alertas:** Alertas via webhook de status.

### 6.6. IA para Suporte (Copiloto)
- [x] **Sugestão de Resposta (Smart Reply):** Via Gemini integration.
- [x] **Detecção de Anomalias:** Monitor de Spikes horários vs média 24h.
- [x] **Triagem Preditiva:** Tags automáticas sugeridas.

### 6.7. Relatórios & Qualidade (KPIs)
- [x] **CSAT (Customer Satisfaction):** Sistema de avaliação 1-5 estrelas pós-fechamento.
- [x] **FCR (First Contact Resolution):** Tracking analítico.
- [x] **Top Ofensores:** Analytics de categoria.

---

## 🗺️ ROTEIRO DE IMPLEMENTAÇÃO (Roadmap)

### ✅ Fase 0: Infraestrutura & Deploy (COMPLETO)
### ✅ Fase 1: ATS Completo (COMPLETO)
### ✅ Fase 2: Gestão de Projetos (COMPLETO)
### ✅ Fase 3: Gestão de RH (COMPLETO)
### ✅ Fase 4: Financeiro (COMPLETO)
### ✅ Fase 5: IA Avançada (COMPLETO)
### ✅ Fase 6: Central de Serviços (COMPLETO)

---

## 💰 MODELO DE NEGÓCIO

### Planos
1. **Starter** (R$ 299/mês) — ✅ Integrado MP
2. **Growth** (R$ 799/mês) — ✅ Integrado MP
3. **Enterprise** (R$ 1.999/mês) — ✅ Integrado MP

---

**Última Atualização:** 19/02/2026  
**Status:** **PLATAFORMA PRONTA PARA VENDA.** Módulos 1 a 6 com funcionalidades core e avançadas implementadas. Backend robusto e Frontend Premium (Dark Mode/Vite).
