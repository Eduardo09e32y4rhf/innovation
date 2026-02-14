# 🚀 Innovation-Enterprise - Project Summary for Claude Evaluation

This file contains the project structure and the content of key source files for architectural evaluation.

## 📂 Project Structure (Simplified)
```bash
  ├── .github/
    ├── workflows/
      └── ci-cd.yml
  ├── ai_engine/
    └── worker.py
    ├── agents/
      └── recruiter_agent.py
      └── __init__.py
    ├── prompts/
      └── __init__.py
    ├── vector_store/
      └── __init__.py
  ├── backend/
    └── Dockerfile
    └── requirements.txt
    ├── alembic/
    ├── src/
      ├── api/
        └── main.py
        ├── v1/
          ├── endpoints/
            └── ai.py
            └── ai_services.py
            └── applications.py
            └── audit_logs.py
            └── auth.py
            └── candidates.py
            └── companies.py
            └── dashboard.py
            └── documents.py
            └── finance.py
            └── health.py
            └── interviews.py
            └── jobs.py
            └── matching.py
            └── payments.py
            └── plans.py
            └── projects.py
            └── rh.py
            └── services_documents.py
            └── services_full.py
            └── subscriptions.py
            └── support.py
            └── terms.py
            └── users.py
            └── __init__.py
      ├── core/
        └── ai_processor.py
        └── config.py
        └── dependencies.py
        └── logging_config.py
        └── plans.py
        └── roles.py
        └── security.py
        └── __init__.py
      ├── domain/
        ├── models/
          └── application.py
          └── application_status_history.py
          └── audit_log.py
          └── candidate.py
          └── company.py
          └── compliance.py
          └── document.py
          └── finance.py
          └── job.py
          └── leave_request.py
          └── onboarding.py
          └── performance_review.py
          └── plan.py
          └── project.py
          └── refresh_token.py
          └── subscription.py
          └── task.py
          └── ticket.py
          └── time_entry.py
          └── two_factor_code.py
          └── user.py
          └── __init__.py
        ├── schemas/
          └── application.py
          └── auth.py
          └── company.py
          └── finance.py
          └── job.py
          └── user.py
          └── __init__.py
      ├── infrastructure/
        ├── ai_clients/
          └── gemini_pro.py
          └── __init__.py
        ├── cache/
          └── redis_client.py
          └── session_manager.py
          └── __init__.py
        ├── database/
          ├── nosql/
            └── __init__.py
          ├── sql/
            └── base.py
            └── database.py
            └── dependencies.py
            └── init_db.py
            └── seed.py
            └── seeds.py
            └── session.py
            └── __init__.py
        ├── payments/
          └── __init__.py
      ├── modules/
        ├── ats/
          └── __init__.py
        ├── finance/
          └── __init__.py
        ├── hcm/
          └── __init__.py
        ├── support/
          └── __init__.py
      ├── services/
        └── ai_ats.py
        └── audit_service.py
        └── auth_service.py
        └── claude_service.py
        └── finance_service.py
        └── notification_service.py
        └── plan_service.py
        └── project_service.py
        └── rh_service.py
        └── support_service.py
        └── two_factor_service.py
        └── __init__.py
    ├── tests/
      ├── e2e/
      ├── integration/
        └── conftest.py
        └── test_finance_security.py
        └── test_financial_logic.py
        └── test_fixes.py
        └── test_main.py
        └── test_routes_integration.py
        └── test_security.py
      ├── unit/
  ├── docs/
    └── limpeza-git-submodulos.md
  ├── frontend/
    ├── public/
    ├── src/
      ├── components/
      ├── hooks/
      ├── pages/
      ├── services/
  ├── ops/
    └── docker-compose.yml
    └── render.yaml
    └── vercel.json
    ├── backups/
    ├── nginx/
```

## 📄 Source Code

### File: `CLEANUP_SUMMARY.md`
```md
# 🧹 Limpeza Completa do Projeto - Innovation.ia

## ✅ Resultado Final

### 📊 Redução de Tamanho
- **Antes:** 251.7 MB
- **Depois:** 0.49 MB  
- **Economia:** 251.21 MB (99.8% de redução!)

### 🗑️ Pastas Removidas
1. ❌ `innovation/` - Pasta duplicada com código antigo
2. ❌ `api/` - API Node.js não utilizada
3. ❌ `server/` - Servidor alternativo não utilizado
4. ❌ `tools/` - Scripts de desenvolvimento
5. ❌ `docs/` - Documentação interna
6. ❌ `.venv/` - Ambiente virtual Python (rebuild na Vercel)

### 📄 Arquivos Removidos
- Documentação: `CLEANUP_AUDIT.md`, `FINAL_REPORT.md`, `QUICKSTART.md`, `SOLUCAO_WARNING_BUILDS.md`, `VERCEL_DEPLOY_GUIDE.md`, `VERCEL_OPTIMIZATION.md`
- Scripts: `create_admin.py`, `create_test_user.py`, `init_db.py`, `reorganize.py`
- Configurações: `package.json`, `package-lock.json`, `tsconfig.json`, `render.yaml`, `.dockerignore`, `Dockerfile`

### 📁 Estrutura Final (Otimizada)
```
innovation.ia/
├── .git/                    # Git repository
├── .github/                 # GitHub workflows
├── .gitignore
├── .vercelignore           # Exclusões do deploy
├── .vscode/                # Configurações do VSCode
├── backend/                # Backend FastAPI (Python) ✅
│   ├── alembic/           # Migrações de banco
│   ├── app/               # Código da aplicação
│   └── .env               # Variáveis de ambiente
├── web-admin/              # Frontend HTML/CSS/JS ✅
├── requirements.txt        # Dependências Python ✅
└── README.md               # Documentação principal ✅
```

### 🎯 Apenas o Essencial Permanece
- ✅ `backend/` - Código Python (FastAPI)
- ✅ `web-admin/` - Interface web
- ✅ `requirements.txt` - Dependências
- ✅ `README.md` - Documentação
- ✅ Arquivos de configuração necessários

## 🚀 Pronto para Deploy!
O projeto agora está **99.8% mais leve** e pronto para deploy na Vercel sem exceder o limite de 250 MB!

```

---

### File: `ESTRUTURA_ATUALIZADA.md`
```md
# ✅ Estrutura Atualizada - 100% Conforme README

## 🎯 Objetivo Alcançado
Projeto reorganizado para coincidir **EXATAMENTE** com a estrutura descrita no README.md

---

## 📁 Estrutura Final (Confirmada)

```
innovation.ia/
├── innovation/              # 🔹 BACKEND (FastAPI + PostgreSQL) ✅
│   ├── app/
│   │   ├── api/            # Endpoints REST (Auth, Jobs, Calendar, Chat...)
│   │   ├── core/           # Configurações, Segurança, Dependências
│   │   ├── models/         # Modelos SQLAlchemy (Banco de Dados)
│   │   ├── services/       # Lógica de Negócio (IA, Email, Calendar)
│   │   └── db/             # Sessão de Banco, Migrações e Seeds
│   ├── alembic/           # Migrações de banco de dados
│   └── .env               # Variáveis de ambiente
│
├── web-test/               # 🎨 WEB ADMIN (HTML/CSS/JS) ✅
│   ├── index.html          # Landing Page Principal
│   ├── company/            # Portal da Empresa (Dashboard, Vagas, Config)
│   └── common/             # Assets Compartilhados (Tailwind, FontAwesome)
│
├── requirements.txt        # Dependências Python ✅
├── README.md               # Documentação ✅
└── .vercelignore          # Exclusões do deploy
```

---

## ✅ Alterações Realizadas

### 1. Renomeação de Pastas
- ✅ `backend/` → `innovation/`
- ✅ `web-admin/` → `web-test/`

### 2. Atualizações de Código
- ✅ `innovation/app/main.py`: Caminho atualizado para `../../web-test`
- ✅ `.vercelignore`: Removida exclusão incorreta de `innovation/`

### 3. Commit e Deploy
- ✅ Commit realizado com sucesso
- ✅ Push para GitHub concluído
- ✅ Deploy na Vercel em andamento

---

## 🚀 Como Usar

### Local (Desenvolvimento)
```bash
cd innovation
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Produção (Vercel)
- Deploy automático via GitHub
- Estrutura otimizada (0.49 MB)
- Compatível com limite de 250 MB

---

## ✅ Conformidade com README
- ✅ Estrutura de pastas **100% idêntica**
- ✅ Caminhos no código **atualizados**
- ✅ Rotas funcionando corretamente
- ✅ Deploy otimizado

**Projeto agora está EXATAMENTE como descrito no README!** 🎉

```

---

### File: `EVALUATION.md`
```md
# Avaliação do Projeto Innovation.ia

## 1. Estrutura do Projeto
O projeto apresenta uma boa separação de responsabilidades entre Backend, Mobile e Web. No entanto, foram identificadas inconsistências estruturais, como pastas duplicadas e arquivos fora de lugar, que foram corrigidos durante a avaliação:
- Removidas pastas redundantes (`innovation/innovation`, `innovation/backend`).
- Restaurado o código-fonte do App Flutter para o diretório correto (`innovation_app/lib`).
- Centralizada a configuração de ambiente e banco de dados.

## 2. Backend (FastAPI)
### Pontos Positivos:
- Organização seguindo padrões modernos (api, models, services, core).
- Uso de JWT para autenticação.
- Sistema de auditoria integrado.
- Implementação de Roles (ADM, COMPANY, CANDIDATE, etc).

### Melhorias Realizadas:
- **Dependências**: Adicionada a biblioteca `email-validator` que faltava no `requirements.txt`.
- **Validação**: Implementados Schemas Pydantic para os endpoints de `Jobs` e `Applications`, garantindo maior segurança e documentação automática (Swagger).
- **Banco de Dados**: Mantido o suporte a migrações com Alembic e criado um script de inicialização rápida (`app/db/init_db.py`) para ambientes de teste.
- **Bcrypt**: Corrigida incompatibilidade do `bcrypt` com Python 3.12 no script de admin.

### Recomendações:
- Integrar todos os módulos da API com os Schemas Pydantic (alguns ainda usam `dict`).
- Implementar testes automatizados (pytest).
- Expandir a lógica de `init_db.py` para incluir seeds iniciais de planos e permissões.

## 3. Web Admin (Empresa)
### Observações:
- O painel administrativo atual é um protótipo estático (SPA) muito bem estruturado visualmente, mas ainda não consome a API FastAPI.
- Utiliza `localStorage` para persistência, o que é excelente para demonstrações, mas requer integração real com o backend.

### Recomendações:
- Substituir as funções de manipulação de `state.data` por chamadas `fetch` para os endpoints do backend.
- Implementar o fluxo de login real conectando ao `/auth/login` da API.

## 4. App Mobile (Flutter)
### Observações:
- O projeto possuía a estrutura do Flutter mas o código das telas estava oculto em pastas de backup. O código foi restaurado.
- As telas principais (Login, Dashboard, Cadastro) estão presentes, mas seguem um padrão simples.

### Recomendações:
- Realizar a integração com o `api_client` para consumir os dados reais do backend.
- Melhorar o tratamento de estado (usando Provider, Bloc ou Signals).

## 5. Conclusão
O projeto Innovation.ia tem uma base sólida e arquitetura bem pensada. As correções feitas estabilizaram o ambiente de desenvolvimento, permitindo que o foco agora se volte para a integração entre as partes (Web/Mobile <-> API) e a finalização das regras de negócio.

```

---

### File: `generate_claude_summary.py`
```py
import os

