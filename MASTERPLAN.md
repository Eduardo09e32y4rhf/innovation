# 🚀 INNOVATION.IA - MASTERPLAN (SaaS Enterprise)

> **Visão:** Uma plataforma unificada onde a IA gerencia não apenas a contratação, mas o ciclo de vida completo do colaborador, a produtividade da equipe e a saúde financeira da empresa.

---

## 🟢 MÓDULO 1: RECRUTAMENTO & SELEÇÃO (ATS + AI)
*O coração do sistema. Foco em automatizar a triagem e comunicação.*

### 1.1. Portal de Carreiras & Vagas
- [ ] **Página de Carreiras White-Label:** Personalizável com a marca da empresa cliente (Logo, Cores).
- [ ] **Multi-Postagem:** Publicar a vaga automaticamente no LinkedIn, Indeed e Glassdoor com um clique.
- [ ] **Formulários Dinâmicos:** Perguntas de triagem ("killer questions") personalizadas por vaga (ex: "Você tem inglês fluente?").

### 1.2. Inteligência Artificial (O Diferencial)
- [ ] **Resume Parsing (Leitura de CV):** Extração automática de dados de PDFs/DOCs para campos estruturados (Nome, Skills, Experiência).
- [ ] **Ranking Preditivo:** IA dá uma nota de 0-100 para cada candidato baseada na descrição da vaga vs. currículo.
- [ ] **Análise Comportamental (DISC/Big5):** IA analisa a carta de apresentação ou vídeo e sugere o perfil comportamental do candidato.
- [ ] **Gerador de Testes Técnicos:** A IA cria um teste de Python/React/Vendas único para cada candidato para evitar cola.

### 1.3. Comunicação & Agenda
- [ ] **Automação de E-mails:** Sequências automáticas (ex: "Recebemos seu CV" -> "Você passou para a fase 2" -> "Feedback negativo").
- [ ] **Agendamento Inteligente:** O candidato escolhe o horário baseado na disponibilidade da agenda do entrevistador (Integração Google Calendar/Outlook).
- [ ] **Chatbot de Triagem:** Um bot no WhatsApp/Site que faz a primeira entrevista ("Qual sua pretensão salarial?", "Tem disponibilidade imediata?").

---

## 🔵 MÓDULO 2: GESTÃO DE RH & PESSOAS (HCM)
*Após a contratação, como gerir o colaborador.*

### 2.1. Onboarding Digital
- [ ] **Esteira de Admissão:** Upload de documentos (RG, CPF, Comp. Residência) com validação via IA (OCR).
- [ ] **Geração de Contratos:** Criação automática do contrato de trabalho preenchido para assinatura digital (DocuSign integration).
- [ ] **Kit Boas-Vindas:** Checklist automático para TI (criar email), Financeiro (conta salário) e Gestor (agendar almoço).

### 2.2. Gestão de Desempenho & Clima
- [ ] **Avaliação 360º:** Sistema para chefes, pares e subordinados se avaliarem.
- [ ] **PDI (Plano de Desenvolvimento Individual):** Metas trimestrais com barra de progresso.
- [ ] **Termômetro de Humor:** Pesquisa de pulso semanal anônima ("Como você está se sentindo hoje?") com dashboard para o RH.
- [ ] **Gamificação:** Medalhas e pontuação por bater metas ou completar treinamentos.

### 2.3. Departamento Pessoal (Básico)
- [ ] **Gestão de Férias:** Calendário visual de quem está fora. Solicitação e aprovação via sistema.
- [ ] **Banco de Horas:** Colaborador lança as horas, gestor aprova. IA calcula saldo.
- [ ] **Holerite Digital:** Área para o funcionário baixar seus contracheques (upload feito pelo contador).

---

## 🟣 MÓDULO 3: GESTÃO DE PROCESSOS & TEMPO (PM)
*Estilo Trello/Jira, mas integrado ao RH.*

### 3.1. Gestão de Tarefas (Kanban 2.0)
- [ ] **Quadros Multi-Visão:** Kanban, Lista, Cronograma (Gantt) e Calendário.
- [ ] **Time Tracking (Rastreamento de Tempo):** Botão "Play/Stop" na tarefa para saber quanto tempo real levou.
- [ ] **Cálculo de Custo por Tarefa:** (Tempo Gasto) x (Valor Hora do Funcionário) = Custo Real do Projeto.

### 3.2. Automação de Fluxos (Workflow)
- [ ] **Gatilhos Automáticos:** "Quando mover card para 'Feito', enviar email para o cliente".
- [ ] **Aprovações:** Solicitações de compra ou reembolso que exigem "De acordo" do gestor.