# Configurações
BASE_DIR = os.getcwd()
OUTPUT_FILE = "PROJECT_SUMMARY_FOR_CLAUDE.md"
EXCLUDE_DIRS = {".venv", ".git", "__pycache__", ".vscode", "node_modules", "Lib", "Scripts", "_resources", "legacy_web_admin", "legacy_web_test"}
EXCLUDE_EXTS = {".pyc", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf", ".zip", ".db", ".sqlite"}

def generate_summary():
    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        out.write("# 🚀 Innovation-Enterprise - Project Summary for Claude Evaluation\n\n")
        out.write("This file contains the project structure and the content of key source files for architectural evaluation.\n\n")
        
        out.write("## 📂 Project Structure (Simplified)\n")
        out.write("```bash\n")
        for root, dirs, files in os.walk(BASE_DIR):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            level = root.replace(BASE_DIR, '').count(os.sep)
            indent = '  ' * (level)
            folder_name = os.path.basename(root)
            if folder_name and folder_name != "innovation.ia":
                out.write(f"{indent}├── {folder_name}/\n")
                sub_indent = '  ' * (level + 1)
                for f in files:
                    if not any(f.endswith(ext) for ext in EXCLUDE_EXTS) and f != OUTPUT_FILE and f != "file_list.txt":
                        out.write(f"{sub_indent}└── {f}\n")
        out.write("```\n\n")

        out.write("## 📄 Source Code\n\n")
        
        # Percorrer e extrair conteúdo
        for root, dirs, files in os.walk(BASE_DIR):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for f in files:
                if any(f.endswith(ext) for ext in EXCLUDE_EXTS) or f == OUTPUT_FILE or f == "file_list.txt" or f == "reorganize_to_enterprise.py":
                    continue
                
                file_path = os.path.join(root, f)
                rel_path = os.path.relpath(file_path, BASE_DIR)
                
                # Apenas arquivos de texto/código relevantes
                if f.endswith(('.py', '.json', '.yaml', '.yml', '.md', '.txt', '.html', '.js', '.css', 'Dockerfile')):
                    try:
                        with open(file_path, "r", encoding="utf-8") as src:
                            content = src.read()
                            
                        out.write(f"### File: `{rel_path}`\n")
                        lang = f.split('.')[-1] if '.' in f else ''
                        if f == 'Dockerfile': lang = 'dockerfile'
                        out.write(f"```{lang}\n")
                        out.write(content)
                        out.write("\n```\n\n")
                        out.write("---\n\n")
                    except Exception as e:
                        out.write(f"### File: `{rel_path}` (Error reading file)\n\n")

    print(f"🚀 Arquivo {OUTPUT_FILE} gerado com sucesso!")

if __name__ == "__main__":
    generate_summary()

```

---

### File: `MASTERPLAN.md`
```md
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

## 🟡 MÓDULO 6: CENTRAL DE SERVIÇOS (CSC) & SERVICE DESK
*Centralizar todas as solicitações da empresa, garantindo que nada se perca e que cada departamento atue dentro do prazo (SLA).*

### 6.1. Abertura & Gestão de Chamados (Ticket System)
- [ ] **Catálogo de Serviços Inteligente:** IA sugere categoria automaticamente (ex: "Erro na Nota" → Contabilidade > Cancelamento de NF).
- [ ] **Formulários Condicionais:** Campos dinâmicos baseados na categoria (erro = print, reembolso = recibo).
- [ ] **Base de Conhecimento (KB) Ativa:** IA sugere tutoriais antes de abrir chamado (redução de 30% em tickets N1).

### 6.2. Roteamento Automático & Filas
- [ ] **Filas por Departamento:**
  - **N1 (Triagem):** Dúvidas básicas, reset de senha
  - **N2 (Técnico):** Análise de logs, configurações complexas
  - **DEV (Engenharia):** Bugs confirmados → Integração GitHub/Jira
  - **BKO (Backoffice):** Cadastro de clientes, validação de documentos
  - **RET (Retenção):** Cancelamentos (SLA crítico)
  - **COB (Cobrança):** Negociação de dívidas
  - **CONT (Contabilidade):** Dúvidas fiscais, folha de pagamento

### 6.3. SLA & Escalonamento Automático
- [ ] **Relógio de SLA:** Contagem regressiva colorida (Verde/Amarelo/Vermelho). Ex: N1=2h, Dev=48h.
- [ ] **Escalonamento Automático:** Se não responder no prazo, sobe para supervisor com alerta.
- [ ] **SLA VIP:** Clientes Enterprise furam a fila automaticamente.

### 6.4. Interface do Agente (Mesa de Trabalho)
- [ ] **Visão 360º do Solicitante:** Histórico de chamados, "humor" (análise de sentimento IA).
- [ ] **Respostas Prontas (Canned Responses):** Atalhos como `/reset` para textos padrão.
- [ ] **Chat Interno no Ticket:** Notas privadas entre N1/N2 (@mentions).
- [ ] **Acesso Remoto:** Botão para compartilhamento de tela direto no ticket.

### 6.5. Página de Status & Manutenção (NOC)
- [ ] **Dashboard de Saúde:** Indicadores em tempo real (API, DB, Integrações).
- [ ] **Manutenção Programada:** Avisos fixos no topo do sistema.
- [ ] **Página Pública de Status:** `status.innovation.ia` para clientes verificarem incidentes.
- [ ] **Assinatura de Alertas:** Notificação automática quando incidente for resolvido.
- [ ] **Post-Mortem Automático:** Rascunho de relatório após incidentes.

### 6.6. IA para Suporte (Copiloto)
- [ ] **Sugestão de Resposta (Smart Reply):** IA escreve resposta técnica para atendente revisar.
- [ ] **Detecção de Anomalias:** Alerta de spike em chamados ("50 tickets sobre 'Boleto Duplicado' na última hora").
- [ ] **Triagem Preditiva:** IA define prioridade e fila automaticamente.

### 6.7. Relatórios & Qualidade (KPIs)
- [ ] **CSAT (Customer Satisfaction):** Pesquisa de estrelas após fechamento do chamado.
- [ ] **FCR (First Contact Resolution):** % de chamados resolvidos no N1.
- [ ] **Top Ofensores:** Ranking dos 3 maiores motivos de chamado por departamento.

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

### 🟡 Fase 6: Central de Serviços (Mês 10-12)
- [ ] Sistema de tickets multi-fila
- [ ] SLA e escalonamento automático
- [ ] Página de status pública
- [ ] IA para suporte (Smart Reply)
- [ ] KPIs e CSAT

---

## 💰 MODELO DE NEGÓCIO

### Planos
1. **Starter** (R$ 299/mês): Até 10 funcionários. ATS + Tarefas básicas.
2. **Growth** (R$ 799/mês): Até 50 funcionários. + RH + Time Tracking + Service Desk.
3. **Enterprise** (R$ 1.999/mês): Ilimitado. + Financeiro + CSC Completo + API + White-Label.

### Receita Projetada (18 meses)
- **Mês 6:** 10 clientes = R$ 7.990/mês
- **Mês 12:** 50 clientes = R$ 39.950/mês
- **Mês 18:** 200 clientes = R$ 159.800/mês

---

**Última Atualização:** 12/02/2026  
**Status:** Fase 0 completa. MASTERPLAN expandido com 6 módulos completos.

```

---

### File: `README.md`
```md
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

## 👨‍💻 Próximos Passos
- [ ] Implementação do Agente de Auditoria Financeira.
- [ ] Expansão do Módulo de Suporte (Service Desk).
- [ ] Migração total do Frontend para Next.js.

---
**Innovation-Enterprise © 2026** - Escalando o futuro com inteligência.

```

---

### File: `render.yaml`
```yaml
services:
  - type: web
    name: innovation-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: cd innovation && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.4
      - key: DATABASE_URL
        sync: false
      - key: SECRET_KEY
        sync: false

```

---

### File: `RENDER_DEPLOY_REPORT.md`
```md
# 🚀 Relatório de Deploy no Render

O projeto foi configurado para deploy automático na plataforma **Render**. Abaixo estão os detalhes das alterações realizadas e instruções para garantir que tudo funcione corretamente.

## ✅ Alterações Realizadas

1.  **`requirements.txt` Atualizado:**
    -   Adicionada a biblioteca `alembic` (versão 1.13.1) para gerenciar migrações de banco de dados. Isso garante que o esquema do banco seja criado/atualizado automaticamente.

2.  **`render.yaml` Criado:**
    -   Arquivo de configuração "Infrastructure as Code" para o Render.
    -   Define um **Web Service** Python (`innovation-backend`).
    -   **Build Command:** `pip install -r requirements.txt` (Instala as dependências).
    -   **Start Command:** `cd innovation && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
        -   Este comando navega para a pasta `innovation`, roda as migrações do banco de dados e inicia o servidor `uvicorn`.

## 🛠️ Como Realizar o Deploy

Como o arquivo `render.yaml` já está no repositório, você pode criar o serviço no Render de duas formas:

### Opção 1: Blueprint (Recomendado)
1.  No dashboard do Render, clique em **New +** -> **Blueprint**.
2.  Conecte este repositório.
3.  O Render detectará automaticamente o arquivo `render.yaml` e configurará o serviço.
4.  Clique em **Apply**.

### Opção 2: Web Service Manual
Se preferir criar manualmente:
1.  **New +** -> **Web Service**.
2.  Conecte o repositório.
3.  **Runtime:** Python 3
4.  **Build Command:** `pip install -r requirements.txt`
5.  **Start Command:** `sh -c "cd innovation && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT"`
6.  **Environment Variables:** Adicione as variáveis necessárias (como você informou que já estão lá, apenas garanta que `DATABASE_URL` e outras chaves de API estejam configuradas).

## ⚠️ Variáveis de Ambiente Importantes

Certifique-se de que as seguintes variáveis estejam configuradas no ambiente do Render:

-   `DATABASE_URL`: String de conexão com o PostgreSQL (ex: `postgresql://user:pass@host/dbname`).
-   `SECRET_KEY`: Chave secreta para segurança da aplicação.
-   `GEMINI_API_KEY`: Para funcionalidades de IA.
-   Outras variáveis conforme `innovation/app/core/config.py`.

## 🎯 Status Final
O projeto está pronto para rodar no Render. As migrações serão aplicadas automaticamente a cada deploy, garantindo que o banco de dados esteja sempre sincronizado com o código.

```

---

### File: `requirements.txt`
```txt
# ========================================
# CORE FRAMEWORK
# ========================================
fastapi==0.128.0
uvicorn[standard]==0.34.0
python-multipart==0.0.20
jinja2==3.1.6

# ========================================
# DATABASE & STORAGE
# ========================================
sqlalchemy==2.0.46
psycopg2-binary==2.9.10
alembic==1.13.1
redis==5.0.1
sqlalchemy-mixins

# ========================================
# AUTHENTICATION & SECURITY
# ========================================
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
bcrypt==5.0.0
slowapi==0.1.9

# ========================================
# VALIDATION & SETTINGS
# ========================================
pydantic==2.12.0
pydantic-settings==2.7.0
email-validator==2.2.0

# ========================================
# HTTP CLIENT
# ========================================
httpx==0.28.1
requests

# ========================================
# AI SERVICES
# ========================================
google-generativeai==0.8.3
anthropic==0.18.1

# ========================================
# PAYMENTS & NOTIFICATIONS
# ========================================
mercadopago==2.2.1
sendgrid==6.11.0
twilio==9.0.0

# ========================================
# UTILITIES & DEVELOPMENT
# ========================================
python-dotenv==1.0.1
Faker
sentry-sdk[fastapi]==1.40.0

# ========================================
# TESTING & PERFORMANCE
# ========================================
pytest==9.0.2
pytest-asyncio==0.23.3
pytest-cov==4.1.0
locust==2.20.0

```

---

### File: `vercel.json`
```json
{
  "builds": [
    {
      "src": "innovation/app/main.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "innovation/app/main.py"
    }
  ]
}

```

---

### File: `.github\workflows\ci-cd.yml`
```yml
name: Hybrid CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  python-build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Set up Python 3.12
      uses: actions/setup-python@v4
      with:
        python-version: '3.12'
        cache: 'pip'
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
        if [ -f innovation/requirements.txt ]; then pip install -r innovation/requirements.txt; fi
    - name: Run tests
      run: |
        pip install pytest
        if [ -d "innovation/tests" ]; then
          export PYTHONPATH=$PYTHONPATH:$(pwd)/innovation
          pytest innovation/tests
        else
          echo "No tests directory found at innovation/tests"
        fi

```

---

### File: `ai_engine\worker.py`
```py
from celery import Celery
import os
from core.config import settings

# Configuração do Celery usando o Redis como broker e backend
celery_app = Celery(
    "innovation_agents",
    broker=getattr(settings, "REDIS_URL", "redis://localhost:6379/0"),
    backend=getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Sao_Paulo",
    enable_utc=True,
)

# Importar tarefas para registro
from ai_engine.agents.recruiter_agent import recruiter_agent
import asyncio

@celery_app.task(name="analyze_resume_task")
def analyze_resume_task(resume_text: str, job_description: str):
    """
    Wrapper para rodar a tarefa asíncrona do Agente no Celery (que é síncrono por padrão na execução da task)
    """
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(recruiter_agent.process_resume_analysis(resume_text, job_description))

```

---

### File: `ai_engine\agents\recruiter_agent.py`
```py
from infrastructure.ai_clients.gemini_pro import GeminiService
import logging

class RecruiterAgent:
    def __init__(self):
        self.gemini = GeminiService()
        self.logger = logging.getLogger("ai_engine.recruiter")

    async def process_resume_analysis(self, resume_text: str, job_description: str):
        """
        Tarefa pesada: Analisar currículo vs vaga
        """
        self.logger.info("Iniciando análise de currículo via Agente Autônomo...")
        try:
            analysis = await self.gemini.analyze_resume(resume_text, job_description)
            self.logger.info("Análise concluída com sucesso.")
            return analysis
        except Exception as e:
            self.logger.error(f"Erro no processamento do agente: {str(e)}")
            raise

recruiter_agent = RecruiterAgent()

```

---

### File: `ai_engine\agents\__init__.py`
```py

```

---

### File: `ai_engine\prompts\__init__.py`
```py

```

---

### File: `ai_engine\vector_store\__init__.py`
```py

```

---

### File: `backend\Dockerfile`
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema para psycopg2 e outras
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements primeiro para aproveitar o cache do Docker
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar o restante do código
COPY . .

# Setar o PYTHONPATH para encontrar os módulos
ENV PYTHONPATH=/app/backend/src:/app

# Expor a porta que o FastAPI usa
EXPOSE 8000

# Comando padrão (pode ser sobrescrito pelo docker-compose)
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]

```

---

### File: `backend\requirements.txt`
```txt
﻿annotated-doc==0.0.4
annotated-types==0.7.0
anyio==4.12.1
bcrypt==5.0.0
click==8.3.1
colorama==0.4.6
ecdsa==0.19.1
fastapi==0.128.0
greenlet==3.3.1
h11==0.16.0
idna==3.11
# innovation-ia==0.1.0
passlib==1.7.4
psycopg2-binary==2.9.11
pyasn1==0.6.2
pydantic==2.12.5
pydantic-settings==2.12.0
pydantic_core==2.41.5
python-dotenv==1.2.1
python-jose==3.5.0
rsa==4.9.1
six==1.17.0
SQLAlchemy==2.0.46
starlette==0.50.0
typing-inspection==0.4.2
typing_extensions==4.15.0
gunicorn==23.0.0
uvicorn[standard]==0.34.0
sendgrid==6.11.0
twilio==9.2.2
email-validator
google-generativeai
httpx
slowapi
python-multipart
stripe
pytest
mercadopago
jinja2
redis>=5.0.0
celery>=5.3.0
python-multipart
# AI and Workers
arq>=0.25.0

```

---

### File: `backend\src\api\main.py`
```py
import os
from fastapi import FastAPI, Request, status
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import google.generativeai as genai
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt, JWTError
from api.v1.endpoints import jobs, applications, ai, matching, auth, dashboard, interviews, ai_services, projects, rh, finance, support, payments
import domain.models # Garante o registro de todos os modelos
from core.config import settings

# Iniciar App
app = FastAPI(title="Innovation.ia - Elite Recruitment")

# Configuração do Gemini
GEMINI_API_KEY = settings.GEMINI_API_KEY
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
model_gemini = genai.GenerativeModel('gemini-pro')

# Configuração de Caminhos (Ajustado para a nova estrutura Enterprise)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Busca pastas do frontend no novo local
WEB_BASE = os.path.abspath(os.path.join(BASE_DIR, "../../../frontend/legacy_web_test"))
WEB_ADMIN = os.path.abspath(os.path.join(BASE_DIR, "../../../frontend/legacy_web_admin"))

# Configuração de Templates e Static
# Montamos a pasta raiz do web-test para servir assets como imagens e CSS
app.mount("/static", StaticFiles(directory=WEB_BASE), name="static")
if os.path.exists(WEB_ADMIN):
    app.mount("/admin-static", StaticFiles(directory=WEB_ADMIN), name="admin-static")

# Templates apontam para a pasta company, mas podemos ter outros locais
templates = Jinja2Templates(directory=os.path.join(WEB_BASE, "company"))
templates_common = Jinja2Templates(directory=WEB_BASE)

# Middleware CORS para evitar problemas de bloqueio
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- GLOBAL AUTHENTICATION MIDDLEWARE ---
from starlette.middleware.base import BaseHTTPMiddleware
from api.v1.endpoints.auth import user_memory_cache

# List of public routes that don't pass through auth check
PUBLIC_ROUTES = [
    "/login",
    "/register",
    "/static",
    "/admin-static",
    "/api/auth",
    "/api/payments/webhook", # Webhook needs to be public
    "/docs",
    "/redoc",
    "/openapi.json",
    "/health"
]

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        # Check if route is public
        is_public = any(path.startswith(route) for route in PUBLIC_ROUTES)
        
        # If accessing root, redirect to login or dashboard based on auth (simplification: always login for now)
        if path == "/":
             return await call_next(request) # Let the home route handle logic (it serves landing page)

        # Protect HTML pages (dashboard, etc) AND API routes (except auth/public)
        # For now, let's focus on protecting the Application Pages (HTML)
        # API routes are usually protected by Depends(get_current_user), so we double check here for HTML safety.
        
        if not is_public and not path.startswith("/api"):
            # It's a frontend page request. Check for session/token.
            # In a real app we'd verify the JWT token from cookies.
            # For this MVP, we assume if they can't provide a token in Authorization header or Cookie, kickoff.
            # However, since we are serving HTML, we rely on Cookies usually.
            # Let's check for 'access_token' cookie.
            
            token = request.cookies.get("access_token")
            if not token:
                # Redirect to login
                return RedirectResponse(url="/login")

            # Verify Token Signature
            try:
                jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            except JWTError:
                # Invalid token
                return RedirectResponse(url="/login")
        
        response = await call_next(request)
        return response

app.add_middleware(AuthMiddleware)

# Incluir Roteadores da API
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(ai.router)
app.include_router(matching.router)
app.include_router(dashboard.router)
app.include_router(interviews.router)
app.include_router(ai_services.router)
app.include_router(projects.router)
app.include_router(rh.router)
app.include_router(finance.router)
app.include_router(support.router)
app.include_router(payments.router)

# Modelo para o Chat
class ChatMessage(BaseModel):
    message: str = Field(..., max_length=1000)

# --- ROTAS DE NAVEGAÇÃO ---

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    # Prioriza a nova Landing Page Futurista
    admin_index = os.path.join(WEB_ADMIN, "index.html")
    if os.path.exists(admin_index):
        with open(admin_index, "r", encoding="utf-8") as f:
            return f.read()

    # Fallback para a antiga
    index_path = os.path.join(WEB_BASE, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read()
    return "Landing Page não encontrada. Verifique a pasta web-test/index.html"

@app.get("/pages/{page_name}", response_class=HTMLResponse)
async def serve_futuristic_pages(page_name: str):
    """Serve páginas do novo tema futurista"""
    # Security: Normalize path and prevent traversal
    page_path = os.path.normpath(os.path.join(WEB_ADMIN, "pages", page_name))
    base_path = os.path.join(WEB_ADMIN, "pages")

    if not page_path.startswith(base_path):
        return HTMLResponse("Acesso negado", status_code=403)

    if os.path.exists(page_path) and os.path.isfile(page_path):
        with open(page_path, "r", encoding="utf-8") as f:
            return f.read()
    return HTMLResponse("Página não encontrada", status_code=404)

@app.get("/css/{file_name}", response_class=HTMLResponse)
async def serve_css(file_name: str):
    """Serve CSS do novo tema futurista"""
    # Security: Normalize path and prevent traversal
    css_path = os.path.normpath(os.path.join(WEB_ADMIN, "css", file_name))
    base_path = os.path.join(WEB_ADMIN, "css")

    if not css_path.startswith(base_path):
         return HTMLResponse("Acesso negado", status_code=403)

    if os.path.exists(css_path) and os.path.isfile(css_path):
        with open(css_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), media_type="text/css")
    return HTMLResponse("CSS não encontrado", status_code=404)

@app.get("/dashboard")
async def dashboard(request: Request):
    return templates.TemplateResponse(request=request, name="dashboard.html")

@app.get("/vagas")
async def vagas_page(request: Request):
    return templates.TemplateResponse(request=request, name="jobs.html")

@app.get("/candidatos")
async def candidatos_page(request: Request):
    return templates.TemplateResponse(request=request, name="candidates.html")

@app.get("/configuracoes")
async def configuracoes_page(request: Request):
    return templates.TemplateResponse(request=request, name="settings.html")

@app.get("/projetos")
async def projetos_page(request: Request):
    return templates.TemplateResponse(request=request, name="projects.html")

@app.get("/tarefas")
async def tarefas_page(request: Request):
    return templates.TemplateResponse(request=request, name="tasks.html")

@app.get("/rh")
async def rh_page(request: Request):
    return templates.TemplateResponse(request=request, name="rh.html")

@app.get("/financeiro")
async def finance_page(request: Request):
    return templates.TemplateResponse(request=request, name="finance.html")

@app.get("/suporte")
async def support_page(request: Request):
    return templates.TemplateResponse(request=request, name="support.html")

@app.get("/status", response_class=HTMLResponse)
async def public_status_page(request: Request):
    path = os.path.join(WEB_BASE, "status.html")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    return "Página de status não encontrada."

@app.get("/login")
async def login_page(request: Request):
    # Login might be in common/login.html or directly in company/login.html
    # Based on file list, web-test/company/login.html exists.
    return templates.TemplateResponse(request=request, name="login.html")

@app.get("/carreiras", response_class=HTMLResponse)
async def careers_page(request: Request):
    careers_path = os.path.join(WEB_BASE, "careers.html")
    if os.path.exists(careers_path):
        with open(careers_path, "r", encoding="utf-8") as f:
            return f.read()
    return "Portal de Carreiras não encontrado."

# --- API DE INTELIGÊNCIA ARTIFICIAL ---

@app.post("/api/chat")
async def chat_gemini(data: ChatMessage):
    try:
        # Prompt focado em recrutamento para o Gemini ser um assistente de elite
        prompt = f"Você é o assistente de recrutamento da Innovation.ia. Responda de forma curta e profissional: {data.message}"
        response = model_gemini.generate_content(prompt)
        return {"response": response.text}
    except Exception as e:
        return JSONResponse(status_code=500, content={"response": "Erro ao conectar com a IA. Verifique a API Key."})

# --- API DE DADOS PARA OS GRÁFICOS ---

@app.get("/api/stats")
async def get_stats():
    return {
        "vagas_ativas": 12,
        "candidatos_total": 458,
        "entrevistas_semana": 24,
        "score_ia_medio": 84,
        "grafico_fluxo": [120, 250, 180, 390, 320, 458],
        "grafico_contratacoes": [5, 8, 12, 7, 15, 20]
    }

@app.get("/health")
def health():
    return {"status": "ok"}

```

---

### File: `backend\src\api\v1\endpoints\ai.py`
```py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import httpx

router = APIRouter(prefix="/api/ai", tags=["ai"])

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

class QuestionRequest(BaseModel):
    question: str
    context: Optional[str] = None

@router.post("/ask")
async def ask_ai(data: QuestionRequest):
    """IA responde perguntas sobre recrutamento"""
    
    if not ANTHROPIC_API_KEY:
        return {
            "answer": "IA não configurada. Configure ANTHROPIC_API_KEY para usar este recurso.",
            "error": True
        }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": "claude-3-sonnet-20240229", # Ajustado para um modelo válido atual
                    "max_tokens": 1024,
                    "messages": [{
                        "role": "user",
                        "content": f"""Você é um assistente de recrutamento. Responda de forma concisa e útil.

Contexto: {data.context if data.context else 'Recrutamento geral'}

Pergunta: {data.question}

Responda em português brasileiro."""
                    }]
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                logger.error(f"Erro Antropic: {response.text}")
                raise HTTPException(500, "Erro ao consultar IA")
            
            result = response.json()
            answer = result["content"][0]["text"]
            
            return {
                "answer": answer,
                "error": False
            }
            
    except Exception as e:
        return {
            "answer": f"Erro: {str(e)}",
            "error": True
        }

```

---

### File: `backend\src\api\v1\endpoints\ai_services.py`
```py
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User
import google.generativeai as genai
import os
from infrastructure.cache.session_manager import cache_manager
import hashlib
import json

router = APIRouter(prefix="/api/ai", tags=["AI Services"])

# Configurar Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-pro')

@router.post("/analyze-resume")
async def analyze_resume(
    resume_text: str,
    job_requirements: str,
    job_title: str,
    current_user: User = Depends(get_current_user)
):
    """
    Analisa currículo usando Gemini AI com Cache em Redis
    """
    # 1. Gerar Hash para Cache
    cache_key = hashlib.md5(f"{resume_text[:500]}_{job_requirements[:500]}".encode()).hexdigest()
    
    # 2. Verificar Cache (Redis)
    try:
        cached_result = await cache_manager.redis_client.get(f"resume_analysis:{cache_key}")
        if cached_result:
            return {
                "success": True,
                "analysis": cached_result,
                "cached": True,
                "analyzed_at": datetime.now().isoformat()
            }
    except Exception:
        pass # Se o Redis estiver fora, continua sem cache

    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Gemini API não configurada. Configure GEMINI_API_KEY no .env"
        )
    
    try:
        prompt = f"""
Você é um especialista em recrutamento e seleção. Analise o currículo abaixo em relação aos requisitos da vaga.

VAGA: {job_title}

REQUISITOS DA VAGA:
{job_requirements}

CURRÍCULO DO CANDIDATO:
{resume_text}

Forneça uma análise estruturada em JSON com:
1. score (0-100): Compatibilidade geral
2. strengths (lista): Principais pontos fortes do candidato
3. weaknesses (lista): Gaps ou pontos de atenção
4. recommendation (string): "approve", "interview", ou "reject"
5. summary (string): Resumo da análise em 2-3 frases

Responda APENAS com o JSON, sem texto adicional.
"""
        
        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        # Tentar parsear como JSON
        try:
            clean_text = result_text
            if clean_text.startswith("```"):
                clean_text = clean_text.split("```")[1]
                if clean_text.startswith("json"):
                    clean_text = clean_text[4:]
            
            analysis = json.loads(clean_text)
        except:
            # Fallback
            analysis = {
                "score": 75,
                "strengths": ["Experiência relevante"],
                "weaknesses": ["Gaps identificados"],
                "recommendation": "interview",
                "summary": result_text[:200]
            }
        
        # 4. Salvar no Cache
        try:
            await cache_manager.redis_client.set(f"resume_analysis:{cache_key}", analysis, expire=86400)
        except Exception:
            pass # Falha no cache não impede o retorno

        return {
            "success": True,
            "analysis": analysis,
            "cached": False,
            "analyzed_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao analisar currículo: {str(e)}"
        )

@router.post("/analyze-resume-async")
async def analyze_resume_async(
    resume_text: str,
    job_requirements: str,
    job_title: str,
    current_user: User = Depends(get_current_user)
):
    """
    Inicia análise assíncrona. Retorna task_id para acompanhamento.
    """
    from ai_engine.worker import analyze_resume_task
    
    task = analyze_resume_task.delay(resume_text, job_requirements)
    
    return {
        "success": True,
        "task_id": task.id,
        "status": "processing",
        "message": "Análise enviada para o Agente Jules em background."
    }

@router.post("/generate-interview-questions")
async def generate_interview_questions(
    job_title: str,
    job_description: str,
    candidate_background: Optional[str] = None,
    question_count: int = 5,
    current_user: User = Depends(get_current_user)
):
    """
    Gera perguntas de entrevista personalizadas usando Gemini
    """
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Gemini API não configurada"
        )
    
    try:
        prompt = f"""
Você é um especialista em entrevistas técnicas e comportamentais.

Gere {question_count} perguntas de entrevista para a vaga de {job_title}.

DESCRIÇÃO DA VAGA:
{job_description}

{"BACKGROUND DO CANDIDATO: " + candidate_background if candidate_background else ""}

Forneça perguntas que avaliem:
- Competências técnicas
- Soft skills
- Fit cultural
- Experiências relevantes

Retorne em formato JSON:
{{
  "questions": [
    {{
      "question": "texto da pergunta",
      "type": "technical" ou "behavioral",
      "focus_area": "área que a pergunta avalia"
    }}
  ]
}}
"""
        
        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        import json
        try:
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
            
            questions_data = json.loads(result_text)
        except:
            # Fallback
            questions_data = {
                "questions": [
                    {
                        "question": "Descreva um projeto desafiador que você liderou",
                        "type": "behavioral",
                        "focus_area": "Liderança"
                    }
                ]
            }
        
        return {
            "success": True,
            "questions": questions_data.get("questions", []),
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao gerar perguntas: {str(e)}"
        )

@router.post("/chat")
async def ai_chat_assistant(
    message: str,
    context: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Assistente de RH via chat (Gemini)
    """
    if not GEMINI_API_KEY:
        return {
            "response": "Gemini API não configurada. Configure GEMINI_API_KEY no arquivo .env"
        }
    
    try:
        system_context = """
Você é um assistente especializado em Recursos Humanos e Recrutamento da Innovation.ia.
Ajude com dúvidas sobre processos seletivos, gestão de candidatos, melhores práticas de RH.
Seja profissional, objetivo e prestativo.
"""
        
        full_prompt = f"{system_context}\n\n"
        if context:
            full_prompt += f"CONTEXTO: {context}\n\n"
        full_prompt += f"PERGUNTA: {message}"
        
        response = model.generate_content(full_prompt)
        
        return {
            "response": response.text,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "response": f"Erro ao processar mensagem: {str(e)}"
        }

```

---

### File: `backend\src\api\v1\endpoints\applications.py`
```py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from core.dependencies import (
    get_current_user,
    require_active_company,
    require_company_subscription,
    require_role,
)
from core.roles import Role
from infrastructure.database.sql.dependencies import get_db
from domain.models.application import Application
from domain.models.application_status_history import ApplicationStatusHistory
from domain.models.job import Job
from domain.schemas.application import ApplicationCreate, ApplicationOut, ApplicationUpdate
from services.audit_service import log_event
from services.notification_service import notify_application_status_change
from domain.models.user import User
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/applications", tags=["applications"])

ALLOWED_APPLICATION_STATUSES = {"received", "in_review", "approved", "rejected"}


@router.get("/me", response_model=List[ApplicationOut])
def list_my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    apps = (
        db.query(Application)
        .filter(Application.candidate_user_id == current_user.id)
        .order_by(Application.id.desc())
        .all()
    )
    return apps


@router.get("/company", response_model=List[ApplicationOut])
def list_company_applications(
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    _subscription=Depends(require_company_subscription),
    _company_user=Depends(require_role(Role.COMPANY)),
    job_id: int | None = None,
):
    query = db.query(Application).filter(Application.company_id == company_id)
    if job_id:
        query = query.filter(Application.job_id == job_id)
    apps = query.order_by(Application.id.desc()).all()
    return apps


@router.get("/{application_id}/history")
def get_application_history(
    application_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    _subscription=Depends(require_company_subscription),
    _company_user=Depends(require_role(Role.COMPANY)),
):
    app = (
        db.query(Application)
        .filter(Application.id == application_id)
        .filter(Application.company_id == company_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Aplicação não encontrada")

    history_items = (
        db.query(ApplicationStatusHistory)
        .filter(ApplicationStatusHistory.application_id == application_id)
        .order_by(ApplicationStatusHistory.id.desc())
        .all()
    )
    return [
        {
            "id": item.id,
            "application_id": item.application_id,
            "old_status": item.old_status,
            "new_status": item.new_status,
            "changed_by_user_id": item.changed_by_user_id,
            "created_at": item.created_at,
        }
        for item in history_items
    ]


@router.post("", response_model=ApplicationOut)
def apply_to_job(
    data: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.query(Job).filter(Job.id == data.job_id, Job.status == "open").first()
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    existing = (
        db.query(Application)
        .filter(Application.job_id == data.job_id)
        .filter(Application.candidate_user_id == current_user.id)
        .first()
    )
    if existing:
        return existing

    app = Application(
        job_id=job.id,
        company_id=job.company_id,
        candidate_user_id=current_user.id,
        status="received",
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    log_event(
        db,
        "application_created",
        user_id=current_user.id,
        company_id=job.company_id,
        entity_type="application",
        entity_id=app.id,
    )
    return app


@router.patch("/{application_id}", response_model=ApplicationOut)
def update_application(
    application_id: int,
    data: ApplicationUpdate,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    _subscription=Depends(require_company_subscription),
    current_user=Depends(require_role(Role.COMPANY)),
):
    app = (
        db.query(Application)
        .filter(Application.id == application_id)
        .filter(Application.company_id == company_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Aplicação não encontrada")

    status_value = data.status
    old_status = app.status
    status_changed = False
    
    if status_value:
        if status_value not in ALLOWED_APPLICATION_STATUSES:
            raise HTTPException(status_code=400, detail="Status inválido")
        if status_value != old_status:
            app.status = status_value
            status_changed = True
            history = ApplicationStatusHistory(
                application_id=app.id,
                old_status=old_status,
                new_status=status_value,
                changed_by_user_id=current_user.id,
            )
            db.add(history)

    if data.recruiter_notes:
        app.recruiter_notes = data.recruiter_notes

    db.commit()
    db.refresh(app)

    if status_changed:
        log_event(
            db,
            "application_status_updated",
            user_id=current_user.id,
            company_id=company_id,
            entity_type="application",
            entity_id=app.id,
            details=status_value,
        )
        try:
            notify_application_status_change(
                recipient_email=getattr(app.candidate, "email", None),
                recipient_phone=getattr(app.candidate, "phone", None),
                application_id=app.id,
                old_status=old_status,
                new_status=status_value,
            )
        except Exception as e:
            pass # Non-critical failure

    return app

```

---

### File: `backend\src\api\v1\endpoints\audit_logs.py`
```py
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, require_internal_role
from core.roles import Role
from infrastructure.database.sql.dependencies import get_db
from domain.models.audit_log import AuditLog


router = APIRouter(prefix="/audit-logs", tags=["Audit"])


@router.get("")
def list_audit_logs(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(100)
    if current_user.role == Role.COMPANY.value:
        query = query.filter(AuditLog.user_id == current_user.id)
    logs = query.all()
    return [
        {
            "id": log.id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details,
            "created_at": log.created_at,
        }
        for log in logs
    ]


@router.get("/company/{company_id}")
def list_company_audit_logs(
    company_id: int,
    db: Session = Depends(get_db),
    _internal=Depends(require_internal_role),
):
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.company_id == company_id)
        .order_by(AuditLog.id.desc())
        .limit(200)
        .all()
    )
    return [
        {
            "id": log.id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details,
            "created_at": log.created_at,
        }
        for log in logs
    ]

```

---

### File: `backend\src\api\v1\endpoints\auth.py`
```py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from core.dependencies import get_current_user
from core.security import create_temporary_token, verify_temporary_token
from infrastructure.database.sql.dependencies import get_db
from domain.models.user import User
from domain.schemas.auth import LoginRequest, RegisterRequest, Token, UserOut
from services.auth_service import authenticate_user, register_user
from services.two_factor_service import request_code, verify_code

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/auth", tags=["Auth"])



@router.post("/register", response_model=UserOut)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    try:
        return register_user(
            db,
            data.email,
            data.password,
            name=data.name,
            phone=data.phone,
            company_name=data.company_name,
            razao_social=data.razao_social,
            cnpj=data.cnpj,
            cidade=data.cidade,
            uf=data.uf,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")  # Máximo 5 tentativas de login por minuto
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    result = authenticate_user(db, data.email, data.password)
    if not result:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    access_token, refresh_token, user = result
    
    # Cache the user upon successful login
    user_memory_cache.set(user.id, user)
    
    # Se 2FA está habilitado, retorna temporary_token
    if user.two_factor_enabled:
        request_code(db, user.id, user.email, user.phone)
        temporary_token = create_temporary_token(user.id)
        return {
            "access_token": "",
            "refresh_token": "",
            "token_type": "bearer",
            "two_factor_required": True,
            "temporary_token": temporary_token,
        }
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }



@router.post("/login/verify", response_model=Token)
@limiter.limit("3/minute")  # Máximo 3 tentativas de verificação por minuto
def verify_login_code(request: Request, temporary_token: str, code: str, db: Session = Depends(get_db)):
    """
    Verifica código 2FA usando temporary_token em vez de user_id exposto.
    Isso previne enumeração de usuários.
    """
    user_id = verify_temporary_token(temporary_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Token temporário inválido ou expirado")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if not verify_code(db, user.id, code):
        raise HTTPException(status_code=401, detail="Código inválido ou expirado")

    # Autentica sem senha (2FA já verificado)
    result = authenticate_user(db, user.email, None, skip_password=True)
    if not result:
        raise HTTPException(status_code=500, detail="Erro na autenticação")
    
    access_token, refresh_token, _ = result
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }



@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user

# --- Caching Strategy ---
# Using functools.lru_cache to cache user sessions in memory
# This reduces database hits for frequent operations like "get_current_user"
# In a distributed environment, Redis would be preferred.

from functools import lru_cache
import time

# Simple in-memory cache with expiry logic wrapper
class UserCache:
    def __init__(self):
        self._cache = {}
        self._ttl = 300 # 5 minutes

    def get(self, user_id: int):
        if user_id in self._cache:
            data, timestamp = self._cache[user_id]
            if time.time() - timestamp < self._ttl:
                return data
            else:
                del self._cache[user_id]
        return None

    def set(self, user_id: int, user_data: User):
        self._cache[user_id] = (user_data, time.time())

    def invalidate(self, user_id: int):
        if user_id in self._cache:
            del self._cache[user_id]

# Singleton instance
user_memory_cache = UserCache()

```

---

### File: `backend\src\api\v1\endpoints\candidates.py`
```py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from infrastructure.database.sql.dependencies import get_db
from ..models.user import User
from ..models.application import Application
from ..models.job import Job
from ..core.dependencies import get_current_user
from typing import List, Dict, Any

router = APIRouter(prefix="/api/candidates", tags=["candidates"])

@router.get("")
async def list_candidates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista candidatos aplicados às vagas da empresa atual"""
    try:
         # Se for Admin ou Empresa, retorna lista.
         # Filtra por active_company_id
        company_id = current_user.active_company_id
        if not company_id and current_user.role != "admin": # Permissive for now if admin
             # Se nao tiver company, talvez retorne vazio ou erro.
             # Para demo, vamos retornar vazio se nao tiver empresa
             return []

        # Join Application + User + Job
        # Select candidates that applied to jobs of this company
        results = db.query(Application, User, Job).join(
            User, Application.candidate_user_id == User.id
        ).join(
            Job, Application.job_id == Job.id
        ).filter(
            Application.company_id == company_id
        ).all()

        candidates_list = []
        seen_candidates = set() 
        
        # O mockup do frontend espera:
        # [{"nome": "João", "vaga": "Dev", "score": 95, "email": "...", "data": "..."}]
        # Mas um candidato pode ter varias aplicações.
        # Vamos retornar uma linha por aplicação para simplificar o dashboard "Últimos Candidatos"
        
        for app, user, job in results:
            candidates_list.append({
                "id": user.id, # ID do candidato para link do perfil
                "application_id": app.id,
                "nome": user.name,
                "email": user.email,
                "vaga": job.title,
                "score": app.score or 0, # Score IA
                "status": app.status,
                "data": app.created_at.strftime("%d/%m/%Y"),
                "phone": user.phone
            })
            
        return candidates_list

    except Exception as e:
        print(f"Error listing candidates: {e}")
        raise HTTPException(500, f"Erro ao listar candidatos: {str(e)}")

@router.get("/{candidate_id}")
async def get_candidate_profile(
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obter perfil completo do candidato"""
    try:
        # Tenta buscar com diferentes cases para role
        candidate = db.query(User).filter(
            User.id == candidate_id
        ).first()
        
        if not candidate:
            raise HTTPException(404, "Candidato não encontrado")
        
        # Verifica se role é candidate (case insensitive ou check simples)
        if hasattr(candidate, 'role') and str(candidate.role).upper() != "CANDIDATE":
            # Opcional: permitir ver perfil se for empresa vendo candidato
            # Mas a rota pede 'candidate_id'
            pass 
        
        # Buscar candidaturas do candidato
        applications = db.query(Application).filter(
            Application.candidate_user_id == candidate_id
        ).all()
        
        return {
            "id": candidate.id,
            "full_name": candidate.name,  # Mapeado para 'name'
            "email": candidate.email,
            "phone": getattr(candidate, 'phone', None),
            "bio": getattr(candidate, 'bio', None),
            "skills": getattr(candidate, 'skills', []),
            "experience": getattr(candidate, 'experience', None),
            "education": getattr(candidate, 'education', None),
            "applications_count": len(applications),
            "applications": [
                {
                    "id": app.id,
                    "job_id": app.job_id,
                    "status": app.status,
                    "score": getattr(app, 'score', 0),
                    "created_at": app.created_at.isoformat()
                }
                for app in applications
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Erro ao buscar candidato: {str(e)}")

@router.get("/{candidate_id}/resume")
async def get_candidate_resume(
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Baixar currículo do candidato"""
    # TODO: Implementar download de currículo
    return {"message": "Feature em desenvolvimento"}

```

---

### File: `backend\src\api\v1\endpoints\companies.py`
```py
﻿from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, require_role
from core.roles import Role
from infrastructure.database.sql.dependencies import get_db
from domain.models.company import Company


router = APIRouter(prefix="/companies", tags=["Companies"])


@router.get("/me")
def get_my_company(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.COMPANY)),
):
    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não cadastrada")
    return {
        "id": company.id,
        "owner_user_id": company.owner_user_id,
        "razao_social": company.razao_social,
        "cnpj": company.cnpj,
        "cidade": company.cidade,
        "uf": company.uf,
        "logo_url": company.logo_url,
        "plan_id": company.plan_id,
        "status": company.status,
    }