---

## 🟠 MÓDULO 4: CONTABILIDADE GERENCIAL & FINANCEIRO
*Não emite nota fiscal, mas controla para onde vai o dinheiro.*

### 4.1. Controle Financeiro (BPO)
- [ ] **Contas a Pagar/Receber:** Cadastro de boletos e faturas com datas de vencimento e alertas.
- [ ] **Conciliação Bancária:** Importação de OFX do banco para bater com os lançamentos.
- [ ] **Fluxo de Caixa Projetado:** IA prevê se vai faltar dinheiro mês que vem baseada nos gastos recorrentes.

### 4.2. Gestão de Custos de Pessoal
- [ ] **Custo Real da Folha:** Salário + Impostos + Benefícios + Equipamentos. Saber quanto cada funcionário *realmente* custa.
- [ ] **Rateio por Centro de Custo:** Saber quanto o departamento de TI gasta vs. Marketing.

### 4.3. Auditoria & Compliance
- [ ] **Cofre Digital:** Armazenamento seguro de comprovantes e notas fiscais linkados a cada transação.
- [ ] **Alertas de Anomalia:** IA avisa: "A conta de luz veio 40% mais cara que a média dos últimos 6 meses".

---

## ⚫ MÓDULO 5: TECNOLOGIA & INFRAESTRUTURA (O "COMO FAZER")

### 5.1. Arquitetura
- [ ] **Microserviços:** Separar o módulo de RH do Financeiro para não travar o sistema.
- [ ] **Multi-Tenant Real:** Banco de dados isolado (Schema-based) para cada cliente Enterprise.

### 5.2. Segurança (Nível Bancário)
- [ ] **Logs de Auditoria (Audit Trails):** Registrar IP, Usuário, Data e Ação para TUDO (quem viu o salário de quem?).
- [ ] **Criptografia:** Dados sensíveis (CPF, Salário) criptografados no banco (AES-256).
- [ ] **RBAC (Role-Based Access Control):** Permissões granulares (ex: "Estagiário vê tarefas, mas não vê financeiro").

### 5.3. Integrações (API)
- [ ] **Webhooks:** Para conectar com Zapier/n8n.
- [ ] **API Pública:** Para que desenvolvedores de grandes empresas criem plugins para seu sistema.

---

## 🗺️ ROTEIRO DE IMPLEMENTAÇÃO (Roadmap)

### ✅ Fase 0: Infraestrutura & Deploy (ATUAL)
- [x] Estrutura do projeto organizada
- [x] Deploy na Vercel funcionando
- [x] Autenticação JWT
- [x] Banco de dados configurado

### 🟡 Fase 1: ATS Completo (Mês 1-2)
- [ ] Portal de carreiras white-label
- [ ] Resume parsing com IA
- [ ] Ranking preditivo de candidatos
- [ ] Automação de e-mails
- [ ] Kanban de vagas

### 🟡 Fase 2: Gestão de Projetos (Mês 3-4)
- [ ] Kanban de tarefas multi-visão
- [ ] Time tracking
- [ ] Cálculo de custo por tarefa
- [ ] Automação de workflows

### 🟡 Fase 3: Gestão de RH (Mês 5-6)
- [ ] Onboarding digital
- [ ] Gestão de férias
- [ ] Banco de horas
- [ ] Avaliação 360º

### 🟡 Fase 4: Financeiro (Mês 7-8)
- [ ] Contas a pagar/receber
- [ ] Conciliação bancária
- [ ] Centro de custos
- [ ] Fluxo de caixa com IA

### 🟡 Fase 5: IA Avançada (Mês 9+)
- [ ] Chatbot WhatsApp
- [ ] Análise comportamental DISC
- [ ] Gerador de testes técnicos
- [ ] Previsões financeiras
- [ ] App Mobile

---

## 💰 MODELO DE NEGÓCIO

### Planos
1. **Starter** (R$ 299/mês): Até 10 funcionários. ATS + Tarefas básicas.
2. **Growth** (R$ 799/mês): Até 50 funcionários. + RH + Time Tracking.
3. **Enterprise** (R$ 1.999/mês): Ilimitado. + Financeiro + API + White-Label.

### Receita Projetada (18 meses)
- **Mês 6:** 10 clientes = R$ 7.990/mês
- **Mês 12:** 50 clientes = R$ 39.950/mês
- **Mês 18:** 200 clientes = R$ 159.800/mês

---

**Última Atualização:** 12/02/2026  
**Status:** Fase 0 completa. Iniciando Fase 1.