@router.post("")
def create_company(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.COMPANY)),
):
    required_fields = ["razao_social", "cnpj", "cidade", "uf"]
    missing = [field for field in required_fields if not payload.get(field)]
    if missing:
        raise HTTPException(status_code=400, detail=f"Campos obrigatórios: {', '.join(missing)}")

    existing = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Empresa já cadastrada")

    company = Company(
        owner_user_id=current_user.id,
        razao_social=payload["razao_social"],
        cnpj=payload["cnpj"],
        cidade=payload["cidade"],
        uf=payload["uf"],
        logo_url=payload.get("logo_url"),
        plan_id=payload.get("plan_id"),
        status=payload.get("status", "active"),
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return {
        "id": company.id,
        "owner_user_id": company.owner_user_id,
        "razao_social": company.razao_social,
        "cnpj": company.cnpj,
        "cidade": company.cidade,
        "uf": company.uf,
        "logo_url": company.logo_url,
        "plan_id": company.plan_id,
        "status": company.status,
    }

```

---

### File: `backend\src\api\v1\endpoints\dashboard.py`
```py
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/metrics")
async def get_dashboard_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna métricas principais do dashboard:
    - Receita mensal
    - Custo operacional
    - Lucro líquido
    - Dados para gráficos
    """
    # TODO: Buscar dados reais do banco quando models estiverem prontos
    # Por enquanto, retornando dados mockados realistas
    
    current_month = datetime.now().month
    
    return {
        "revenue": {
            "current": 25220.00,
            "previous": 23150.00,
            "change_percent": 8.9,
            "chart_data": [
                {"month": "Jan", "value": 18500},
                {"month": "Fev", "value": 19200},
                {"month": "Mar", "value": 21000},
                {"month": "Abr", "value": 22500},
                {"month": "Mai", "value": 23150},
                {"month": "Jun", "value": 25220}
            ]
        },
        "costs": {
            "current": 6370.00,
            "previous": 5890.00,
            "change_percent": 8.1,
            "breakdown": {
                "salaries": 3200.00,
                "infrastructure": 1500.00,
                "marketing": 970.00,
                "others": 700.00
            },
            "chart_data": [
                {"month": "Jan", "value": 5200},
                {"month": "Fev", "value": 5400},
                {"month": "Mar", "value": 5600},
                {"month": "Abr", "value": 5750},
                {"month": "Mai", "value": 5890},
                {"month": "Jun", "value": 6370}
            ]
        },
        "profit": {
            "current": 19350.00,
            "previous": 17260.00,
            "change_percent": 12.1,
            "margin_percent": 76.8,
            "chart_data": [
                {"month": "Jan", "value": 13300},
                {"month": "Fev", "value": 13800},
                {"month": "Mar", "value": 15400},
                {"month": "Abr", "value": 16750},
                {"month": "Mai", "value": 17260},
                {"month": "Jun", "value": 19350}
            ]
        }
    }

@router.get("/calendar")
async def get_calendar_tasks(
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna tarefas e eventos do calendário
    """
    if not month:
        month = datetime.now().month
    if not year:
        year = datetime.now().year
    
    # Dados mockados de tarefas
    tasks = [
        {
            "id": 1,
            "title": "Reunião com candidato",
            "date": f"{year}-{month:02d}-11",
            "type": "interview",
            "status": "scheduled"
        },
        {
            "id": 2,
            "title": "Publicar vaga Senior Python",
            "date": f"{year}-{month:02d}-15",
            "type": "task",
            "status": "pending"
        },
        {
            "id": 3,
            "title": "Candidato para senior completo",
            "date": f"{year}-{month:02d}-18",
            "type": "task",
            "status": "completed"
        },
        {
            "id": 4,
            "title": "Delegado no esta semana",
            "date": f"{year}-{month:02d}-22",
            "type": "task",
            "status": "pending"
        }
    ]
    
    return {
        "month": month,
        "year": year,
        "tasks": tasks
    }

@router.get("/kanban")
async def get_kanban_board(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna processos seletivos organizados em kanban
    Colunas: A Fazer | Em Progresso | Em Revisão | Concluído
    """
    
    kanban_data = {
        "columns": [
            {
                "id": "todo",
                "title": "A Fazer",
                "color": "#6B7280",
                "cards": [
                    {
                        "id": "job_1",
                        "title": "Candidato para Senior Python Developer",
                        "job_title": "Senior Python Developer",
                        "candidates_count": 5,
                        "priority": "high",
                        "avatars": ["JD", "MS"]
                    }
                ]
            },
            {
                "id": "in_progress",
                "title": "Em Progresso",
                "color": "#3B82F6",
                "cards": [
                    {
                        "id": "job_2",
                        "title": "Candidato para Senior Python Developer",
                        "job_title": "Senior Python Developer",
                        "candidates_count": 3,
                        "priority": "medium",
                        "status": "Entrevista Hoje",
                        "avatars": ["AB", "CD"]
                    },
                    {
                        "id": "job_3",
                        "title": "Designer",
                        "job_title": "UI/UX Designer",
                        "candidates_count": 2,
                        "priority": "low",
                        "status": "Análise de Portfólio",
                        "avatars": ["EF"]
                    }
                ]
            },
            {
                "id": "review",
                "title": "Em Revisão",
                "color": "#F59E0B",
                "cards": [
                    {
                        "id": "job_4",
                        "title": "Candidato para Devto Revisto",
                        "job_title": "Full Stack Developer",
                        "candidates_count": 1,
                        "priority": "high",
                        "status": "Aguardando Aprovação",
                        "avatars": ["GH", "IJ"]
                    }
                ]
            },
            {
                "id": "done",
                "title": "Concluído",
                "color": "#10B981",
                "cards": [
                    {
                        "id": "job_5",
                        "title": "Candidato para Senior Sector Developer",
                        "job_title": "Senior Backend Developer",
                        "candidates_count": 1,
                        "priority": "completed",
                        "status": "Contratado",
                        "completed_date": "2023-06-10",
                        "avatars": ["KL", "MN"]
                    }
                ]
            }
        ]
    }
    
    return kanban_data

@router.get("/recent-activity")
async def get_recent_activity(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna atividades recentes do sistema
    """
    activities = [
        {
            "id": 1,
            "type": "application",
            "message": "Nova candidatura para Senior Python Developer",
            "candidate_name": "João Silva",
            "timestamp": datetime.now() - timedelta(minutes=5),
            "avatar": "JS"
        },
        {
            "id": 2,
            "type": "interview",
            "message": "Entrevista agendada com Maria Santos",
            "candidate_name": "Maria Santos",
            "timestamp": datetime.now() - timedelta(hours=2),
            "avatar": "MS"
        },
        {
            "id": 3,
            "type": "job",
            "message": "Nova vaga publicada: UX Designer",
            "timestamp": datetime.now() - timedelta(hours=5),
            "avatar": None
        }
    ]
    
    return {"activities": activities[:limit]}

```

---

### File: `backend\src\api\v1\endpoints\documents.py`
```py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, require_active_company
from core.roles import Role
from infrastructure.database.sql.dependencies import get_db
from domain.models.document import Document
from domain.models.subscription import Subscription
from services.plan_service import get_subscription_plan, has_any_services_feature


router = APIRouter(prefix="/documents", tags=["Documents"])


def _company_has_services(db: Session, company_id: int) -> bool:
    sub = (
        db.query(Subscription)
        .filter(Subscription.company_id == company_id)
        .order_by(Subscription.created_at.desc())
        .first()
    )
    plan = get_subscription_plan(db, sub)
    return has_any_services_feature(plan)


@router.get("/company")
def list_company_documents(
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    current_user=Depends(get_current_user),
):
    if current_user.role != Role.COMPANY.value:
        raise HTTPException(status_code=403, detail="Acesso restrito à empresa")

    has_services = _company_has_services(db, company_id)
    query = db.query(Document).filter(Document.company_id == company_id)
    if has_services:
        query = query.filter(Document.status == "approved")

    docs = query.order_by(Document.id.desc()).all()
    return [
        {
            "id": doc.id,
            "company_id": doc.company_id,
            "user_id": doc.user_id,
            "name": doc.name,
            "file_path": doc.file_path,
            "doc_type": doc.doc_type,
            "status": doc.status,
            "validation_reason": doc.validation_reason,
            "validated_by_user_id": doc.validated_by_user_id,
            "validated_at": doc.validated_at,
            "created_at": doc.created_at,
        }
        for doc in docs
    ]

```

---

### File: `backend\src\api\v1\endpoints\finance.py`
```py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db.dependencies import get_db
from ..core.dependencies import get_current_user
from ..models.user import User
from ..models.finance import Transaction
from ..services.finance_service import finance_service
from ..models.audit_log import AuditLog
from domain.schemas.finance import TransactionCreate
from typing import List
from decimal import Decimal
from datetime import datetime, time

router = APIRouter(prefix="/api/finance", tags=["finance"])

@router.get("/summary")
async def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.lower() != "company":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    return finance_service.get_cash_flow_summary(db, current_user.id)

@router.get("/prediction")
async def get_prediction(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.lower() != "company":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    return finance_service.ai_cash_flow_prediction(db, current_user.id)

@router.post("/transactions")
async def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.lower() != "company":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    
    # Pydantic validates date format automatically

    transaction = Transaction(
        description=data.description,
        amount=data.amount,
        type=data.type,
        due_date=datetime.combine(data.due_date, time.min),
        company_id=current_user.id
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction

@router.get("/anomalies")
async def get_anomalies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.lower() != "company":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    return finance_service.detect_anomalies(db, current_user.id)

@router.get("/logs")
async def get_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.lower() != "company":
        raise HTTPException(status_code=403, detail="Acesso não autorizado")

    return db.query(AuditLog).filter(AuditLog.company_id == current_user.id).order_by(AuditLog.created_at.desc()).limit(20).all()

```

---

### File: `backend\src\api\v1\endpoints\health.py`
```py
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from core.config import settings
from infrastructure.database.sql.dependencies import get_db
from services.notification_service import NotificationPayload, send_email

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint para verificar:
    - Conexão com o banco de dados
    - Configuração de e-mail (SendGrid)
    - Configuração de SMS (Twilio)
    """
    checks = {
        "status": "healthy",
        "database": "unknown",
        "email_configured": bool(settings.SENDGRID_API_KEY),
        "sms_configured": bool(settings.TWILIO_ACCOUNT_SID),
    }

    # Testa conexão com banco
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "connected"
    except Exception as e:
        checks["status"] = "unhealthy"
        checks["database"] = f"error: {str(e)}"

    return checks


@router.get("/health/deep")
def deep_health_check(db: Session = Depends(get_db)):
    """
    Health check profundo que testa envio real de e-mail.
    Use com cuidado em produção.
    """
    checks = {
        "status": "healthy",
        "database": "unknown",
        "email_send": "not_tested",
    }

    # Testa conexão com banco
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "connected"
    except Exception as e:
        checks["status"] = "unhealthy"
        checks["database"] = f"error: {str(e)}"
        return checks

    # Testa envio de e-mail (apenas se configurado)
    if settings.SENDGRID_API_KEY and settings.EMAIL_FROM:
        try:
            payload = NotificationPayload(
                recipient_email=settings.EMAIL_FROM,
                recipient_phone=None,
                subject="Health Check - Innovation.ia",
                message="Este é um teste automático do sistema de health check."
            )
            success = send_email(payload)
            checks["email_send"] = "success" if success else "failed"
        except Exception as e:
            checks["email_send"] = f"error: {str(e)}"
            checks["status"] = "degraded"
    else:
        checks["email_send"] = "not_configured"

    return checks

```

---

### File: `backend\src\api\v1\endpoints\interviews.py`
```py
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User

router = APIRouter(prefix="/api/interviews", tags=["Interviews"])

@router.get("")
async def list_interviews(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista todas as entrevistas
    """
    # Dados mockados
    interviews = [
        {
            "id": 1,
            "candidate_name": "João Silva",
            "candidate_email": "joao@email.com",
            "job_title": "Senior Python Developer",
            "scheduled_date": "2023-06-15T14:00:00",
            "interviewer": "Carlos Manager",
            "status": "scheduled",
            "type": "technical",
            "location": "Online - Google Meet"
        },
        {
            "id": 2,
            "candidate_name": "Maria Santos",
            "candidate_email": "maria@email.com",
            "job_title": "UX Designer",
            "scheduled_date": "2023-06-16T10:00:00",
            "interviewer": "Ana Lead",
            "status": "scheduled",
            "type": "portfolio_review",
            "location": "Presencial - Escritório SP"
        },
        {
            "id": 3,
            "candidate_name": "Pedro Costa",
            "candidate_email": "pedro@email.com",
            "job_title": "Data Scientist",
            "scheduled_date": "2023-06-10T15:00:00",
            "interviewer": "Carlos Manager",
            "status": "completed",
            "type": "technical",
            "location": "Online - Zoom",
            "feedback": "Excelente conhecimento técnico",
            "score": 9.5
        }
    ]
    
    if status:
        interviews = [i for i in interviews if i["status"] == status]
    
    return {"interviews": interviews, "total": len(interviews)}

@router.post("")
async def schedule_interview(
    application_id: int,
    scheduled_date: datetime,
    interviewer_id: int,
    interview_type: str,
    location: str,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Agenda uma nova entrevista
    """
    # TODO: Implementar criação real no banco
    new_interview = {
        "id": 999,
        "application_id": application_id,
        "scheduled_date": scheduled_date.isoformat(),
        "interviewer_id": interviewer_id,
        "type": interview_type,
        "location": location,
        "notes": notes,
        "status": "scheduled",
        "created_at": datetime.now().isoformat()
    }
    
    return {
        "message": "Entrevista agendada com sucesso",
        "interview": new_interview
    }

@router.put("/{interview_id}")
async def update_interview(
    interview_id: int,
    status: Optional[str] = None,
    scheduled_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Atualiza uma entrevista existente
    """
    # TODO: Implementar atualização real
    return {
        "message": "Entrevista atualizada com sucesso",
        "interview_id": interview_id
    }

@router.post("/{interview_id}/feedback")
async def add_interview_feedback(
    interview_id: int,
    feedback: str,
    score: float,
    recommendation: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Adiciona feedback após a entrevista
    """
    if score < 0 or score > 10:
        raise HTTPException(status_code=400, detail="Score deve estar entre 0 e 10")
    
    # TODO: Salvar feedback no banco
    return {
        "message": "Feedback registrado com sucesso",
        "interview_id": interview_id,
        "score": score,
        "recommendation": recommendation
    }

@router.get("/calendar")
async def get_interview_calendar(
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna entrevistas organizadas por calendário
    """
    if not month:
        month = datetime.now().month
    if not year:
        year = datetime.now().year
    
    # Dados mockados
    calendar_data = {
        "2023-06-15": [
            {
                "id": 1,
                "time": "14:00",
                "candidate": "João Silva",
                "job": "Senior Python Developer",
                "type": "technical"
            }
        ],
        "2023-06-16": [
            {
                "id": 2,
                "time": "10:00",
                "candidate": "Maria Santos",
                "job": "UX Designer",
                "type": "portfolio_review"
            }
        ]
    }
    
    return {
        "month": month,
        "year": year,
        "interviews": calendar_data
    }

```

---

### File: `backend\src\api\v1\endpoints\jobs.py`
```py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from core.dependencies import (
    get_current_user,
    require_active_company,
    require_company_subscription,
    require_role,
)
from core.roles import Role
from infrastructure.database.sql.dependencies import get_db
from domain.models.job import Job
from domain.models.application import Application
from domain.models.user import User
from domain.schemas.job import JobCreate, JobOut, JobUpdate
from services.audit_service import log_event

router = APIRouter(prefix="/api/jobs", tags=["jobs"])
logger = logging.getLogger(__name__)

@router.get("", response_model=List[JobOut])
def list_jobs(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = "open",
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lista vagas (público) - Mesclado com filtros"""
    try:
        query = db.query(Job)
        
        if status:
            query = query.filter(Job.status == status)
        
        if search:
            query = query.filter(
                (Job.title.ilike(f"%{search}%")) |
                (Job.description.ilike(f"%{search}%"))
            )
        
        jobs = query.order_by(Job.id.desc()).offset(skip).limit(limit).all()
        return jobs
        
    except Exception as e:
        logger.error(f"Erro ao listar vagas: {str(e)}")
        raise HTTPException(500, str(e))

@router.get("/company", response_model=List[JobOut])
def list_company_jobs(
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    _subscription=Depends(require_company_subscription),
    _company_user=Depends(require_role(Role.COMPANY)),
):
    """Lista vagas específicas da empresa logada"""
    jobs = db.query(Job).filter(Job.company_id == company_id).order_by(Job.id.desc()).all()
    return jobs

@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    """Detalhes de uma vaga"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Vaga não encontrada")
    return job

@router.post("", response_model=JobOut)
def create_job(
    data: JobCreate,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    current_user=Depends(require_role(Role.COMPANY)),
):
    """Criação de vaga com auditoria"""
    try:
        job = Job(
            company_id=company_id,
            title=data.title,
            description=data.description,
            location=data.location,
            status=data.status or "open",
            requirements=data.requirements,
            salary=data.salary,
            type=data.type
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        log_event(
            db,
            "job_created",
            user_id=current_user.id,
            company_id=company_id,
            entity_type="job",
            entity_id=job.id,
        )
        return job
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao criar vaga: {str(e)}")
        raise HTTPException(500, str(e))

@router.patch("/{job_id}", response_model=JobOut)
def update_job(
    job_id: int,
    data: JobUpdate,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    current_user=Depends(require_role(Role.COMPANY)),
):
    """Atualização de vaga com auditoria"""
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(job, field, value)

    db.commit()
    db.refresh(job)

    log_event(
        db,
        "job_updated",
        user_id=current_user.id,
        company_id=company_id,
        entity_type="job",
        entity_id=job.id,
    )
    return job

@router.delete("/{job_id}", status_code=204)
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    current_user=Depends(require_role(Role.COMPANY)),
):
    """Deleção de vaga"""
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company_id).first()
    if not job:
        raise HTTPException(404, "Vaga não encontrada")
    
    db.delete(job)
    db.commit()
    
    log_event(
        db,
        "job_deleted",
        user_id=current_user.id,
        company_id=company_id,
        entity_type="job",
        entity_id=job_id,
    )
    return None

@router.get("/{job_id}/applications")
def get_job_applications(
    job_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    current_user=Depends(require_role(Role.COMPANY)),
):
    """Candidaturas de uma vaga com detalhes dos candidatos"""
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company_id).first()
    if not job:
        raise HTTPException(404, "Vaga não encontrada")
    
    applications = db.query(Application).filter(Application.job_id == job_id).all()
    
    result = []
    for app in applications:
        candidate = db.query(User).filter(User.id == app.candidate_id).first()
        result.append({
            "id": app.id,
            "job_id": app.job_id,
            "candidate_id": app.candidate_id,
            "candidate_name": candidate.full_name if candidate else "Desconhecido",
            "candidate_email": candidate.email if candidate else "",
            "status": app.status,
            "match_score": app.match_score,
            "ai_analysis": app.ai_analysis,
            "recruiter_notes": app.recruiter_notes,
            "created_at": app.created_at.isoformat() if app.created_at else None
        })
    
    return result

```

---

### File: `backend\src\api\v1\endpoints\matching.py`
```py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db.database import get_db
from ..models.job import Job
from ..models.application import Application
from ..models.user import User
from ..core.dependencies import get_current_user
from typing import List
import re

router = APIRouter(prefix="/api/matching", tags=["matching"])

def calculate_match_score(job: Job, candidate: User) -> dict:
    """Calcular score de match entre vaga e candidato"""
    
    score = 0
    reasons = []
    
    # Análise básica de keywords (simplificada)
    job_keywords = set(re.findall(r'\b\w+\b', (job.requirements or "").lower()))
    
    # Simular skills do candidato (em produção viriam do perfil)
    candidate_skills = set(re.findall(r'\b\w+\b', (candidate.skills or "python, javascript, react, sql, aws").lower()))
    
    # Calcular match
    matches = job_keywords.intersection(candidate_skills)
    
    if matches:
        score = min(int((len(matches) / max(len(job_keywords), 1)) * 100), 100)
        reasons.append(f"Skills em comum: {', '.join(matches)}")
    else:
        score = 30  # Score base
        reasons.append("Perfil genérico - necessária análise manual")
    
    # Análise de localização
    if job.type == "remoto":
        score += 10
        reasons.append("Vaga remota - sem restrição geográfica")
    
    analysis = "\n".join(reasons)
    
    return {
        "score": score,
        "analysis": analysis,
        "recommendation": "Entrevistar" if score >= 70 else "Revisar" if score >= 50 else "Baixa compatibilidade"
    }

@router.get("/jobs/{job_id}/candidates")
async def get_matched_candidates(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Candidatos ranqueados por match (empresa)"""
    
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(404, "Vaga não encontrada")
    
    if job.company_id != current_user.id:
        raise HTTPException(403, "Sem permissão")
    
    # Buscar candidaturas
    applications = db.query(Application).filter(
        Application.job_id == job_id
    ).all()
    
    results = []
    
    for app in applications:
        candidate = db.query(User).filter(User.id == app.candidate_id).first()
        
        if not candidate:
            continue
        
        # Calcular ou pegar score
        if app.match_score is None:
            match_data = calculate_match_score(job, candidate)
            app.match_score = float(match_data["score"])
            app.ai_analysis = match_data["analysis"]
            db.commit()
        else:
            match_data = {
                "score": app.match_score,
                "analysis": app.ai_analysis or "Sem análise",
                "recommendation": "Entrevistar" if app.match_score >= 70 else "Revisar"
            }
        
        results.append({
            "application_id": app.id,
            "candidate_id": candidate.id,
            "candidate_name": candidate.full_name,
            "candidate_email": candidate.email,
            "match_score": match_data["score"],
            "analysis": match_data["analysis"],
            "recommendation": match_data["recommendation"],
            "status": app.status,
            "created_at": app.created_at.isoformat()
        })
    
    # Ordenar por score
    results.sort(key=lambda x: x["match_score"], reverse=True)
    
    return results

```

---

### File: `backend\src\api\v1\endpoints\payments.py`
```py
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
import mercadopago
import os
from ..db.database import get_db
from ..models.user import User
# from ..core.config import settings # Config is usually env vars

router = APIRouter(prefix="/api/payments", tags=["payments"])

# Configurar Mercado Pago
MP_ACCESS_TOKEN = os.getenv("MP_ACCESS_TOKEN", "TEST-TOKEN") # Fallback to test
mp = mercadopago.SDK(MP_ACCESS_TOKEN)

API_URL = os.getenv("API_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8000") # Changed to 8000 for serving static files

@router.post("/webhook")
async def mercadopago_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Webhook do Mercado Pago
    Recebe notificações de pagamento e atualiza status de assinatura
    """
    try:
        body = await request.json()
        
        # Validar webhook
        if body.get("type") == "payment":
            payment_id = body["data"]["id"]
            
            # Buscar detalhes do pagamento
            if payment_id == "1234567890": # MOCK FOR TESTING
                payment = {
                    "payer": {"email": "test@innovation.ia"},
                    "status": "approved",
                    "metadata": {"plan": "pro"}
                }
            else:
                payment_info = mp.payment().get(payment_id)
                payment = payment_info["response"]
            
            # Extrair dados
            user_email = payment["payer"]["email"]
            status = payment["status"]
            # plan = payment["metadata"]["plan"]  # starter, pro, enterprise
            
            # Atualizar usuário no banco
            user = db.query(User).filter(User.email == user_email).first()
            if user:
                if status == "approved":
                    user.subscription_status = "active"
                    # user.subscription_plan = plan 
                elif status == "cancelled":
                    user.subscription_status = "cancelled"
                
                db.commit()
            
            return {"status": "processed"}
        
        return {"status": "ignored"}
        
    except Exception as e:
        # Log error in production
        # raise HTTPException(500, f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

@router.post("/create-subscription")
async def create_subscription(data: dict, db: Session = Depends(get_db)):
    """
    Criar link de pagamento para assinatura
    """
    plan = data.get("plan")
    user_id = data.get("user_id")

    prices = {
        "starter": 49.00,
        "pro": 99.00,
        "enterprise": 299.00
    }
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # For testing purposes, create a dummy user or Mock if needed. 
        # But in producton, this should fail.
        # raise HTTPException(404, "User not found")
        pass # Proceed for demo flow if user not found (or return mock)
    
    email = user.email if user else "test@user.com"

    # Criar preferência de pagamento
    preference_data = {
        "items": [
            {
                "title": f"Innovation.ia - Plano {plan.title()}",
                "quantity": 1,
                "unit_price": prices.get(plan, 99.00)
            }
        ],
        "payer": {
            "email": email
        },
        "metadata": {
            "plan": plan,
            "user_id": user_id
        },
        "back_urls": {
            "success": f"{FRONTEND_URL}/payment/success",
            "failure": f"{FRONTEND_URL}/payment/failure",
            "pending": f"{FRONTEND_URL}/payment/pending"
        },
        "auto_return": "approved",
        "notification_url": f"{API_URL}/api/payments/webhook"
    }
    
    preference = mp.preference().create(preference_data)
    
    return {
        "checkout_url": preference["response"]["init_point"],
        "preference_id": preference["response"]["id"]
    }

@router.get("/subscription-status/{user_id}")
async def get_subscription_status(user_id: int, db: Session = Depends(get_db)):
    """
    Verificar status da assinatura do usuário
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    return {
        "status": user.subscription_status or "inactive",
        "plan": getattr(user, 'subscription_plan', "none"),
        "active": user.subscription_status == "active"
    }

```

---

### File: `backend\src\api\v1\endpoints\plans.py`
```py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.dependencies import require_admin_role
from infrastructure.database.sql.dependencies import get_db
from domain.models.plan import Plan

router = APIRouter(prefix="/plans", tags=["plans"])

@router.get("")
def list_plans(
    db: Session = Depends(get_db),
    _admin=Depends(require_admin_role),
):
    plans = db.query(Plan).order_by(Plan.id.asc()).all()
    return [
        {"id": plan.id, "name": plan.name, "price": plan.price, "features": plan.features}
        for plan in plans
    ]

```

---

### File: `backend\src\api\v1\endpoints\projects.py`
```py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..db.dependencies import get_db
from ..models.project import Project
from ..models.task import Task
from ..services.project_service import project_service
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/projects", tags=["projects"])

class ProjectCreate(BaseModel):
    name: str
    description: str = None

class TaskCreate(BaseModel):
    title: str
    description: str = None
    project_id: int
    estimated_hours: float = 0.0
    cost_per_hour: float = 0.0

@router.post("/")
async def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    # Mock company_id por enquanto (deve vir do token)
    project = Project(name=data.name, description=data.description, company_id=1)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("/")
async def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()

@router.post("/tasks")
async def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    task = Task(
        title=data.title, 
        description=data.description, 
        project_id=data.project_id,
        estimated_hours=data.estimated_hours,
        cost_per_hour=data.cost_per_hour
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.post("/tasks/{task_id}/start")
async def start_task(task_id: int, db: Session = Depends(get_db)):
    # Mock user_id = 1
    return project_service.start_time_tracking(db, task_id, 1)

@router.post("/time-entries/{entry_id}/stop")
async def stop_task(entry_id: int, db: Session = Depends(get_db)):
    return project_service.stop_time_tracking(db, entry_id)

@router.get("/{project_id}/stats")
async def project_stats(project_id: int, db: Session = Depends(get_db)):
    return project_service.calculate_project_costs(db, project_id)

```

---

### File: `backend\src\api\v1\endpoints\rh.py`
```py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from ..db.dependencies import get_db
from ..services.rh_service import rh_service
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/rh", tags=["rh"])

class LeaveCreate(BaseModel):
    start_date: str
    end_date: str
    reason: str

@router.post("/onboarding/{onboarding_id}/upload")
async def upload_doc(onboarding_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    # Chama serviço de IA para processar (Mock no momento)
    return rh_service.process_document_ocr(db, onboarding_id, str(content))

@router.post("/leave-requests")
async def create_leave(data: LeaveCreate, db: Session = Depends(get_db)):
    # Lógica simplificada
    return {"status": "success", "message": "Solicitação enviada"}

@router.get("/leave-requests")
async def list_leaves(db: Session = Depends(get_db)):
    from ..models.leave_request import LeaveRequest
    return db.query(LeaveRequest).all()

@router.post("/performance-reviews")
async def create_review(employee_id: int, reviewer_id: int, score: float, feedback: str, db: Session = Depends(get_db)):
    return rh_service.add_performance_review(db, employee_id, reviewer_id, score, feedback)

@router.get("/onboarding/{employee_id}/contract")
async def get_contract(employee_id: int, db: Session = Depends(get_db)):
    return {"contract": await rh_service.generate_contract_draft(db, employee_id)}

@router.post("/pulse")
async def pulse(score: int, comment: str = None, db: Session = Depends(get_db)):
    # Mock user_id = 1
    return rh_service.register_pulse(db, 1, score, comment)

@router.get("/employees/{employee_id}/badges")
async def get_badges(employee_id: int, db: Session = Depends(get_db)):
    from ..models.user import User
    user = db.query(User).filter(User.id == employee_id).first()
    return {"badges": user.badges if user else "[]", "points": user.points if user else 0}

```

---

### File: `backend\src\api\v1\endpoints\services_documents.py`
```py
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.dependencies import require_services_role
from core.plans import PlanFeature
from infrastructure.database.sql.dependencies import get_db
from domain.models.company import Company
from domain.models.document import Document
from domain.models.subscription import Subscription
from services.audit_service import log_event
from services.plan_service import get_subscription_plan, has_plan_feature


router = APIRouter(prefix="/services/documents", tags=["Services Documents"])


def _get_company_subscription(db: Session, company_id: int) -> Subscription | None:
    return (
        db.query(Subscription)
        .filter(Subscription.company_id == company_id)
        .order_by(Subscription.created_at.desc())
        .first()
    )


def _ensure_validation_service(db: Session, company_id: int) -> None:
    sub = _get_company_subscription(db, company_id)
    plan = get_subscription_plan(db, sub)
    if not has_plan_feature(plan, PlanFeature.SERVICES_VALIDATION):
        raise HTTPException(status_code=403, detail="Empresa sem serviço de validação")


@router.get("")
def list_documents_for_validation(
    company_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_services_role),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    _ensure_validation_service(db, company_id)

    docs = (
        db.query(Document)
        .filter(Document.company_id == company_id)
        .order_by(Document.id.desc())
        .all()
    )
    return [
        {
            "id": doc.id,
            "company_id": doc.company_id,
            "user_id": doc.user_id,
            "name": doc.name,
            "file_path": doc.file_path,
            "doc_type": doc.doc_type,
            "status": doc.status,
            "validation_reason": doc.validation_reason,
            "validated_by_user_id": doc.validated_by_user_id,
            "validated_at": doc.validated_at,
            "created_at": doc.created_at,
        }
        for doc in docs
    ]


@router.post("/{document_id}/approve")
def approve_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_services_role),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    _ensure_validation_service(db, doc.company_id)

    doc.status = "approved"
    doc.validation_reason = None
    doc.validated_by_user_id = current_user.id
    doc.validated_at = datetime.utcnow()
    db.commit()

    log_event(
        db,
        "document_approved",
        user_id=current_user.id,
        company_id=doc.company_id,
        entity_type="document",
        entity_id=doc.id,
    )
    return {"ok": True, "status": doc.status}


@router.post("/{document_id}/reject")
def reject_document(
    document_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_services_role),
):
    reason = (payload.get("reason") or "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="reason é obrigatório")

    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    _ensure_validation_service(db, doc.company_id)

    doc.status = "rejected"
    doc.validation_reason = reason
    doc.validated_by_user_id = current_user.id
    doc.validated_at = datetime.utcnow()
    db.commit()

    log_event(
        db,
        "document_rejected",
        user_id=current_user.id,
        company_id=doc.company_id,
        entity_type="document",
        entity_id=doc.id,
        details=reason,
    )
    return {"ok": True, "status": doc.status}

```

---

### File: `backend\src\api\v1\endpoints\services_full.py`
```py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.dependencies import require_services_role
from core.plans import PlanFeature
from infrastructure.database.sql.dependencies import get_db
from domain.models.company import Company
from domain.models.job import Job
from domain.models.subscription import Subscription
from services.plan_service import get_subscription_plan, has_plan_feature


router = APIRouter(prefix="/services/full", tags=["Services Full"])


def _company_has_full_service(db: Session, company_id: int) -> bool:
    sub = (
        db.query(Subscription)
        .filter(Subscription.company_id == company_id)
        .order_by(Subscription.created_at.desc())
        .first()
    )
    plan = get_subscription_plan(db, sub)
    return has_plan_feature(plan, PlanFeature.SERVICES_FULL)


@router.get("/companies")
def list_full_service_companies(
    db: Session = Depends(get_db),
    _user=Depends(require_services_role),
):
    companies = db.query(Company).order_by(Company.id.asc()).all()
    return [
        {
            "id": company.id,
            "razao_social": company.razao_social,
            "cnpj": company.cnpj,
            "cidade": company.cidade,
            "uf": company.uf,
        }
        for company in companies
        if _company_has_full_service(db, company.id)
    ]


@router.get("/companies/{company_id}/jobs")
def list_full_service_jobs(
    company_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_services_role),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    if not _company_has_full_service(db, company_id):
        raise HTTPException(status_code=403, detail="Empresa sem full service")

    jobs = db.query(Job).filter(Job.company_id == company_id).order_by(Job.id.desc()).all()
    return [
        {
            "id": job.id,
            "company_id": job.company_id,
            "title": job.title,
            "description": job.description,
            "location": job.location,
            "status": job.status,
        }
        for job in jobs
    ]

```

---

### File: `backend\src\api\v1\endpoints\subscriptions.py`
```py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, require_role
from core.roles import Role
from infrastructure.database.sql.dependencies import get_db
from domain.models.company import Company
from domain.models.subscription import Subscription
from domain.models.plan import Plan
from services.audit_service import log_event


router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.get("/me")
def get_my_subscription(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.COMPANY)),
):
    sub = (
        db.query(Subscription)
        .filter(Subscription.user_id == current_user.id)
        .order_by(Subscription.created_at.desc())
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Assinatura não encontrada")
    company = db.query(Company).filter(Company.id == sub.company_id).first()
    if not company or company.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Empresa inválida")
    return {
        "id": sub.id,
        "company_id": sub.company_id,
        "plan_id": sub.plan_id,
        "status": sub.status,
        "mp_preapproval_id": sub.mp_preapproval_id,
    }


@router.post("")
def create_subscription(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.COMPANY)),
):
    plan_id = payload.get("plan_id")
    company_id = payload.get("company_id")
    if not plan_id:
        raise HTTPException(status_code=400, detail="plan_id é obrigatório")

    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    if company_id:
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
        if company.owner_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Empresa inválida")
    else:
        company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
        company_id = company.id

    sub = Subscription(
        user_id=current_user.id,
        company_id=company_id,
        plan_id=plan_id,
        status="pending",
        mp_preapproval_id=payload.get("mp_preapproval_id"),
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)

    log_event(
        db,
        "subscription_created",
        user_id=current_user.id,
        company_id=company_id,
        entity_type="subscription",
        entity_id=sub.id,
    )
    return {
        "id": sub.id,
        "company_id": sub.company_id,
        "plan_id": sub.plan_id,
        "status": sub.status,
        "mp_preapproval_id": sub.mp_preapproval_id,
    }

```

---

### File: `backend\src\api\v1\endpoints\support.py`
```py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db.dependencies import get_db
from ..services.support_service import support_service
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/support", tags=["support"])

class TicketCreate(BaseModel):
    title: str
    description: str

@router.post("/tickets")
async def create_ticket(data: TicketCreate, db: Session = Depends(get_db)):
    # Mock user_id = 1
    return support_service.create_ticket(db, data.title, data.description, 1)

@router.get("/tickets")
async def list_tickets(db: Session = Depends(get_db)):
    from ..models.ticket import Ticket
    return db.query(Ticket).all()

@router.get("/tickets/{ticket_id}/smart-reply")
async def get_reply(ticket_id: int, description: str):
    return {"reply": support_service.get_ai_smart_reply(ticket_id, description)}

@router.get("/system-status")
async def get_system_status():
    return {
        "api": "online",
        "database": "online",
        "ia_service": "online",
        "integrations": {
            "sendgrid": "online",
            "whatsapp": "online"
        }
    }

```

---

### File: `backend\src\api\v1\endpoints\terms.py`
```py
from fastapi import APIRouter, Depends

from core.dependencies import require_role
from core.roles import Role

router = APIRouter(prefix="/terms", tags=["terms"])

@router.post("/accept", status_code=204)
def accept_terms(_company_user=Depends(require_role(Role.COMPANY))):
    return

```

---

### File: `backend\src\api\v1\endpoints\users.py`
```py
﻿from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User
from domain.schemas.user import UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserOut)
def update_user_me(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        user = current_user
        update_data = user_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

```

---

### File: `backend\src\api\v1\endpoints\__init__.py`
```py

```

---

### File: `backend\src\core\ai_processor.py`
```py
import re
from collections import Counter

def calculate_match_score(job_description: str, candidate_text: str) -> int:
    """
    Calcula um score de 0 a 100 baseado na similaridade de palavras-chave
    entre a descrição da vaga e o texto do candidato (bio/skills).
    """
    if not job_description or not candidate_text:
        return 0

    # Normalizar textos (lowercase, remover pontuação básica)
    def normalize(text):
        return re.sub(r'[^\w\s]', '', text.lower())

    job_tokens = set(normalize(job_description).split())
    candidate_tokens = set(normalize(candidate_text).split())

    # Palavras-chave importantes (hardcoded para demo, mas poderia vir de um banco)
    keywords = {
        "python", "javascript", "react", "node", "sql", "aws", "docker", 
        "senior", "pleno", "junior", "liderança", "agile", "scrum",
        "java", "c#", ".net", "php", "ruby", "go", "rust",
        "machine", "learning", "data", "science", "analytics"
    }

    # Interseção de tokens relevantes
    relevant_job_tokens = job_tokens.intersection(keywords)
    
    if not relevant_job_tokens:
        # Se a vaga não tem keywords conhecidas, usa interseção simples
        intersection = job_tokens.intersection(candidate_tokens)
        score = (len(intersection) / len(job_tokens)) * 100
    else:
        # Pesa mais as keywords
        relevant_matches = relevant_job_tokens.intersection(candidate_tokens)
        score = (len(relevant_matches) / len(relevant_job_tokens)) * 100

    # Boost por tamanho do texto do candidato (currículo mais completo)
    if len(candidate_tokens) > 50:
        score += 10

    return min(int(score), 100)

```

---

### File: `backend\src\core\config.py`
```py
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # 30 minutos para segurança
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30  # 30 dias para manter usuário logado
    TERMS_VERSION: str = "v1"
    
    # External Services
    GEMINI_API_KEY: str | None = None
    ALLOWED_ORIGINS: str = "*"

    # Twilio Settings
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_PHONE_NUMBER: str | None = None
    
    # SendGrid Settings
    SENDGRID_API_KEY: str | None = None
    EMAIL_FROM: str = "no-reply@innovation.ia"

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

# exports diretos (simplifica imports no resto do projeto)
DATABASE_URL = settings.DATABASE_URL
# Fix relative SQLite path to absolute
if DATABASE_URL.startswith("sqlite:///./"):
    db_name = DATABASE_URL.split("sqlite:///./")[1]
    DATABASE_URL = f"sqlite:///{BASE_DIR}/{db_name}"

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS
TERMS_VERSION = settings.TERMS_VERSION

```

---

### File: `backend\src\core\dependencies.py`
```py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from core.config import SECRET_KEY, ALGORITHM
from core.roles import Role
from infrastructure.database.sql.dependencies import get_db
from domain.models.user import User
from domain.models.company import Company
from domain.models.subscription import Subscription

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Token inválido")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")

    return user


def require_active_company(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> int:
    if current_user.role != Role.COMPANY.value:
        raise HTTPException(status_code=403, detail="Acesso restrito à empresa")
    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=403, detail="Empresa não cadastrada")
    return company.id


def require_role(*roles: Role):
    def _require_role(current_user: User = Depends(get_current_user)) -> User:
        allowed = {role.value for role in roles}
        if current_user.role not in allowed:
            raise HTTPException(status_code=403, detail="Permissão insuficiente")
        return current_user

    return _require_role


def require_internal_role(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in {Role.SERVICES.value, Role.SAC.value, Role.ADM.value}:
        raise HTTPException(status_code=403, detail="Acesso interno apenas")
    return current_user


def require_services_role(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != Role.SERVICES.value:
        raise HTTPException(status_code=403, detail="Acesso exclusivo Services")
    return current_user


def require_sac_role(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != Role.SAC.value:
        raise HTTPException(status_code=403, detail="Acesso exclusivo SAC")
    return current_user


def require_admin_role(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != Role.ADM.value:
        raise HTTPException(status_code=403, detail="Acesso exclusivo ADM")
    return current_user


def require_active_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Subscription:
    sub = (
        db.query(Subscription)
        .filter(Subscription.user_id == current_user.id)
        .order_by(Subscription.created_at.desc())
        .first()
    )
    if not sub:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Nenhuma assinatura encontrada")
    if sub.status not in {"authorized", "active"}:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Assinatura inativa")
    return sub


def require_company_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Subscription:
    if current_user.role != Role.COMPANY.value:
        raise HTTPException(status_code=403, detail="Acesso restrito à empresa")
    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=403, detail="Empresa não cadastrada")
    sub = (
        db.query(Subscription)
        .filter(Subscription.company_id == company.id)
        .order_by(Subscription.created_at.desc())
        .first()
    )
    if not sub:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Nenhuma assinatura encontrada")
    if sub.status not in {"authorized", "active"}:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Assinatura inativa")
    return sub

```

---

### File: `backend\src\core\logging_config.py`
```py
import logging
import sys

def setup_logging():
    """Configurar logging para toda aplicação"""
    
    # Formato de log
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # Configurar handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(log_format))
    
    # Configurar logger root
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    logger.addHandler(handler)
    
    return logger

```

---

### File: `backend\src\core\plans.py`
```py
from __future__ import annotations

from enum import Enum


class PlanFeature(str, Enum):
    SERVICES_VALIDATION = "services_validation"
    SERVICES_FULL = "services_full"


```

---

### File: `backend\src\core\roles.py`
```py
from __future__ import annotations

from enum import Enum


class Role(str, Enum):
    COMPANY = "COMPANY"
    SERVICES = "SERVICES"
    SAC = "SAC"
    ADM = "ADM"


INTERNAL_ROLES = {Role.SERVICES, Role.SAC, Role.ADM}
COMPANY_ROLES = {Role.COMPANY}


```

---

### File: `backend\src\core\security.py`
```py
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from jose import jwt
import bcrypt

from core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS

def get_password_hash(password: str) -> str:
    # Usando bcrypt diretamente para evitar bug de compatibilidade do passlib
    hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    return hashed_bytes.decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    # Usando bcrypt diretamente para evitar bug de compatibilidade do passlib
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    """Cria um refresh token seguro com 30 dias de validade"""
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    token_data = {
        "sub": str(user_id),
        "exp": expire,
        "type": "refresh",
        "jti": secrets.token_urlsafe(32)  # JWT ID único
    }
    return jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)


def create_temporary_token(user_id: int) -> str:
    """Cria um token temporário de 5 minutos para verificação 2FA"""
    expire = datetime.now(timezone.utc) + timedelta(minutes=5)
    token_data = {
        "sub": str(user_id),
        "exp": expire,
        "type": "temporary_2fa"
    }
    return jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)


def verify_temporary_token(token: str) -> int | None:
    """Verifica e retorna o user_id de um temporary token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "temporary_2fa":
            return None
        return int(payload.get("sub"))
    except Exception:
        return None

```

---

### File: `backend\src\core\__init__.py`
```py

```

---

### File: `backend\src\domain\models\application.py`
```py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base

class Application(Base):
    __tablename__ = "applications"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default="pending")
    
    # NOVOS CAMPOS
    match_score = Column(Float, nullable=True)  # Score de matching IA
    ai_analysis = Column(Text, nullable=True)  # Análise da IA
    recruiter_notes = Column(Text, nullable=True)  # Notas do recrutador
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    job = relationship("Job", back_populates="applications")
    candidate = relationship("User", foreign_keys=[candidate_id], back_populates="applications")

```

---

### File: `backend\src\domain\models\application_status_history.py`
```py
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from infrastructure.database.sql.base import Base

if TYPE_CHECKING:  # pragma: no cover
    from domain.models.application import Application
    from domain.models.user import User


class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("applications.id"), nullable=False
    )
    old_status: Mapped[str] = mapped_column(String(20), nullable=False)
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)
    changed_by_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )

    application: Mapped["Application"] = relationship("Application")
    changed_by_user: Mapped["User"] = relationship("User")

```

---

### File: `backend\src\domain\models\audit_log.py`
```py
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from infrastructure.database.sql.base import Base

if TYPE_CHECKING:  # pragma: no cover
    from domain.models.user import User
    from domain.models.company import Company


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    company_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("companies.id"), nullable=True)

    action: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )

    user: Mapped["User | None"] = relationship("User")
    company: Mapped["Company | None"] = relationship("Company")

```

---

### File: `backend\src\domain\models\candidate.py`
```py
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from infrastructure.database.sql.base import Base

if TYPE_CHECKING:  # pragma: no cover
    from domain.models.user import User


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    resume_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    resume_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # NOVOS CAMPOS MASTERPLAN (Fase 1)
    parsed_resume: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON com dados extraídos
    skills_structured: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON com lista de skills e níveis
    behavioral_profile: Mapped[str | None] = mapped_column(Text, nullable=True)  # Análise DISC/Big5 via IA

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )

    user: Mapped["User"] = relationship("User")

```

---

### File: `backend\src\domain\models\company.py`
```py
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from infrastructure.database.sql.base import Base

if TYPE_CHECKING:  # pragma: no cover
    from domain.models.user import User


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    owner_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    razao_social: Mapped[str] = mapped_column(String(200), nullable=False)
    cnpj: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    cidade: Mapped[str] = mapped_column(String(120), nullable=False)
    uf: Mapped[str] = mapped_column(String(2), nullable=False)

    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    plan_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("plans.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )

    owner: Mapped["User"] = relationship("User", foreign_keys=[owner_user_id])

```

---

### File: `backend\src\domain\models\compliance.py`
```py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base

class PulseSurvey(Base):
    __tablename__ = "pulse_surveys"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mood_score = Column(Integer, nullable=False) # 1-5 ou 1-10
    comment = Column(Text, nullable=True)
    anonymous = Column(Boolean, default=True)
    
    timestamp = Column(DateTime, default=datetime.utcnow)

```

---

### File: `backend\src\domain\models\document.py`
```py
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from infrastructure.database.sql.base import Base

if TYPE_CHECKING:  # pragma: no cover
    from domain.models.company import Company
    from domain.models.user import User


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    company_id: Mapped[int] = mapped_column(Integer, ForeignKey("companies.id"), nullable=False)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    doc_type: Mapped[str] = mapped_column(String(40), nullable=False)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    validation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    validated_by_user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    validated_by: Mapped["User | None"] = relationship("User", foreign_keys=[validated_by_user_id])
    company: Mapped["Company"] = relationship("Company")

```

---

### File: `backend\src\domain\models\finance.py`
```py
from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from ..db.database import Base

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String(200), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    type = Column(String(20), nullable=False) # income, expense
    status = Column(String(20), default="pending") # pending, paid, cancelled
    
    due_date = Column(DateTime, nullable=False)
    payment_date = Column(DateTime, nullable=True)
    
    category = Column(String(50), nullable=True)
    cost_center_id = Column(Integer, ForeignKey("cost_centers.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    cost_center = relationship("CostCenter", back_populates="transactions")
    company = relationship("User", foreign_keys=[company_id])

class CostCenter(Base):
    __tablename__ = "cost_centers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    company_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    transactions = relationship("Transaction", back_populates="cost_center")

```

---

### File: `backend\src\domain\models\job.py`
```py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base

class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=True)
    salary = Column(String(100), nullable=True)
    location = Column(String(200), nullable=False)
    type = Column(String(50), nullable=True)  # remoto, presencial, híbrido
    status = Column(String(50), default="active")  # active, inactive, closed
    
    # CAMPOS ORIGINAIS E EXTENDIDOS
    interview_link = Column(String(500), nullable=True)  # Link entrevista
    comments = Column(Text, nullable=True)  # Comentários internos
    match_score_threshold = Column(Integer, default=70)  # Score mínimo para match
    
    # NOVOS CAMPOS MASTERPLAN (Fase 1)
    requirements_structured = Column(Text, nullable=True)  # Requisitos extraídos via IA
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    location_type = Column(String(50), default="remote")  # remote, onsite, hybrid
    custom_questions = Column(Text, nullable=True)  # JSON com perguntas dinâmicas
    
    company_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("User", back_populates="jobs")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")

```

---

### File: `backend\src\domain\models\leave_request.py`
```py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base

class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    type = Column(String(50), default="vacation") # vacation, sick_leave, personal
    status = Column(String(50), default="pending") # pending, approved, rejected
    
    reason = Column(Text, nullable=True)
    manager_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])

```

---

### File: `backend\src\domain\models\onboarding.py`
```py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base

class Onboarding(Base):
    __tablename__ = "onboardings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    status = Column(String(50), default="pending") # pending, in_progress, completed
    docs_verified = Column(Boolean, default=False)
    step_ti = Column(Boolean, default=False) # Criar email, etc
    step_finance = Column(Boolean, default=False) # Conta salário, etc
    
    document_ocr_data = Column(Text, nullable=True) # JSON com dados extraídos via IA
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])

```

---

### File: `backend\src\domain\models\performance_review.py`
```py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base

class PerformanceReview(Base):
    __tablename__ = "performance_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    period = Column(String(50), nullable=False) # Ex: Q1-2026
    score = Column(Float, default=0.0)
    feedback = Column(Text, nullable=True)
    
    competencies_scores = Column(Text, nullable=True) # JSON com scores por competência
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    employee = relationship("User", foreign_keys=[employee_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])

```

---

### File: `backend\src\domain\models\plan.py`
```py
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from infrastructure.database.sql.base import Base


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    price: Mapped[str] = mapped_column(String(40), nullable=False)
    features: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )

```

---

### File: `backend\src\domain\models\project.py`
```py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="active") # active, completed, archived
    
    company_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("User", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")

```

---

### File: `backend\src\domain\models\refresh_token.py`
```py
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, text, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from infrastructure.database.sql.base import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )

```

---

### File: `backend\src\domain\models\subscription.py`
```py
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from infrastructure.database.sql.base import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    company_id: Mapped[int] = mapped_column(Integer, ForeignKey("companies.id"), nullable=False)
    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey("plans.id"), nullable=False)

    mp_preapproval_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=datetime.utcnow,
        nullable=False,
    )

    user = relationship("User")
    company = relationship("Company")
    plan = relationship("Plan")

```

---

### File: `backend\src\domain\models\task.py`
```py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="todo") # todo, in_progress, review, done
    priority = Column(String(20), default="medium") # low, medium, high, urgent
    
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Time Tracking Tracking
    estimated_hours = Column(Float, default=0.0)
    actual_hours = Column(Float, default=0.0)
    cost_per_hour = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", back_populates="tasks")
    time_entries = relationship("TimeEntry", back_populates="task", cascade="all, delete-orphan")

```

---

### File: `backend\src\domain\models\ticket.py`
```py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base

class Ticket(Base):
    __tablename__ = "tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="open") # open, in_progress, resolved, closed
    priority = Column(String(50), default="medium") # low, medium, high, critical
    
    category_id = Column(Integer, ForeignKey("ticket_categories.id"), nullable=False)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # SLA Tracking
    sla_deadline = Column(DateTime, nullable=True)
    sla_status = Column(String(20), default="on_time") # on_time, warning, breached
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    category = relationship("TicketCategory", back_populates="tickets")
    requester = relationship("User", foreign_keys=[requester_id])
    assignee = relationship("User", foreign_keys=[assignee_id])

class TicketCategory(Base):
    __tablename__ = "ticket_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False) # Ex: TI, Financeiro, RH
    department = Column(String(100), nullable=False)
    expected_sla_hours = Column(Integer, default=24)
    
    tickets = relationship("Ticket", back_populates="category")

```

---

### File: `backend\src\domain\models\time_entry.py`
```py
from sqlalchemy import Column, Integer, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.database import Base

class TimeEntry(Base):
    __tablename__ = "time_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    duration_minutes = Column(Float, default=0.0)
    description = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    task = relationship("Task", back_populates="time_entries")
    user = relationship("User", back_populates="time_entries")

```

---

### File: `backend\src\domain\models\two_factor_code.py`
```py
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, text, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column

from infrastructure.database.sql.base import Base


class TwoFactorCode(Base):
    __tablename__ = "two_factor_codes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(6), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attempts: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )

```

---

### File: `backend\src\domain\models\user.py`
```py
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import TYPE_CHECKING
from ..db.database import Base

if TYPE_CHECKING:
    from domain.models.job import Job
    from domain.models.application import Application
    from domain.models.project import Project
    from domain.models.task import Task
    from domain.models.time_entry import TimeEntry

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(180), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=False)
    role = Column(String(50), nullable=False, default="candidate") # candidate, company
    is_active = Column(Boolean, default=True)
    two_factor_enabled = Column(Boolean, default=False)
    phone = Column(String(30), nullable=True) # Added back for 2FA
    # Assinatura
    subscription_status = Column(String(50), default="inactive") # active, inactive, cancelled
    subscription_plan = Column(String(50), default="starter") # starter, pro, enterprise

    
    # Perfil (Candidato)
    bio = Column(Text, nullable=True)
    skills = Column(Text, nullable=True)
    experience = Column(Text, nullable=True)
    education = Column(Text, nullable=True)
    
    # Empresa & White-Label
    company_name = Column(String(200), nullable=True)
    brand_logo = Column(String(500), nullable=True) # URL do logo
    brand_color_primary = Column(String(20), default="#820AD1") # Cor principal
    brand_color_secondary = Column(String(20), default="#0f172a") # Fundo principal
    
    # Gamificação
    badges = Column(Text, nullable=True) # JSON com badges conquistados
    points = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    jobs = relationship("Job", back_populates="company")
    applications = relationship("Application", foreign_keys="Application.candidate_id", back_populates="candidate")
    projects = relationship("Project", back_populates="company")
    tasks = relationship("Task", back_populates="assignee")
    time_entries = relationship("TimeEntry", back_populates="user")

    @property
    def name(self):
        return self.full_name

    @name.setter
    def name(self, value):
        self.full_name = value

```

---

### File: `backend\src\domain\models\__init__.py`
```py
from domain.models.user import User
from domain.models.job import Job
from domain.models.application import Application
from domain.models.company import Company
from domain.models.subscription import Subscription
from domain.models.plan import Plan
from domain.models.two_factor_code import TwoFactorCode
from domain.models.refresh_token import RefreshToken
from domain.models.audit_log import AuditLog
from domain.models.document import Document
from domain.models.application_status_history import ApplicationStatusHistory
from domain.models.candidate import Candidate
from domain.models.project import Project
from domain.models.task import Task
from domain.models.compliance import PulseSurvey

```

---

### File: `backend\src\domain\schemas\application.py`
```py
from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ApplicationBase(BaseModel):
    job_id: int


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    status: str


class ApplicationOut(ApplicationBase):
    id: int
    company_id: int
    candidate_user_id: int
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

```

---

### File: `backend\src\domain\schemas\auth.py`
```py
from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    # Mantém compatibilidade (antigo só tinha email/password/company_name)
    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6)
    phone: str | None = Field(default=None, max_length=30)

    # Nome simples (compat)
    company_name: str | None = Field(default=None, max_length=200)

    # Campos reais da tabela companies (todos opcionais: se não vier, vira placeholder)
    razao_social: str | None = Field(default=None, max_length=200)
    cnpj: str | None = Field(default=None, max_length=20)
    cidade: str | None = Field(default=None, max_length=120)
    uf: str | None = Field(default=None, min_length=2, max_length=2)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str = ""
    token_type: str = "bearer"
    two_factor_required: bool | None = None
    temporary_token: str | None = None  # Token temporário para 2FA



class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str # Mapped via @property in model
    email: EmailStr
    role: str
    company_name: str | None = None
    created_at: datetime | None = None
    phone: str | None = None
    two_factor_enabled: bool | None = None

```

---

### File: `backend\src\domain\schemas\company.py`
```py
﻿# TODO: implement


```

---

### File: `backend\src\domain\schemas\finance.py`
```py
from pydantic import BaseModel, Field
from decimal import Decimal
from datetime import date

class TransactionCreate(BaseModel):
    description: str = Field(..., max_length=200)
    amount: Decimal = Field(..., max_digits=10, decimal_places=2)
    type: str = Field(..., max_length=20) # income, expense
    due_date: date

```

---

### File: `backend\src\domain\schemas\job.py`
```py
from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict

class JobBase(BaseModel):
    title: str
    description: str
    location: str | None = None
    status: str = "open"

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    status: str | None = None


class JobOut(JobBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime | None = None # Added back updated_at just in case

    model_config = ConfigDict(from_attributes=True)

```

---

### File: `backend\src\domain\schemas\user.py`
```py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict, Field

# Schemas de Entrada (Request)
class UserCreate(BaseModel):
    full_name: str = Field(..., max_length=200)
    email: EmailStr
    password: str = Field(..., min_length=8)
    company_name: Optional[str] = Field(None, max_length=200)

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=200)
    bio: Optional[str] = None
    skills: Optional[str] = None
    experience: Optional[str] = None
    education: Optional[str] = None
    company_name: Optional[str] = Field(None, max_length=200)
    brand_logo: Optional[str] = Field(None, max_length=500)
    brand_color_primary: Optional[str] = Field(None, max_length=20)
    brand_color_secondary: Optional[str] = Field(None, max_length=20)

# Schemas de Saída (Response) - PROTEGIDO
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    role: str
    is_active: bool
    company_name: Optional[str] = None
    brand_logo: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    bio: Optional[str] = None
    skills: Optional[str] = None
    experience: Optional[str] = None
    education: Optional[str] = None
    badges: Optional[str] = None
    points: Optional[int] = 0

```

---

### File: `backend\src\domain\schemas\__init__.py`
```py

```

---

### File: `backend\src\infrastructure\ai_clients\gemini_pro.py`
```py
import google.generativeai as genai
from typing import List, Dict
import os
import json
import re

class GeminiService:
    def __init__(self):
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel('gemini-1.5-flash')
    
    async def analyze_resume(self, resume_text: str, job_description: str) -> Dict:
        """
        Analisar currículo vs vaga usando Gemini
        """
        prompt = f"""
        Analise o currículo abaixo em relação à descrição da vaga.
        
        VAGA:
        {job_description}
        
        CURRÍCULO:
        {resume_text}
        
        Forneça:
        1. Score de compatibilidade (0-100)
        2. Principais pontos fortes
        3. Lacunas identificadas
        4. Recomendação (Entrevistar/Revisar/Rejeitar)
        
        Responda em formato JSON.
        """
        
        response = self.model.generate_content(prompt)
        return self._parse_json_response(response.text)
    
    async def chat_recruiter(self, message: str, context: str = "") -> str:
        """
        Chat com IA para recrutamento
        """
        prompt = f"""
        Você é um assistente de RH especializado em recrutamento.
        
        Contexto: {context}
        
        Pergunta: {message}
        
        Responda de forma profissional e concisa.
        """
        
        response = self.model.generate_content(prompt)
        return response.text
    
    async def financial_insights(self, transactions: List[Dict]) -> Dict:
        """
        Gerar insights financeiros
        """
        prompt = f"""
        Analise as transações financeiras abaixo e forneça:
        1. Padrões identificados
        2. Anomalias detectadas
        3. Recomendações de economia
        4. Previsão de fluxo de caixa (próximo mês)
        
        Transações:
        {transactions}
        
        Responda em JSON.
        """
        
        response = self.model.generate_content(prompt)
        return self._parse_json_response(response.text)
    
    async def project_insights(self, tasks: List[Dict]) -> Dict:
        """
        Insights sobre progresso de projetos
        """
        prompt = f"""
        Analise as tarefas do projeto:
        {tasks}
        
        Forneça:
        1. Taxa de conclusão prevista
        2. Gargalos identificados
        3. Membros sobrecarregados
        4. Sugestões de otimização
        
        JSON format.
        """
        
        response = self.model.generate_content(prompt)
        return self._parse_json_response(response.text)
    
    async def admin_audit(self, db_stats: Dict) -> Dict:
        """
        Auditoria do sistema pelo Admin IA
        """
        prompt = f"""
        Você é a IA Administradora do Sistema Innovation.ia.
        Analise o estado atual do sistema:
        
        Métricas:
        {json.dumps(db_stats, indent=2)}
        
        Forneça um relatório executivo com:
        1. Estado de saúde do sistema (Crítico/Alerta/Saudável)
        2. Análise das métricas de recrutamento
        3. Possíveis gargalos
        4. Ações recomendadas para o administrador humano
        
        Responda em JSON estrito.
        """
        
        response = self.model.generate_content(prompt)
        return self._parse_json_response(response.text)

    def _parse_json_response(self, text: str) -> Dict:
        """Parse JSON from Gemini response"""
        
        # Remover markdown code blocks
        text = re.sub(r'```json\n|\n```|```', '', text)
        
        try:
            return json.loads(text)
        except:
            return {"raw": text}

```

---

### File: `backend\src\infrastructure\ai_clients\__init__.py`
```py

```

---

### File: `backend\src\infrastructure\cache\redis_client.py`
```py
import redis.asyncio as redis
from core.config import settings
import json
from typing import Any, Optional

class RedisClient:
    def __init__(self):
        # Em produção, usar REDIS_URL do .env
        self.redis_url = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
        self._redis: Optional[redis.Redis] = None

    async def connect(self):
        if not self._redis:
            self._redis = await redis.from_url(self.redis_url, encoding="utf-8", decode_responses=True)
        return self._redis

    async def get(self, key: str) -> Any:
        client = await self.connect()
        data = await client.get(key)
        if data:
            try:
                return json.loads(data)
            except json.JSONDecodeError:
                return data
        return None

    async def set(self, key: str, value: Any, expire: int = 3600):
        client = await self.connect()
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        await client.set(key, value, ex=expire)

    async def delete(self, key: str):
        client = await self.connect()
        await client.delete(key)

redis_client = RedisClient()

```

---

### File: `backend\src\infrastructure\cache\session_manager.py`
```py
from .redis_client import redis_client
from typing import Any, Optional

class CacheManager:
    @staticmethod
    async def get_candidate_data(candidate_id: int) -> Optional[Any]:
        return await redis_client.get(f"candidate:{candidate_id}")

    @staticmethod
    async def set_candidate_data(candidate_id: int, data: Any, expire: int = 1800):
        await redis_client.set(f"candidate:{candidate_id}", data, expire=expire)

    @staticmethod
    async def get_ai_analysis(candidate_id: int, job_id: int) -> Optional[Any]:
        return await redis_client.get(f"analysis:{candidate_id}:{job_id}")

    @staticmethod
    async def set_ai_analysis(candidate_id: int, job_id: int, analysis: Any):
        await redis_client.set(f"analysis:{candidate_id}:{job_id}", analysis, expire=7200) # 2h cache

cache_manager = CacheManager()

```

---

### File: `backend\src\infrastructure\cache\__init__.py`
```py

```

---

### File: `backend\src\infrastructure\database\nosql\__init__.py`
```py

```

---

### File: `backend\src\infrastructure\database\sql\base.py`
```py
﻿from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

```

---

### File: `backend\src\infrastructure\database\sql\database.py`
```py
from .session import engine, SessionLocal
from .base import Base

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

```

---

### File: `backend\src\infrastructure\database\sql\dependencies.py`
```py
from typing import Generator
from sqlalchemy.orm import Session

from infrastructure.database.sql.session import SessionLocal


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

```

---

### File: `backend\src\infrastructure\database\sql\init_db.py`
```py
from infrastructure.database.sql.base import Base
from infrastructure.database.sql.session import engine
# Import all models to ensure they are registered with Base
from domain.models.user import User
from domain.models.company import Company
from domain.models.job import Job
from domain.models.application import Application
from domain.models.plan import Plan
from domain.models.subscription import Subscription
from domain.models.audit_log import AuditLog
from domain.models.document import Document
from domain.models.application_status_history import ApplicationStatusHistory

def init_db():
    print("Initializing database...")
    Base.metadata.create_all(bind=engine)
    print("Database initialized.")

if __name__ == "__main__":
    init_db()

```

---

### File: `backend\src\infrastructure\database\sql\seed.py`
```py
from sqlalchemy.orm import Session
from .database import SessionLocal
from ..models.user import User
from ..models.job import Job
from ..models.application import Application
from ..core.security import get_password_hash
from datetime import datetime, timedelta
import random

def create_seed_data():
    """Criar dados de exemplo para desenvolvimento"""
    db = SessionLocal()
    
    try:
        # Limpar dados existentes (cuidado em produção!)
        db.query(Application).delete()
        db.query(Job).delete()
        db.query(User).filter(User.email.like('%@test.com')).delete()
        db.commit()
        
        print("Dados antigos removidos")
        
        # CRIAR EMPRESAS
        companies = []
        company_names = [
            "TechCorp Brasil",
            "Startup Inovadora",
            "Consultoria Digital",
            "Fintech Solutions"
        ]
        
        for idx, name in enumerate(company_names):
            company = User(
                email=f"empresa{idx+1}@test.com",
                hashed_password=get_password_hash("senha123"),
                full_name=name,
                role="company",
                is_active=True,
                two_factor_enabled=False
            )
            db.add(company)
            companies.append(company)
        
        db.commit()
        print(f"OK: {len(companies)} empresas criadas")
        
        # CRIAR VAGAS
        jobs = []
        job_templates = [
            {
                "title": "Desenvolvedor Python Sênior",
                "description": "Buscamos desenvolvedor Python experiente para atuar com FastAPI, Django e SQLAlchemy. Trabalho remoto.",
                "requirements": "5+ anos Python, FastAPI, PostgreSQL, Git, inglês intermediário",
                "salary": "R$ 12.000 - R$ 18.000",
                "location": "Remoto",
                "type": "remoto"
            },
            {
                "title": "Designer UX/UI Pleno",
                "description": "Designer para criar interfaces modernas e intuitivas. Figma e experiência com design systems.",
                "requirements": "3+ anos UX/UI, Figma, design thinking, portfolio",
                "salary": "R$ 7.000 - R$ 10.000",
                "location": "São Paulo, SP",
                "type": "híbrido"
            },
            {
                "title": "Engenheiro de Dados",
                "description": "Construir e manter pipelines de dados, data warehouse e ETL processes.",
                "requirements": "Python, SQL, Airflow, Spark, AWS/GCP",
                "salary": "R$ 15.000 - R$ 22.000",
                "location": "Remoto",
                "type": "remoto"
            },
            {
                "title": "Product Manager",
                "description": "Liderar desenvolvimento de produtos digitais, roadmap e métricas.",
                "requirements": "5+ anos produto digital, analytics, stakeholder management",
                "salary": "R$ 18.000 - R$ 25.000",
                "location": "São Paulo, SP",
                "type": "presencial"
            },
            {
                "title": "Desenvolvedor React Native",
                "description": "Criar apps mobile incríveis com React Native.",
                "requirements": "React Native, TypeScript, Redux, APIs REST",
                "salary": "R$ 8.000 - R$ 12.000",
                "location": "Remoto",
                "type": "remoto"
            },
            {
                "title": "DevOps Engineer",
                "description": "Gerenciar infraestrutura cloud, CI/CD e monitoramento.",
                "requirements": "Docker, Kubernetes, AWS, Terraform, Jenkins",
                "salary": "R$ 14.000 - R$ 20.000",
                "location": "Remoto",
                "type": "remoto"
            }
        ]
        
        for template in job_templates:
            for company in companies[:3]:  # Cada empresa tem algumas vagas
                job = Job(
                    **template,
                    company_id=company.id,
                    status="active",
                    created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30))
                )
                db.add(job)
                jobs.append(job)
        
        db.commit()
        print(f"OK: {len(jobs)} vagas criadas")
        
        # CRIAR CANDIDATOS
        candidates = []
        candidate_names = [
            "João Silva",
            "Maria Santos",
            "Carlos Pereira",
            "Ana Costa",
            "Pedro Oliveira",
            "Julia Almeida",
            "Rafael Souza",
            "Beatriz Lima",
            "Lucas Ferreira",
            "Camila Rodrigues"
        ]
        
        for idx, name in enumerate(candidate_names):
            candidate = User(
                email=f"candidato{idx+1}@test.com",
                hashed_password=get_password_hash("senha123"),
                full_name=name,
                role="candidate",
                is_active=True,
                two_factor_enabled=False
            )
            db.add(candidate)
            candidates.append(candidate)
        
        db.commit()
        print(f"OK: {len(candidates)} candidatos criados")
        
        # CRIAR CANDIDATURAS
        statuses = ['pending', 'reviewing', 'interviewed', 'accepted', 'rejected']
        applications_created = 0
        
        for job in jobs:
            # Cada vaga tem entre 3 e 8 candidaturas
            num_applications = random.randint(3, 8)
            selected_candidates = random.sample(candidates, min(num_applications, len(candidates)))
            
            for candidate in selected_candidates:
                application = Application(
                    job_id=job.id,
                    candidate_id=candidate.id,
                    status=random.choice(statuses),
                    created_at=job.created_at + timedelta(days=random.randint(0, 15))
                )
                db.add(application)
                applications_created += 1
        
        db.commit()
        print(f"OK: {applications_created} candidaturas criadas")
        
        # CRIAR ADMIN (Apenas se não existir)
        existing_admin = db.query(User).filter(User.email == "admin@innovation.ia").first()
        if not existing_admin:
            admin = User(
                email="admin@innovation.ia",
                hashed_password=get_password_hash("admin123"),
                full_name="Administrador",
                role="company",
                is_active=True,
                two_factor_enabled=False
            )
            db.add(admin)
            db.commit()
            print("OK: Admin criado")
        else:
            print("OK: Admin já existe, pulando criação")
        
        print("\n" + "="*50)
        print("RESUMO DOS DADOS CRIADOS:")
        print(f"  - {len(companies)} empresas")
        print(f"  - {len(jobs)} vagas")
        print(f"  - {len(candidates)} candidatos")
        print(f"  - {applications_created} candidaturas")
        print(f"  - 1 admin")
        print("="*50)
        print("\nCREDENCIAIS:")
        print("  Admin: admin@innovation.ia / admin123")
        print("  Empresa: empresa1@test.com / senha123")
        print("  Candidato: candidato1@test.com / senha123")
        print("="*50)
        
    except Exception as e:
        print(f"Erro: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_seed_data()

```

---

### File: `backend\src\infrastructure\database\sql\seeds.py`
```py
from sqlalchemy.orm import Session
from infrastructure.database.sql.database import SessionLocal, engine
from domain.models.user import User
from core.security import get_password_hash
from api.v1.endpoints.payments import router # Just to ensure models are loaded
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_users():
    db = SessionLocal()
    try:
        users_to_create = [
            {
                "email": "admin@innovation.ia",
                "full_name": "Admin System",
                "password": "admin_innovation_secure",
                "role": "admin",
                "company_name": "Innovation.ia HQ",
                "plan": "enterprise", # Assuming plan logic exists or will assume enterprise behavior
                "points": 9999
            },
            {
                "email": "test@innovation.ia",
                "full_name": "User Test (Basic)",
                "password": "user_test_basic",
                "role": "company",
                "company_name": "Test Company Ltd",
                "plan": "starter",
                "points": 100
            },
            {
                "email": "pro@innovation.ia",
                "full_name": "User Pro (Advanced)",
                "password": "user_pro_secure",
                "role": "company",
                "company_name": "Pro Corp Global",
                "plan": "pro",
                "points": 500
            }
        ]

        for user_data in users_to_create:
            user = db.query(User).filter(User.email == user_data["email"]).first()
            if not user:
                logger.info(f"Creating user: {user_data['email']}")
                new_user = User(
                    email=user_data["email"],
                    full_name=user_data["full_name"],
                    hashed_password=get_password_hash(user_data["password"]),
                    role=user_data["role"],
                    company_name=user_data["company_name"],
                    is_active=True,
                    points=user_data["points"]
                    # field 'subscription_status' might need to be added to User model if not presents, 
                    # but based in payments.py it seems to expect it. 
                    # For now using existing fields.
                )
                # Monkey patching subscription status if model doesn't support it directly in constructor or if it's dynamic
                # Assuming simple string field or relationship based on previous analysis
                # new_user.subscription_status = "active" 
                
                db.add(new_user)
            else:
                logger.info(f"User already exists: {user_data['email']}")
        
        db.commit()
        logger.info("Seeding completed successfully!")

    except Exception as e:
        logger.error(f"Error seeding users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()

```

---

### File: `backend\src\infrastructure\database\sql\session.py`
```py
from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.config import DATABASE_URL

# Fix for Render (postgres:// -> postgresql://)
if str(DATABASE_URL).startswith("postgres://"):
    DATABASE_URL = str(DATABASE_URL).replace("postgres://", "postgresql://", 1)

_connect_args = {}
if str(DATABASE_URL).startswith("sqlite"):
    _connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    connect_args=_connect_args,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)

```

---

### File: `backend\src\infrastructure\database\sql\__init__.py`
```py

```

---

### File: `backend\src\infrastructure\payments\__init__.py`
```py

```

---

### File: `backend\src\modules\ats\__init__.py`
```py

```

---

### File: `backend\src\modules\finance\__init__.py`
```py

```

---

### File: `backend\src\modules\hcm\__init__.py`
```py

```

---

### File: `backend\src\modules\support\__init__.py`
```py

```

---

### File: `backend\src\services\ai_ats.py`
```py
import os
import json
import google.generativeai as genai
from typing import Dict, Any, List

class AIATSService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-pro')
        else:
            self.model = None

    async def parse_resume(self, resume_text: str) -> Dict[str, Any]:
        """Extrai dados estruturados de um currículo em texto."""
        if not self.model:
            return {"error": "IA não configurada"}

        prompt = f"""
        Analise o currículo abaixo e extraia as informações em formato JSON.
        Campos: nome, email, telefone, resumo_profissional, experiencias (lista de empresa, cargo, periodo, descricao), 
        educacao (lista de instituicao, curso, nivel), habilidades (lista de strings).

        Currículo:
        {resume_text}
        """

        try:
            response = self.model.generate_content(prompt)
            # Tenta extrair o JSON da resposta
            text = response.text
            start = text.find('{')
            end = text.rfind('}') + 1
            if start != -1 and end != -1:
                return json.loads(text[start:end])
            return {"raw_response": text}
        except Exception as e:
            return {"error": str(e)}

    async def rank_candidate(self, resume_data: Dict[str, Any], job_description: str) -> Dict[str, Any]:
        """Gera um score de 0-100 para o candidato em relação à vaga."""
        if not self.model:
            return {"error": "IA não configurada"}

        prompt = f"""
        Como recrutador especialista, avalie o currículo do candidato para a vaga descrita.
        Dê uma nota de 0 a 100 de compatibilidade (match_score).
        Justifique a nota com pontos fortes (pros) e pontos fracos (cons).
        Retorne em formato JSON.

        Vaga: {job_description}
        Candidato: {json.dumps(resume_data)}
        """

        try:
            response = self.model.generate_content(prompt)
            text = response.text
            start = text.find('{')
            end = text.rfind('}') + 1
            if start != -1 and end != -1:
                return json.loads(text[start:end])
            return {"match_score": 0, "justification": text}
        except Exception as e:
            return {"error": str(e)}

    async def generate_technical_test(self, job_title: str, requirements: str) -> List[Dict[str, Any]]:
        """Gera um teste técnico personalizado para a vaga."""
        if not self.model:
            return []

        prompt = f"""
        Crie um teste técnico com 5 questões de múltipla escolha para a vaga de {job_title}.
        Requisitos da vaga: {requirements}
        Retorne uma lista JSON de objetos com: question, options (lista), correct_option (index).
        """

        try:
            response = self.model.generate_content(prompt)
            text = response.text
            start = text.find('[')
            end = text.rfind(']') + 1
            if start != -1 and end != -1:
                return json.loads(text[start:end])
            return []
        except Exception as e:
            print(f"Erro ao gerar teste: {e}")
            return []

    async def analyze_behavior(self, text: str) -> Dict[str, Any]:
        """IA analisa perfil comporteamental DISC / Big5."""
        if not self.model: return {}
        prompt = f"Analise o texto/cv abaixo e sugira o perfil DISC (Dominância, Influência, Estabilidade, Conformidade) e Big5 do candidato. Retorne JSON: {text}"
        try:
            response = self.model.generate_content(prompt)
            # Extrating JSON ...
            return {"disc": "Estabilizador", "big5": {"openness": 0.8}, "summary": response.text[:200]}
        except: return {}

    async def generate_contract(self, candidate_name: str, job_title: str, salary: str) -> str:
        """IA gera rascunho de contrato de trabalho."""
        if not self.model: return ""
        prompt = f"Gere um rascunho de contrato de trabalho simplificado para {candidate_name} no cargo de {job_title} com salário de {salary}. Use um tom formal Jurídico brasileiro."
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except: return "Erro ao gerar contrato"

ai_ats_service = AIATSService()

```

---

### File: `backend\src\services\audit_service.py`
```py
from __future__ import annotations

from sqlalchemy.orm import Session

from domain.models.audit_log import AuditLog


def log_event(
    db: Session,
    action: str,
    *,
    user_id: int | None = None,
    company_id: int | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    details: str | None = None,
) -> None:
    entry = AuditLog(
        action=action,
        user_id=user_id,
        company_id=company_id,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
    )
    db.add(entry)
    db.commit()

```

---

### File: `backend\src\services\auth_service.py`
```py
from __future__ import annotations

import logging
from sqlalchemy.orm import Session

from core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password
)
from domain.models.company import Company
from domain.models.user import User

logger = logging.getLogger(__name__)


def _temp_cnpj_from_user_id(user_id: int) -> str:
    # 4 + 14 = 18 (<= 20). Único por user_id. Serve como placeholder até o usuário informar o CNPJ real.
    return f"TEMP{user_id:014d}"


def register_user(
    db: Session,
    email: str,
    password: str,
    *,
    name: str | None = None,
    phone: str | None = None,
    company_name: str | None = None,
    razao_social: str | None = None,
    cnpj: str | None = None,
    cidade: str | None = None,
    uf: str | None = None,
) -> User:
    if db.query(User).filter(User.email == email).first():
        raise ValueError("Email já existe")

    user = User(
        full_name=(name or email.split("@")[0] or "Usuário").strip(),
        email=email,
        hashed_password=get_password_hash(password),
        role="company",
        phone=phone,
        company_name=company_name
    )
    db.add(user)
    db.flush()  # garante user.id

    # Define dados da empresa (placeholder se não vierem)
    rs = (razao_social or company_name or "Minha Empresa").strip()
    city = (cidade or "São Paulo").strip()
    state = (uf or "SP").strip().upper()
    
    # Valida UF (Estados brasileiros)
    valid_states = {
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
        'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
        'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    }
    if state not in valid_states:
        logger.warning(f"UF inválido '{state}', usando 'SP' como padrão")
        state = "SP"

    if cnpj:
        cnpj_value = cnpj.strip()
        # Checa unicidade (constraint no banco)
        exists = db.query(Company).filter(Company.cnpj == cnpj_value).first()
        if exists:
            raise ValueError("CNPJ já cadastrado")
    else:
        cnpj_value = _temp_cnpj_from_user_id(user.id)

    company = Company(
        owner_user_id=user.id,
        razao_social=rs,
        cnpj=cnpj_value,
        cidade=city,
        uf=state,
        logo_url=None,
    )
    db.add(company)
    db.flush()

    # user.active_company_id = company.id # REMOVED (Legacy)
    db.commit()
    db.refresh(user)
    logger.info(f"Usuário registrado: {user.email} (ID: {user.id})")
    return user


def authenticate_user(db: Session, email: str, password: str | None, *, skip_password: bool = False):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        logger.warning(f"Tentativa de login com email inexistente: {email}")
        return None
    if not skip_password and (password is None or not verify_password(password, user.hashed_password)):
        logger.warning(f"Tentativa de login com senha incorreta: {email}")
        return None

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token(user.id)

    logger.info(f"Autenticação bem-sucedida: {email} (ID: {user.id})")
    return access_token, refresh_token, user

```

---

### File: `backend\src\services\claude_service.py`
```py
from anthropic import Anthropic
import os
from typing import List, Dict
import json
import re

class ClaudeService:
    def __init__(self):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    async def support_chat(self, message: str, history: List[Dict] = None) -> str:
        """
        Chat de suporte com Claude
        """
        messages = history or []
        messages.append({
            "role": "user",
            "content": message
        })
        
        response = self.client.messages.create(
            model="claude-3-sonnet-20240229", # Using a known valid model name
            max_tokens=1024,
            system="Você é um assistente de suporte técnico da Innovation.ia. Ajude os usuários com dúvidas sobre a plataforma.",
            messages=messages
        )
        
        return response.content[0].text
    
    async def code_review(self, code: str, language: str = "python") -> Dict:
        """
        Revisar código automaticamente
        """
        prompt = f"""
        Revise o código {language} abaixo:
        
        ```{language}
        {code}
        ```
        
        Forneça:
        1. Problemas de segurança
        2. Bugs potenciais
        3. Melhorias de performance
        4. Sugestões de refatoração
        
        Responda em JSON.
        """
        
        response = self.client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return self._parse_json(response.content[0].text)
    
    async def generate_report(self, data: Dict, report_type: str) -> str:
        """
        Gerar relatórios com Claude
        """
        prompt = f"""
        Gere um relatório {report_type} baseado nos dados:
        
        {data}
        
        Formato: Markdown profissional com gráficos em formato mermaid.
        """
        
        response = self.client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return response.content[0].text
    
    async def analyze_document(self, document_text: str) -> Dict:
        """
        Analisar documentos (contratos, políticas, etc)
        """
        prompt = f"""
        Analise o documento abaixo e extraia:
        1. Informações principais
        2. Datas importantes
        3. Valores financeiros
        4. Pessoas/empresas mencionadas
        5. Ações requeridas
        
        Documento:
        {document_text}
        
        JSON format.
        """
        
        response = self.client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return self._parse_json(response.content[0].text)
    
    def _parse_json(self, text: str) -> Dict:
        text = re.sub(r'```json\n|\n```|```', '', text)
        try:
            return json.loads(text)
        except:
            return {"raw": text}

```

---

### File: `backend\src\services\finance_service.py`
```py
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from ..models.finance import Transaction, CostCenter
import google.generativeai as genai
import os

class FinanceService:
    @staticmethod
    def get_cash_flow_summary(db: Session, company_id: int):
        transactions = db.query(Transaction).filter(Transaction.company_id == company_id).all()
        income = sum(t.amount for t in transactions if t.type == "income" and t.status == "paid")
        expenses = sum(t.amount for t in transactions if t.type == "expense" and t.status == "paid")
        pending_income = sum(t.amount for t in transactions if t.type == "income" and t.status == "pending")
        pending_expenses = sum(t.amount for t in transactions if t.type == "expense" and t.status == "pending")
        
        return {
            "balance": income - expenses,
            "total_income": income,
            "total_expenses": expenses,
            "pending_income": pending_income,
            "pending_expenses": pending_expenses
        }

    @staticmethod
    def ai_cash_flow_prediction(db: Session, company_id: int):
        # Coleta dados históricos simplificados
        summary = FinanceService.get_cash_flow_summary(db, company_id)
        
        # Chama a IA para prever o próximo mês (Simulação lite)
        # Em produção, passaríamos o histórico detalhado para o Gemini
        prediction = f"Baseado no saldo de R$ {summary['balance']}, prevemos uma estabilidade de 15% de crescimento no próximo mês se as despesas pendentes (R$ {summary['pending_expenses']}) forem quitadas no prazo."
        
        return {
            "prediction": prediction,
            "recommended_action": "Manter reserva de contingência para as despesas de R$ " + str(summary['pending_expenses'])
        }

    @staticmethod
    def detect_anomalies(db: Session, company_id: int):
        """IA detecta picos de gastos anômalos."""
        # Comparação básica por categoria
        prediction_data = FinanceService.ai_cash_flow_prediction(db, company_id)
        # Mock logic
        return [{
            "description": "Aumento de 40% na conta de luz",
            "impact": "Alto",
            "suggestion": "Verificar se houve erro na medição ou novo equipamento ligado 24h."
        }]

finance_service = FinanceService()

```

---

### File: `backend\src\services\notification_service.py`
```py
from dataclasses import dataclass
import logging
from twilio.rest import Client as TwilioClient
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from core.config import settings

logger = logging.getLogger(__name__)

@dataclass(frozen=True)
class NotificationPayload:
    recipient_email: str | None
    recipient_phone: str | None
    subject: str
    message: str


def send_email(payload: NotificationPayload) -> bool:
    if not payload.recipient_email or not settings.SENDGRID_API_KEY:
        return False
    
    try:
        message = Mail(
            from_email=settings.EMAIL_FROM,
            to_emails=payload.recipient_email,
            subject=payload.subject,
            plain_text_content=payload.message
        )
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        sg.send(message)
        return True
    except Exception as e:
        logger.error(f"Erro ao enviar e-mail via SendGrid: {e}")
        return False


def send_sms(payload: NotificationPayload) -> bool:
    if not payload.recipient_phone or not settings.TWILIO_ACCOUNT_SID:
        return False
    
    try:
        client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(
            body=payload.message,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=payload.recipient_phone
        )
        return True
    except Exception as e:
        logger.error(f"Erro ao enviar SMS via Twilio: {e}")
        return False


def notify_application_status_change(
    *,
    recipient_email: str | None,
    recipient_phone: str | None,
    application_id: int,
    old_status: str,
    new_status: str,
) -> None:
    payload = NotificationPayload(
        recipient_email=recipient_email,
        recipient_phone=recipient_phone,
        subject="Atualização da sua candidatura",
        message=(
            "O status da sua candidatura foi atualizado. "
            f"ID da candidatura: {application_id}. "
            f"Status anterior: {old_status}. Novo status: {new_status}."
        ),
    )
    send_email(payload)
    send_sms(payload)

```

---

### File: `backend\src\services\plan_service.py`
```py
from __future__ import annotations

from sqlalchemy.orm import Session

from core.plans import PlanFeature
from domain.models.company import Company
from domain.models.plan import Plan
from domain.models.subscription import Subscription


def _normalize_features(features: str | None) -> set[str]:
    if not features:
        return set()
    raw_items = [item.strip().lower() for item in features.split(",")]
    return {item for item in raw_items if item}


def get_company_plan(db: Session, company_id: int) -> Plan | None:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company or not company.plan_id:
        return None
    return db.query(Plan).filter(Plan.id == company.plan_id).first()


def get_subscription_plan(db: Session, subscription: Subscription | None) -> Plan | None:
    if not subscription:
        return None
    return db.query(Plan).filter(Plan.id == subscription.plan_id).first()


def has_plan_feature(plan: Plan | None, feature: PlanFeature) -> bool:
    if not plan:
        return False
    features = _normalize_features(plan.features)
    return feature.value in features


def has_any_services_feature(plan: Plan | None) -> bool:
    if not plan:
        return False
    features = _normalize_features(plan.features)
    return bool({PlanFeature.SERVICES_VALIDATION.value, PlanFeature.SERVICES_FULL.value} & features)

```

---

### File: `backend\src\services\project_service.py`
```py
from sqlalchemy.orm import Session
from datetime import datetime
from ..models.project import Project
from ..models.task import Task
from ..models.time_entry import TimeEntry
from typing import Optional, List

class ProjectService:
    @staticmethod
    def start_time_tracking(db: Session, task_id: int, user_id: int):
        # Para qualquer rastreamento ativo para este usuário
        active_entries = db.query(TimeEntry).filter(
            TimeEntry.user_id == user_id,
            TimeEntry.end_time == None
        ).all()
        for entry in active_entries:
            ProjectService.stop_time_tracking(db, entry.id)

        new_entry = TimeEntry(
            task_id=task_id,
            user_id=user_id,
            start_time=datetime.utcnow()
        )
        db.add(new_entry)
        
        # Atualiza status da tarefa para in_progress
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = "in_progress"
            
        db.commit()
        db.refresh(new_entry)
        return new_entry

    @staticmethod
    def stop_time_tracking(db: Session, entry_id: int):
        entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
        if not entry:
            return None
            
        entry.end_time = datetime.utcnow()
        duration = (entry.end_time - entry.start_time).total_seconds() / 60
        entry.duration_minutes = duration
        
        # Atualiza a tarefa com as horas reais
        task = entry.task
        task.actual_hours += (duration / 60)
        
        # Calcula custo total se houver custo por hora
        if task.cost_per_hour:
            task.total_cost = task.actual_hours * task.cost_per_hour
            
        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def calculate_project_costs(db: Session, project_id: int):
        tasks = db.query(Task).filter(Task.project_id == project_id).all()
        total_cost = sum(task.total_cost for task in tasks)
        total_hours = sum(task.actual_hours for task in tasks)
        return {
            "total_cost": total_cost,
            "total_hours": total_hours,
            "task_count": len(tasks)
        }

project_service = ProjectService()

```

---

### File: `backend\src\services\rh_service.py`
```py
from sqlalchemy.orm import Session
from datetime import datetime
from ..models.onboarding import Onboarding
from ..models.leave_request import LeaveRequest
from ..models.performance_review import PerformanceReview
from ..models.compliance import PulseSurvey
from .ai_ats import ai_ats_service
import json

class RHService:
    @staticmethod
    async def generate_contract_draft(db: Session, employee_id: int):
        from ..models.user import User
        user = db.query(User).filter(User.id == employee_id).first()
        if not user: return "Usuário não encontrado"
        
        contract = await ai_ats_service.generate_contract(user.full_name, "Colaborador", "R$ 5.000,00")
        return contract

    @staticmethod
    def register_pulse(db: Session, user_id: int, score: int, comment: str = None):
        pulse = PulseSurvey(user_id=user_id, mood_score=score, comment=comment)
        db.add(pulse)
        db.commit()
        db.refresh(pulse)
        return pulse
    @staticmethod
    def process_document_ocr(db: Session, onboarding_id: int, file_content: str):
        # Aqui integraríamos com o Gemini Vision para extrair dados
        # Por enquanto, simulamos uma extração bem-sucedida
        mock_data = {
            "full_name": "João Silva",
            "document_number": "123.456.789-00",
            "birth_date": "1990-05-15",
            "address": "Rua das Flores, 123"
        }
        
        onboarding = db.query(Onboarding).filter(Onboarding.id == onboarding_id).first()
        if onboarding:
            onboarding.document_ocr_data = json.dumps(mock_data)
            onboarding.docs_verified = True
            onboarding.status = "in_progress"
            db.commit()
            db.refresh(onboarding)
        return mock_data

    @staticmethod
    def approve_leave_request(db: Session, request_id: int, manager_notes: str):
        request = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
        if request:
            request.status = "approved"
            request.manager_notes = manager_notes
            db.commit()
            db.refresh(request)
        return request

    @staticmethod
    def add_performance_review(db: Session, employee_id: int, reviewer_id: int, score: float, feedback: str):
        review = PerformanceReview(
            employee_id=employee_id,
            reviewer_id=reviewer_id,
            score=score,
            feedback=feedback,
            period="Q1-2026" # Dinâmico
        )
        db.add(review)
        db.commit()
        db.refresh(review)
        return review

rh_service = RHService()

```

---

### File: `backend\src\services\support_service.py`
```py
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from ..models.ticket import Ticket, TicketCategory
import json

class SupportService:
    @staticmethod
    def create_ticket(db: Session, title: str, description: str, requester_id: int):
        # IA Classifica a Categoria (Simulação)
        # Em produção, chamaríamos o Gemini aqui
        category = db.query(TicketCategory).first() # TI por padrão
        
        sla_hours = category.expected_sla_hours if category else 24
        deadline = datetime.utcnow() + timedelta(hours=sla_hours)
        
        ticket = Ticket(
            title=title,
            description=description,
            requester_id=requester_id,
            category_id=category.id if category else 1,
            sla_deadline=deadline
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
        return ticket

    @staticmethod
    def get_ai_smart_reply(ticket_id: int, description: str):
        # Simula resposta sugerida pela IA
        if "senha" in description.lower():
            return "Sugestão IA: Para resetar sua senha, acesse as configurações de segurança no seu perfil ou use o botão 'Esqueci minha senha' na tela de login."
        return "Sugestão IA: Analisando seu ticket. Um atendente N1 entrará em contato em breve."

    @staticmethod
    def update_sla_status(db: Session):
        now = datetime.utcnow()
        tickets = db.query(Ticket).filter(Ticket.status != "resolved").all()
        for t in tickets:
            if t.sla_deadline and now > t.sla_deadline:
                t.sla_status = "breached"
            elif t.sla_deadline and now > (t.sla_deadline - timedelta(hours=2)):
                t.sla_status = "warning"
        db.commit()

support_service = SupportService()

```

---

### File: `backend\src\services\two_factor_service.py`
```py
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from domain.models.two_factor_code import TwoFactorCode
from services.notification_service import NotificationPayload, send_email, send_sms

logger = logging.getLogger(__name__)

_CODE_TTL_SECONDS = 300  # 5 minutos
_MAX_ATTEMPTS = 3  # Máximo de tentativas incorretas


def request_code(db: Session, user_id: int, email: str | None, phone: str | None) -> str:
    """
    Gera e armazena código 2FA no banco de dados usando geração segura.
    Remove códigos anteriores do usuário para evitar confusão.
    """
    # Remove códigos anteriores do usuário
    db.query(TwoFactorCode).filter(TwoFactorCode.user_id == user_id).delete()
    
    # Gera código criptograficamente seguro (6 dígitos)
    code = f"{secrets.randbelow(1000000):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=_CODE_TTL_SECONDS)
    
    # Armazena no banco de dados
    two_factor_code = TwoFactorCode(
        user_id=user_id,
        code=code,
        expires_at=expires_at,
        attempts=0
    )
    db.add(two_factor_code)
    db.commit()
    
    logger.info(f"Código 2FA gerado para user_id={user_id}")

    # Envia código via SMS/Email
    payload = NotificationPayload(
        recipient_email=email,
        recipient_phone=phone,
        subject="Seu código de acesso Innovation.ia",
        message=f"Seu código de verificação é: {code}. Expira em 5 minutos."
    )

    # Tenta SMS primeiro, fallback para e-mail se falhar ou se não houver telefone
    sms_success = send_sms(payload)
    if not sms_success:
        send_email(payload)
        logger.info(f"Código 2FA enviado por email para user_id={user_id}")
    else:
        logger.info(f"Código 2FA enviado por SMS para user_id={user_id}")

    return code


def verify_code(db: Session, user_id: int, code: str) -> bool:
    """
    Verifica código 2FA com proteção contra brute-force.
    Após 3 tentativas incorretas, o código é invalidado.
    """
    two_factor_code = (
        db.query(TwoFactorCode)
        .filter(TwoFactorCode.user_id == user_id)
        .first()
    )
    
    if not two_factor_code:
        logger.warning(f"Tentativa de verificação sem código para user_id={user_id}")
        return False
    
    # Verifica se expirou
    if datetime.now(timezone.utc) > two_factor_code.expires_at:
        db.delete(two_factor_code)
        db.commit()
        logger.warning(f"Código 2FA expirado para user_id={user_id}")
        return False
    
    # Verifica limite de tentativas (proteção brute-force)
    if two_factor_code.attempts >= _MAX_ATTEMPTS:
        db.delete(two_factor_code)
        db.commit()
        logger.warning(f"Máximo de tentativas excedido para user_id={user_id}")
        return False
    
    # Verifica código
    if two_factor_code.code != code:
        two_factor_code.attempts += 1
        db.commit()
        logger.warning(f"Código 2FA incorreto para user_id={user_id} (tentativa {two_factor_code.attempts}/{_MAX_ATTEMPTS})")
        return False
    
    # Sucesso! Remove o código do banco
    db.delete(two_factor_code)
    db.commit()
    logger.info(f"Código 2FA verificado com sucesso para user_id={user_id}")
    return True

```

---

### File: `backend\src\services\__init__.py`
```py

```

---

### File: `backend\tests\integration\conftest.py`
```py
import os
import pytest

# Set env vars for testing before importing app to avoid Pydantic validation errors
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test_secret_key_for_testing_purposes_only")
os.environ.setdefault("GEMINI_API_KEY", "dummy_key")

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.db.dependencies import get_db
from app.db.base import Base

# Use in-memory SQLite for tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def setup_db():
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield
    # Drop tables
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(setup_db):
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c

```

---

### File: `backend\tests\integration\test_finance_security.py`
```py
import pytest
from app.core.security import create_access_token
from app.models.user import User
from app.models.finance import Transaction
from decimal import Decimal
from datetime import datetime

# Fixtures for users
@pytest.fixture
def company_user(db_session):
    user = User(
        email="company@test.com",
        hashed_password="hashed_password",
        full_name="Test Company",
        role="company"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def candidate_user(db_session):
    user = User(
        email="candidate@test.com",
        hashed_password="hashed_password",
        full_name="Test Candidate",
        role="candidate"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

def test_create_transaction_success(client, company_user):
    token = create_access_token({"sub": str(company_user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post("/api/finance/transactions", json={
        "description": "Test Transaction",
        "amount": 150.50,
        "type": "income",
        "due_date": "2023-01-01"
    }, headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert float(data["amount"]) == 150.50
    assert data["company_id"] == company_user.id

def test_create_transaction_unauthorized(client):
    response = client.post("/api/finance/transactions", json={
        "description": "Test Transaction",
        "amount": 150.50,
        "type": "income",
        "due_date": "2023-01-01"
    })
    assert response.status_code == 401

def test_create_transaction_forbidden_candidate(client, candidate_user):
    token = create_access_token({"sub": str(candidate_user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post("/api/finance/transactions", json={
        "description": "Test Transaction",
        "amount": 150.50,
        "type": "income",
        "due_date": "2023-01-01"
    }, headers=headers)
    assert response.status_code == 403

def test_get_summary_isolation(client, company_user, db_session):
    # 1. Add transaction for company_user
    t1 = Transaction(
        description="Income 1",
        amount=Decimal("1000.00"),
        type="income",
        status="paid",
        due_date=datetime.now(),
        company_id=company_user.id
    )
    db_session.add(t1)

    # 2. Add transaction for ANOTHER company
    other_user = User(
        email="other@test.com",
        hashed_password="pw",
        full_name="Other Company",
        role="company"
    )
    db_session.add(other_user)
    db_session.commit() # Ensure IDs generated

    t2 = Transaction(
        description="Other Income",
        amount=Decimal("500.00"),
        type="income",
        status="paid",
        due_date=datetime.now(),
        company_id=other_user.id
    )
    db_session.add(t2)
    db_session.commit()

    # 3. Request summary as company_user
    token = create_access_token({"sub": str(company_user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/finance/summary", headers=headers)
    assert response.status_code == 200
    data = response.json()

    # Should check logic in finance_service.get_cash_flow_summary
    # income = sum(t.amount for t in transactions if t.type == "income" and t.status == "paid")
    # Should be 1000.00
    assert data["total_income"] == 1000.00
    assert data["balance"] == 1000.00
    # Should NOT include 500.00

```

---

### File: `backend\tests\integration\test_financial_logic.py`
```py
from app.services.finance_service import FinanceService
from app.models.finance import Transaction
from app.models.user import User
from decimal import Decimal
import pytest
from datetime import datetime

def test_decimal_precision_db(db_session):
    user = User(full_name="Test", email="test@test.com", hashed_password="pw", role="company")
    db_session.add(user)
    db_session.commit()

    # 0.1 + 0.2
    t1 = Transaction(
        description="T1", amount=Decimal("0.10"), type="income", status="paid",
        due_date=datetime.now(), company_id=user.id
    )
    t2 = Transaction(
        description="T2", amount=Decimal("0.20"), type="income", status="paid",
        due_date=datetime.now(), company_id=user.id
    )
    db_session.add(t1)
    db_session.add(t2)
    db_session.commit()

    summary = FinanceService.get_cash_flow_summary(db_session, user.id)

    # Check that sum is exactly 0.30 (Decimal)
    assert summary["total_income"] == Decimal("0.30")
    assert isinstance(summary["total_income"], Decimal)

    # If it was float, it would likely fail equality with Decimal('0.30') or have precision issues
    # assert summary["total_income"] != 0.30000000000000004

```

---

### File: `backend\tests\integration\test_fixes.py`
```py
from fastapi.testclient import TestClient
from app.main import app
from app.core.dependencies import get_current_user
from app.db.dependencies import get_db
from app.core.security import create_access_token
from unittest.mock import MagicMock, patch
import pytest

client = TestClient(app)

def test_path_traversal_css():
    # Attempt to access a file outside css directory via traversal
    # We use URL encoding to prevent TestClient from normalizing the path
    # Must be authenticated to reach the handler
    token = create_access_token({"sub": "1"})
    client.cookies.set("access_token", token)

    response = client.get("/css/..%2fREADME.md")
    # 404 is expected if Router blocks slash in path param. 403 if our logic catches it.
    assert response.status_code in [403, 404]

def test_path_traversal_pages():
    token = create_access_token({"sub": "1"})
    client.cookies.set("access_token", token)

    response = client.get("/pages/..%2fREADME.md")
    assert response.status_code in [403, 404]

def test_finance_role_case_insensitivity():
    # User with role "Company" (mixed case) should be allowed
    user = MagicMock()
    user.role = "Company"
    user.id = 1

    # Mock DB
    mock_db = MagicMock()

    # Mock Service to avoid actual DB calls inside service
    with patch("app.services.finance_service.finance_service.get_cash_flow_summary") as mock_service:
        mock_service.return_value = {"income": 100, "expense": 50, "balance": 50}

        app.dependency_overrides[get_current_user] = lambda: user
        app.dependency_overrides[get_db] = lambda: mock_db

        try:
            response = client.get("/api/finance/summary")
            assert response.status_code == 200
            assert response.json() == {"income": 100, "expense": 50, "balance": 50}
        finally:
            app.dependency_overrides = {}

def test_finance_role_unauthorized():
    # User with role "Candidate" should be 403
    user = MagicMock()
    user.role = "Candidate"

    app.dependency_overrides[get_current_user] = lambda: user

    try:
        response = client.get("/api/finance/summary")
        assert response.status_code == 403
    finally:
        app.dependency_overrides = {}

def test_create_transaction_date_parsing():
    # Test that YYYY-MM-DD is accepted
    user = MagicMock()
    user.role = "company"
    user.id = 1

    mock_db = MagicMock()

    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: mock_db

    payload = {
        "description": "Test Transaction",
        "amount": 100.50,
        "type": "income",
        "due_date": "2023-12-25"
    }

    try:
        response = client.post("/api/finance/transactions", json=payload)
        # If successful, it returns the transaction object (or fails at DB add if mock not perfect)
        # We just want to ensure validation passes (i.e. not 422)
        # The code does db.add(transaction), db.commit(), db.refresh().
        # We need to mock these on mock_db.

        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "Test Transaction"
        # Check due_date is returned (as datetime usually iso format)
        assert "2023-12-25" in data["due_date"]
    finally:
        app.dependency_overrides = {}

```

---

### File: `backend\tests\integration\test_main.py`
```py
from fastapi.testclient import TestClient
import sys
import os
import httpx # Ensure httpx is installed

# Adiciona o diretório 'innovation' ao sys.path para que possamos importar 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

# Instantiate TestClient
client = TestClient(app)

def test_read_main():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_get_stats():
    response = client.get("/api/stats")
    assert response.status_code == 200
    assert "vagas_ativas" in response.json()
    assert response.json()["vagas_ativas"] == 12

def test_home_page():
    response = client.get("/")
    assert response.status_code == 200
    # Verifica se contém o título ou algo da landing page
    assert "Innovation.ia" in response.text

def test_login_page():
    response = client.get("/login")
    assert response.status_code == 200
    assert "Login" in response.text

```

---

### File: `backend\tests\integration\test_routes_integration.py`
```py
import pytest

def test_login_flow(client):
    # Register
    register_data = {
        "email": "test@company.com",
        "password": "securepassword",
        "name": "Test User",
        "company_name": "Test Corp",
        "razao_social": "Test Corp Ltda",
        "cnpj": "12345678000199",
        "cidade": "Sao Paulo",
        "uf": "SP",
        "phone": "11999999999"
    }

    response = client.post("/api/auth/register", json=register_data)
    if response.status_code != 200:
        print(response.json())
    assert response.status_code == 200

    # Login
    login_payload = {
        "email": "test@company.com",
        "password": "securepassword"
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200
    token = response.json()["access_token"]

    # Access Dashboard without cookie (should redirect)
    # Note: TestClient handles cookies automatically if set in previous requests?
    # No, POST /api/auth/login returns token in body, not cookie.

    # Clear cookies just in case
    client.cookies.clear()

    response = client.get("/dashboard", follow_redirects=False)
    # 307 Temporary Redirect is default for RedirectResponse
    assert response.status_code == 307

    # Access Dashboard with cookie
    client.cookies.set("access_token", token)
    response = client.get("/dashboard")
    assert response.status_code == 200

```

---

### File: `backend\tests\integration\test_security.py`
```py
import sys
from unittest.mock import patch, MagicMock
import pytest

# Mock necessary modules if they are not installed in the environment.
# This allows importing the security module for testing purposes in environments
# where dependencies are not fully installed.
if 'jose' not in sys.modules:
    sys.modules['jose'] = MagicMock()
if 'bcrypt' not in sys.modules:
    sys.modules['bcrypt'] = MagicMock()
if 'pydantic_settings' not in sys.modules:
    sys.modules['pydantic_settings'] = MagicMock()

# Mock app.core.config to avoid its internal dependencies and environment requirements.
mock_config = MagicMock()
mock_config.SECRET_KEY = "test_secret"
mock_config.ALGORITHM = "HS256"
sys.modules['app.core.config'] = mock_config

# Now we can import the function under test
from app.core.security import verify_temporary_token

@pytest.fixture
def mock_jwt():
    """Fixture to mock the jwt object within the app.core.security module."""
    with patch('app.core.security.jwt') as mock_jwt_obj, \
         patch('app.core.security.SECRET_KEY', "test_secret"), \
         patch('app.core.security.ALGORITHM', "HS256"):
        yield mock_jwt_obj

def test_verify_temporary_token_success(mock_jwt):
    """Test successful verification of a valid temporary token."""
    mock_jwt.decode.return_value = {"sub": "123", "type": "temporary_2fa"}
    token = "valid_token"

    result = verify_temporary_token(token)

    assert result == 123
    mock_jwt.decode.assert_called_once_with(token, "test_secret", algorithms=["HS256"])

def test_verify_temporary_token_wrong_type(mock_jwt):
    """Test that a token with the wrong type returns None."""
    mock_jwt.decode.return_value = {"sub": "123", "type": "access"}

    result = verify_temporary_token("wrong_type_token")

    assert result is None

def test_verify_temporary_token_decode_error(mock_jwt):
    """Test that any decoding error returns None."""
    mock_jwt.decode.side_effect = Exception("JWT Decode Error")

    result = verify_temporary_token("invalid_token")

    assert result is None

def test_verify_temporary_token_missing_sub(mock_jwt):
    """Test that a token missing the 'sub' claim returns None."""
    mock_jwt.decode.return_value = {"type": "temporary_2fa"}

    result = verify_temporary_token("missing_sub_token")

    assert result is None

def test_verify_temporary_token_invalid_sub_format(mock_jwt):
    """Test that a token with a non-integer 'sub' claim returns None."""
    mock_jwt.decode.return_value = {"sub": "not-an-integer", "type": "temporary_2fa"}

    result = verify_temporary_token("invalid_sub_token")

    assert result is None

```

---

### File: `docs\limpeza-git-submodulos.md`
```md
# Limpeza final de índices e submódulos

Remova todos os arquivos do **índice** (sem apagar os arquivos no disco):

```bash
git rm -r --cached .
```

Isso faz o Git "esquecer" tudo o que está no índice, incluindo entradas que tratam pastas como submódulos.

Adicione tudo de novo (índice limpo):

```bash
git add .
```

O Git reconstrói o índice tratando tudo como arquivos normais (Python, imagens, HTML), sem referências a submódulos externos.

Commit e push forçado:

```bash
git commit -m "Limpeza total de índices e submódulos"
git push origin <sua-branch>:main --force
```

- Troque `<sua-branch>` pelo nome da branch em que você está (ex.: `update-reqs` ou `main`).
- Exemplo: se sua branch é `update-reqs` e você quer atualizar `main` no remoto:  
  `git push origin update-reqs:main --force`
- **Atenção:** `--force` sobrescreve o histórico de `main` no remoto. Use só se tiver certeza.

---

## Por que isso funciona?

O índice do Git (`.git/index`) pode ainda ter entradas marcando pastas (ex.: `tabler`) como submódulo. Com `git rm -r --cached .` você remove todo o índice. Com `git add .` em seguida, o Git recria o índice só com arquivos normais, sem tentar resolver URLs de submódulos.

---

## Dica para o Koyeb

Se o erro continuar depois do push:

1. No painel do Koyeb, vá em **Settings** (Configurações).
2. Procure por **Build Cache**.
3. Desative o cache ou use **Clear Cache** — o Koyeb pode estar reutilizando um clone antigo com o problema de submódulos.

```

---

### File: `ops\docker-compose.yml`
```yml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: innovation_db
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: ${POSTGRES_DB:-innovation_db}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: innovation_redis
    restart: always
    ports:
      - "6379:6379"

  api:
    build:
      context: ..
      dockerfile: backend/Dockerfile
    container_name: innovation_api
    restart: always
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@db:5432/${POSTGRES_DB:-innovation_db}
      - REDIS_URL=redis://redis:6379/0
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - SECRET_KEY=${SECRET_KEY}
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis

  ai_worker:
    build:
      context: ..
      dockerfile: backend/Dockerfile
    container_name: innovation_worker
    restart: always
    command: celery -A ai_engine.worker worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@db:5432/${POSTGRES_DB:-innovation_db}
      - REDIS_URL=redis://redis:6379/0
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - PYTHONPATH=/app/backend/src:/app
    depends_on:
      - redis
      - db

volumes:
  postgres_data:

```

---

### File: `ops\render.yaml`
```yaml
services:
  - type: web
    name: innovation-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: cd innovation && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.4
      - key: DATABASE_URL
        sync: false
      - key: SECRET_KEY
        sync: false

```

---

### File: `ops\vercel.json`
```json
{
  "builds": [
    {
      "src": "innovation/app/main.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "innovation/app/main.py"
    }
  ]
}

```

---

