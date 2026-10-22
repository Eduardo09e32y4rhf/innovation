# Revisão para unificação do SaaS (somente leitura)

Data: 2026-10-22. Escopo: `apps/web` (Next 14 App Router) e `apps/api` (NestJS + Prisma). Nenhum código foi alterado.
Método: leitura do código, `vitest` (permission-matrix + specs de management/notifications/document-templates/payroll: todos passam) e geração real dos PDFs disciplinares com um script em memória (prisma e storage simulados) lidos com `pdftotext`. Nada foi executado contra servidor ou banco. O que não foi confirmado está marcado "não confirmado".

Convenções: `W:` = apps/web/app, `A:` = apps/api/src. Perfis: DEV, CEO, COMERCIAL, CONTABIL, ADMIN, RH, RH_RS, GESTOR, FUNCIONARIO, CONSULTA.
Regra de ouro da API: `RolesGuard` libera DEV sempre e libera qualquer logado quando não há `@Roles` (A:common/guards/roles.guard.ts:11-19). Rotas sem `@Roles` (ex. `notifications` exceto `POST admin`) valem para todos.

Fontes de permissão no front (todas com cópia própria, ver seção 4): `W:lib/role-access.ts:9-31`, `W:[tenant]/dashboard/_components/shell-v2/nav-config.ts:30-42` (menu e `WorkspaceRouteGate`), `W:lib/permissions.ts` (`DEFAULT_PERMISSIONS`), `W:lib/schedule-access.ts`, `W:[tenant]/dashboard/settings/_hub/types.ts:22-47`, `W:[tenant]/dashboard/platform/_lib/platform-access.ts`.

Importante sobre o gate de rotas: `WorkspaceRouteGate` (W:[tenant]/dashboard/_components/shell-v2/route-gate.tsx) acha o "dono" da URL por prefixo no menu. Rotas sem item próprio caem no dono `dashboard` (todos os perfis). Por isso `reports`, `performance`, `partners`, `whatsapp`, `notifications`, `platform/proposals/*` abrem para qualquer perfil logado, a menos que a própria página restrinja.

---

## 1. Todas as páginas (105 `page.tsx`)

Legenda de status: OK = tela real; REDIR = só redireciona; DUP = duplicada; MORTA = mock/sem uso/sem dado; PARCIAL = existe mas incompleta.
"API" = perfis que a API aceita nas rotas que a tela chama (A:modules/<x>/*.controller.ts). DEV passa em tudo.

### 1.1 Públicas e autenticação

| Rota | O que faz | Front | API | Divergência / status |
|---|---|---|---|---|
| `/` | Landing + portal de vagas | público | público | OK |
| `/planos` | Vitrine de planos, calcula preço no cliente | público | `/auth/public-plans` público | DUP do cálculo de preço (seção 4) |
| `/cadastro` | Cadastro de empresa/plano, estima preço e valida CPF/CNPJ no cliente | público | auth público | DUP de preço e de validação de documento |
| `/criar-conta` | Repassa query para `/cadastro` | público | - | REDIR (`criar-conta/page.tsx`) |
| `/login` | Login | público | público | OK |
| `/mfa` | Segundo fator | logado parcial | auth | OK |
| `/esqueci-senha` | Pedido de recuperação | público | público | OK |
| `/forgot-password` | Repassa query para `/esqueci-senha` | público | - | REDIR legado |
| `/reset-password` | Nova senha por token | público | público | OK |
| `/verify-email` | Verifica e-mail | público | público | OK |
| `/ceo-onboarding` | Primeiro acesso do CEO | CEO | auth | OK; forçado pelo layout do dashboard (layout.tsx:31) |
| `/auth/ghost` e `/auth/ghost-init` | Acesso assistido (aba isolada) | DEV (não confirmado o gate fino) | platform.controller | OK |
| `/pagamento/retorno` | Retorno do gateway | logado | finance | OK |
| `/privacidade`, `/termos`, `/suporte` | Institucionais; `/suporte` público | público | - | `/suporte` (público) e `/[tenant]/dashboard/support` coexistem: propósitos diferentes (lead x ticket), manter |
| `/[tenant]/fatura-pendente` | Tela de bloqueio por fatura | ADMIN (layout redireciona ADMIN para faturas, layout.tsx:42-46) | faturas | Sobrepõe-se a `dashboard/faturas` (ver seção 5) |

### 1.2 Carreiras (candidato, público por token)

`/carreiras`, `/carreiras/[companyId]`, `/carreiras/[companyId]/[jobId]`, `/carreiras/acompanhar/[token]`, `/carreiras/agendar/[token]`, `/carreiras/conta`, `/carreiras/conta/entrar`, `/carreiras/conta/perfil`, `/carreiras/documentos/[token]`, `/carreiras/entrevista/[token]`, `/carreiras/interna/[jobId]`, `/carreiras/privacidade`, `/carreiras/proposta/[token]`, `/carreiras/teste/[token]`: 14 páginas, públicas ou por token de candidato, todas OK (cada uma monta um componente cliente). Observação: `carreiras/conta/perfil/profile-form.tsx:12-13` tem `digits`/`maskCpf` próprios (DUP, seção 4). `/carreiras/interna/[jobId]` e `/dashboard/jobs/internas` atendem ao mesmo fluxo "vaga interna": ver seção 5.

### 1.3 Dashboard da empresa `/[tenant]/dashboard/...`

| Rota | O que faz | Front | API | Divergência / status |
|---|---|---|---|---|
| `dashboard` (page.tsx, 946 linhas) | Painel inicial | todos; RH_RS tem painel próprio (page.tsx:45) | `dashboard/summary|insights`: DEV, ADMIN, RH, GESTOR, FUNCIONARIO, CONSULTA, CEO, CONTABIL, COMERCIAL (A:modules/dashboard/dashboard.controller.ts:11) | Seção 2. Contábil e Comercial veem placeholder |
| `dashboard/employees` | Lista, desligar, excluir/arquivar, dossiê | menu: DEV, ADMIN, RH, GESTOR, CONSULTA (nav-config.ts:31); escrita: DEV, ADMIN, RH | `GET`: CEO, ADMIN, RH, GESTOR, FUNCIONARIO, CONSULTA; escrita: ADMIN, RH (employees.controller.ts:17,101-120) | CEO e FUNCIONARIO a API aceita, menu não mostra; escopo do FUNCIONARIO na listagem: não confirmado |
| `dashboard/employees/new` | Cadastro/edição (912 linhas) | employeeWrite | ADMIN, RH | Outro agente edita o cadastro; só consultado |
| `dashboard/employees/import` | Importação CSV | employeeWrite | ADMIN, RH, DEV (employees-import.controller.ts:21) | OK |
| `dashboard/colaboradores` | Redireciona para `employees` | - | - | REDIR |
| `dashboard/escalas` | Central de Escalas: calendário, ponto, solicitações, aprovações, modelos, fechamento, relatórios (`?view=`) | `hasScheduleModule` (schedule-access.ts) | `escalas/*` por capacidade (A:modules/schedule/access/schedule-access.ts) | OK; é o ponto + fechamento |
| `dashboard/escala`, `ponto`, `time-track`, `time-track/clock-in|closing|occurrences|rules`, `escalas/calendario|documentos|equipe|fechamento|ocorrencias|ponto|regras|trocas` | 15 redirecionamentos para `escalas?view=` | - | - | REDIR legado (8 de `escalas/*`, 5 de `time-track/*`, `escala`, `ponto`) |
| `dashboard/vacations` | Férias: lista, radar, pedir, aprovar | menu COMPANY_ROLES; pedir: DEV, ADMIN, RH; aprovar: DEV, ADMIN, RH | `POST /vacations`: ADMIN, RH, GESTOR, FUNCIONARIO, DEV; `PATCH status`: ADMIN, RH (vacations.controller.ts:89,95) | DIVERGE: GESTOR/FUNCIONARIO a API aceita pedir férias, a tela não deixa (role-access.ts:13 diz que a rota não existe: comentário desatualizado) |
| `dashboard/management` | Central de Gestão (ASO, pendências) | menu DEV, ADMIN, RH, GESTOR (nav-config.ts:34) | `management/sst`, `aso`: + CEO, CONSULTA | DIVERGE: CEO e CONSULTA têm API e `ROLE_ACCESS.asoView` (role-access.ts:20) mas o menu bloqueia a área |
| `management/agenda` | Kanban/agenda | agendaView: DEV, ADMIN, RH, GESTOR, RH_RS | `management/events`: DEV, ADMIN, RH, RH_RS, GESTOR | OK |
| `management/aso` e `management/seguranca` | Redirecionam para `seguranca/aso` | - | - | REDIR |
| `management/seguranca/aso` | ASO / PCMSO | asoView: + CEO, CONSULTA | idem | PARCIAL (ver divergência acima) |
| `management/notifications` | Comunicados, advertências, suspensões, modelos | notificationsManage: DEV, ADMIN, RH (outros só leem) | `POST notifications/admin`: DEV, ADMIN, RH; PDF `management/documents/*legal-notice`: DEV, ADMIN, RH | Único lugar de advertência/suspensão (seção 6) |
| `management/onboarding` | Admissão | DEV, ADMIN, RH | `onboarding`: DEV, ADMIN, RH | OK |
| `management/promotions` | Promoções | promotionsWrite: DEV, ADMIN, RH; flag `promotions` | `promotions`: DEV, ADMIN, RH, CEO | CEO tem API sem menu |
| `management/payroll` | Folha de pagamento (`Payroll`) + competência liberada pela contabilidade | payrollAccess: DEV, ADMIN, RH | `payroll`, `payroll-periods`: DEV, ADMIN, RH | DUP funcional com `escalas?view=fechamento` e `contabilidade` (seção 5) |
| `dashboard/contabilidade` | Folha do mês por empresa e rotina do escritório | DEV, CEO, CONTABIL | `accounting`: DEV, CEO, CONTABIL (accounting.controller.ts:19) | OK; o mesmo mês aparece em 3 telas |
| `dashboard/users` | Usuários e acessos | menu DEV, ADMIN, RH (nav-config.ts:37); `usersPage` inclui CEO (role-access.ts:30) | `users`: DEV, CEO, ADMIN, RH | DIVERGE: CEO sem item de menu |
| `dashboard/users/candidatos` | Contas de candidato | DEV (link em users/page.tsx:71) | não confirmado | OK |
| `dashboard/settings` | Hub de configuração (8 seções) | todos (inclui RH_RS) | por seção (seção 3) | Seção 3 |
| `dashboard/faturas` | Faturas da empresa; para quem tem `faturas.todas_empresas` redireciona à Plataforma | DEV, CEO, CONTABIL, ADMIN, RH (nav-config.ts:38) | `faturas/*`: DEV, CEO, CONTABIL, COMERCIAL, ADMIN, RH, GESTOR, FUNCIONARIO, CONSULTA (sem RH_RS); `finance/company/*`: ADMIN, DEV | RH_RS sem acesso (seção 3). Em edição por outro agente |
| `dashboard/finance` e `dashboard/media` | Redirecionam para o dashboard | - | - | REDIR morto |
| `dashboard/notifications` | Redireciona para `management?tab=notifications` | - | - | REDIR; `?tab=` não é lido por `management/page.tsx` (não confirmado se o layout trata): provável link quebrado |
| `dashboard/rh` | Redireciona para `management` | - | - | REDIR |
| `dashboard/chat` | Redireciona para `whatsapp` | - | - | REDIR |
| `dashboard/whatsapp` | Conversas WhatsApp | página restringe a DEV | `communication`: DEV (class @Roles) | OK; menu não tem item (gate cai em `dashboard`) |
| `dashboard/support` | Tickets do cliente | menu ALL_ROLES (sem RH_RS) | `support`: DEV, CEO, CONTABIL, COMERCIAL, ADMIN, RH, GESTOR, FUNCIONARIO, CONSULTA | OK; RH_RS sem suporte (não confirmado se desejado) |
| `dashboard/jobs`, `jobs/[jobId]`, `jobs/[jobId]/edit`, `jobs/[jobId]/teste`, `jobs/new`, `jobs/metrics`, `jobs/settings`, `jobs/talentos` | Recrutamento | DEV, ADMIN, RH, RH_RS, GESTOR; configurar: DEV, ADMIN, RH | `jobs`: DEV, ADMIN, RH, RH_RS, GESTOR (ações: sem GESTOR) | OK |
| `dashboard/jobs/internas` | Vagas internas para o funcionário | FUNCIONARIO | não confirmado | Mesmo fluxo que `/carreiras/interna/[jobId]` (seção 5) |
| `dashboard/reports` | "Relatórios e BI" | qualquer logado (cai em `dashboard`) | nenhuma chamada | MORTA: sem `api.`, sem item de menu |
| `dashboard/performance` | Avaliações | qualquer logado | nenhuma chamada | MORTA: array fixo `evaluations` (performance/page.tsx:20) |
| `dashboard/partners` | Parceiros | qualquer logado | `partners`: ADMIN, GESTOR | MORTA: link `partners/new` (partners/page.tsx:16) sem página; sem chamada de API |

### 1.4 Plataforma `/[tenant]/dashboard/platform/...`

Menu: DEV, CEO, COMERCIAL, CONTABIL (nav-config.ts:41); detalhe por aba em `platform/_lib/platform-access.ts`. API: `platform` DEV, CEO, COMERCIAL; `platform-hub` DEV, CEO, COMERCIAL, CONTABIL; `platform-audit` DEV, CEO, CONTABIL; `coupons` DEV, CEO, CONTABIL; `manual-contracts` DEV, CEO, CONTABIL, COMERCIAL; `proposals` criar/enviar: DEV, COMERCIAL; `faturas/plataforma/*` conforme permissão `faturas.*`.

| Rota | O que faz | Status |
|---|---|---|
| `platform` | Visão geral global | OK |
| `platform/clientes` | Lista de empresas | OK |
| `platform/clientes/[companyId]` | Ficha da empresa (abas) | OK |
| `platform/clientes/contratos` | Contratos manuais | OK, flag `manual-contracts` |
| `platform/clientes/propostas` | Pipeline de propostas | OK, flag `proposals` |
| `platform/proposals/new` e `platform/proposals/[id]` | Criar/ver proposta (usa `useState` + `api.proposals`, valores fixos `monthlyPrice: 199.90`) | DUP de `clientes/propostas` (a lista aponta para elas: `_hub/propostas-view.tsx:40,79`); sem gate de papel próprio |
| `platform/financeiro` | Financeiro global (faturas, assinaturas, planos, cupons) | OK; outro agente edita |
| `platform/sistema` | Configuração, permissões, acessos, auditoria | OK |
| `platform/suporte` | Fila de suporte | OK |
| `platform/whatsapp` | `export { default } from '../../whatsapp/page'` | DUP literal, REDIR de fato |

### 1.5 Portais soltos

| Rota | O que faz | Status |
|---|---|---|
| `/[tenant]/portal` | Home do funcionário | DUP do dashboard FUNCIONARIO; só `/login` o conhece (login/page.tsx:17), nenhum menu leva |
| `portal/ponto` | Texto + botão para `escalas?view=ponto` | DUP/PARCIAL, sem API |
| `portal/ferias` | Texto estático "faça solicitações" | MORTA, sem API |
| `portal/documentos` | Texto estático | MORTA, sem API |
| `portal/holerites` | `timeClosing.myPayslips` | OK; é a única tela do funcionário com holerite |
| `/[tenant]/clientes` | "Portal do Cliente" com botão sem ação | MORTA, sem API |
| `/[tenant]/parceiros` | "Portal do Parceiro" com botão sem ação | MORTA, sem API |

Totais: 14 carreiras, 25 redirecionamentos (chat, colaboradores, escala, 8 escalas/*, finance, media, notifications, ponto, rh, 5 time-track/*, management/aso, management/seguranca, criar-conta, forgot-password), 8 mortas (reports, performance, partners, clientes, parceiros, portal/ferias, portal/documentos, portal/ponto), 3 duplicadas (platform/proposals/new, platform/proposals/[id], platform/whatsapp).

---

## 2. Painel inicial por perfil (`/[tenant]/dashboard`)

Hoje (W:[tenant]/dashboard/page.tsx): um único componente com `if` por perfil.

| Perfil | O que vê hoje | Deveria ver (regra do dono) | Gap |
|---|---|---|---|
| FUNCIONARIO | `EmployeeDashboard` (page.tsx:177; `_components/employee-dashboard.tsx`): banco de horas, trabalhado no mês, créditos/débitos, jornadas recentes. Somas calculadas no cliente (employee-dashboard.tsx:38-40) | Próximo turno/escala do dia, bater ponto, banco de horas, saldo e pedido de férias, último holerite, comunicados/advertências pendentes | Sem holerite, férias, escala do dia, avisos. Banco de horas não vem pronto do servidor |
| GESTOR | Painel genérico da empresa com atalhos Minha equipe/Escala/Ponto (page.tsx:204+) e KPIs do `dashboard/summary` | Pendências da equipe: aprovações de ponto/extras/trocas, faltas do dia, banco da equipe, férias da equipe | Sem fila de aprovação nem visão por equipe específica |
| RH | Painel genérico + atalhos Novo funcionário/Férias/Gestão | Admissões, ASO a vencer, férias pendentes, comunicados, fechamento do mês | Genérico, mas cobre parte (rhAlerts) |
| ADMIN | Idem RH com atalhos Funcionários/Usuários/Fechamento | Visão da empresa + faturas/plano | Sem alerta de fatura no painel (só faixa no layout) |
| DEV | Painel genérico da empresa dele + atalhos Plataforma/Financeiro/Usuários | Saúde global (empresas, erros, filas, financeiro) | Mostra a empresa do tenant, não a plataforma. Atalho `/platform/finance` depende de redirect do next.config (page.tsx:207,210,214) |
| CEO | Mesmo painel genérico (consulta `employees`, `alerts`; não consulta ponto/férias, page.tsx:66) + atalhos | Receita, MRR, churn, empresas ativas | Os painéis certos existem em `_components/role-dashboards/ceo-dashboard.tsx` mas não são usados |
| CONTABIL | Cabeçalho + cartão "Visão Contábil Financeira" sem dado (page.tsx:246-285) | Competências pendentes/calculadas/publicadas por empresa, prazos de obrigações | Placeholder |
| COMERCIAL | Cabeçalho + cartão "Visão Comercial" sem dado (page.tsx:287-330) | Funil de propostas, trials, conversões | Placeholder |
| CONSULTA | Painel genérico em modo leitura | Indicadores somente leitura | Aceitável |
| RH_RS | `RecruitmentDashboard` (page.tsx:45) | Funil de vagas e agenda | Cumprida |

Código morto relacionado (0 importações): `_components/dashboard-router.tsx` + `role-dashboards/{ceo,commercial,accounting,hr}-dashboard.tsx`, `dashboard-sidebar.tsx`, `dashboard-topbar.tsx`, `DashboardCharts.tsx`, `dashboard-home-cards.tsx`, `platform/_hub/scope-picker.tsx`.
Cálculos no cliente que deveriam vir do servidor: saldo do mês (page.tsx `totalBalanceThisMonth`), admissões/desligamentos por mês (page.tsx:146-156), aniversários. Data do mês em hora local do navegador (page.tsx:74,150), existindo `W:lib/date.ts` (`saoPauloMonthKey`).

Regra "cada perfil tem o SEU painel": NÃO CUMPRIDA para CONTABIL, COMERCIAL, CEO, DEV, GESTOR e FUNCIONARIO (incompleto). Cumprida só para RH_RS.

---

## 3. Configuração por perfil

Hoje (`W:[tenant]/dashboard/settings/_hub/types.ts:22-47`, `settings/page.tsx`):

| Perfil | Seções hoje | Regra do dono | Cumprida? |
|---|---|---|---|
| DEV | conta, segurança, empresa, feriados, hora extra, descontos, acessos, dados (da empresa do tenant; `companies.me` em company-section.tsx:47) | Ajustes de TODAS as empresas | NÃO: a tela edita só a empresa do tenant; a edição por empresa vive em `platform/_components/company-edit-modal.tsx` e na ficha. Falta um seletor de empresa no hub |
| CONTABIL | conta, segurança (types.ts:28) | Alterar a própria senha e ajustes gerais dele | PARCIAL: senha sim (`AccountSection`); "ajustes gerais" (regras tributárias, `accounting/rules`) estão em Contabilidade > Rotina, não em Configurações |
| RH | todas as 8 seções (types.ts:25). Empresa editável: canEditCompanyFor (types.ts:50) | Resetar só a própria senha e a dos usuários da empresa | PARCIAL: reset de terceiros na tela Usuários (API `users/:id/reset-password` DEV, ADMIN, RH, users.controller.ts:97) com hierarquia RH→RH, RH_RS, GESTOR, FUNCIONARIO, CONSULTA (A:common/constants/role-hierarchy.ts:9). Mas RH também edita dados da empresa, feriados, hora extra e descontos (`companies PATCH me`: ADMIN, RH, RH_RS, companies.controller.ts:23). Mostra mais do que a regra pede. RH não pode reemitir a própria senha por `reset-password` (users.service.ts:362), usa Meu perfil |
| RH_RS | conta, segurança; `empresa` somente se `isRecruiterOnlyAccount` (types.ts:36-40,45-47) | MEI com logo, CNPJ e aba Faturas | NÃO: (a) logo/CNPJ dependem de a empresa não ter o módulo `employees` (recruiter-account.ts:7-9); RH_RS em empresa com funcionários vê só conta e segurança (types.ts:32); (b) Faturas: menu sem RH_RS (nav-config.ts:38) e `faturas.controller.ts:30` sem RH_RS e `DEFAULT_PERMISSIONS` sem `rh_rs` (permissions.ts); (c) `finance/company/*` só ADMIN, DEV |
| CEO | conta, segurança | "todos têm acesso, cada um vê só o seu" | Cumprida no mínimo; CEO sem seção de empresa |
| ADMIN | todas | - | Cumprida |
| GESTOR, FUNCIONARIO, CONSULTA, COMERCIAL | conta, segurança | Idem | Cumprida |

Fazer: seletor "empresa" para DEV; seção "Regras de cálculo" para CONTABIL; separar RH em duas camadas (conta + usuários) versus ADMIN (empresa); liberar RH_RS em empresa/Faturas por perfil, não por módulo.

---

## 4. Cálculos duplicados (fora dos motores centrais)

Motores centrais de referência:
- Folha: `A:modules/time-track/payroll-calculation.service.ts` (INSS 100-105, IRRF 106-112, FGTS 113, `calculate`/`applyTaxes` 224-274, `calculateInss` 292, `calculateIrrf` 309).
- Jornada: `A:modules/time-track/time-calculation-rules.ts` (noturno 52,5 em :164), `overtime-policy.ts`, `closing-compliance.ts`.
- Rescisão e 13º: `A:modules/payroll/termination.calculator.ts`, `thirteenth.calculator.ts`; férias: `vested-vacations.ts`, `A:modules/vacations/vacation-tax-base.ts`; descontos: `payroll/deduction-rules.ts`.
- Preço: `A:modules/finance/pricing.ts` (`computePrice`, `prorationDays`, `LEGACY_CYCLE_DISCOUNT_BPS` :24).
- Datas: `A:common/utils/date.utils.ts` (`toSaoPauloDateKey`, `toDateOnly`) e `W:lib/date.ts`.

### 4.1 Folha (o problema mais grave)

| Onde | Problema | Usar |
|---|---|---|
| `A:modules/payroll/payroll.service.ts:146-248` (`build`) e `A:modules/time-track/time-closing.service.ts:205-340` | Dois montadores de entrada da folha chamam o mesmo `calculate`, com entradas diferentes. O fechamento considera feriados, férias, contrato (admissão/desligamento), dias sem batida como falta, conformidade CLT (`analyzeTimesheet`), perda de DSR, fatores de extra da empresa, `contractDaysInPeriod` e `vacationTaxableGrosses`. O `Payroll.build` não considera nada disso (só soma `TimeTrack`), usa `isPartialMonth: !fullMonth` (:178) enquanto o fechamento usa `totalDaysInPeriod < 28 || > 31` (:283). Mesma pessoa e mês dão valores diferentes em Gestão > Folha, Escalas > Fechamento e Holerite | Um único "montador" (extrair do fechamento) usado por `Payroll` e `TimeClosing`. `Payroll` deveria derivar do `TimeClosing` |
| `A:modules/payroll/accounting-period.service.ts:150-195` | O cálculo da competência gera `TimeClosing` e depois recria/atualiza `Payroll` por `payroll.update`. Totais da competência vêm dos fechamentos (:175-180) enquanto Gestão > Folha lista `Payroll` | Idem |
| `A:modules/accounting/accounting-hub.service.ts:127-170` (`recalcPayrollRow`) | Reconstrói itens de folha e chama `applyTaxes` por conta própria | Motor `applyTaxes` já usado; manter só a chamada e remover o remonte de itens |
| `A:modules/notifications/notifications.service.ts:318-354` (`applySuspension`) | Recalcula minutos diários (`dailyWorkload`), dias de descanso (`workScale 6X1 -> [0], senão [0,6]`), `dailyBalance: -absence`, falta por suspensão e desconto `salary/30*days` fora do motor; reescreve `TimeTrack` por `upsert` (:333-348) sem checar fechamento travado (não confirmado se `period-lock.ts` bloqueia) | `time-track.service` (ajuste `ajuste_suspensao`, :638) + `payroll-calculation.service` para o desconto |
| `A:modules/payroll/payroll.service.ts:151-155` e `notifications.service.ts:322-329` | Cópia da lógica "escala -> dias de descanso" com default `[0,6]`; `A:common/utils/work-schedule.utils.ts` tem a versão única mas com default `[0]` e só a usa `vacations.service.ts:6` | `getDaysOffByScale` (unificar o default) |
| `A:modules/time-track/time-track.service.ts:650-662` | `dailyBalance: -workload` para abonos de dia inteiro, calculado inline | `time-calculation-rules.ts` |

### 4.2 Férias, 13º, rescisão

| Onde | Problema | Usar |
|---|---|---|
| `A:modules/vacations/vacation-receipt.service.ts:45-48` | `salary/30*dias`, 1/3 e abono recalculados; `vacation-tax-base.ts:9-11` repete só parte | `vacation-tax-base.ts` expondo bruto, 1/3 e abono |
| `A:modules/vacations/vacations.service.ts:50-55` e `:322` | Faltam "anos, meses, dias" por aproximação de 365/30 dias | `labor-dates.ts` |
| `W:[tenant]/dashboard/vacations/vacation-data.ts:17-90` (`acquisitionWindow`, `vacationRadar`, `CYCLE_DAYS`) | Período aquisitivo/concessivo e prazo calculados no navegador, em paralelo a `A:modules/payroll/vested-vacations.ts` e `GET /vacations/employee/:id/entitlements` | Servidor expõe o radar; a tela só exibe |
| `A:modules/payroll/termination.calculator.ts:212` | `30.4375` dias/mês e `fineRate` próprios (:216) | OK como motor; precisa de tela (seção 6) |
| 13º regular | `thirteenth.calculator.ts` só é importado por `termination.calculator/service`. Fluxo regular de 13º: não confirmado |  |

### 4.3 Horas, extras, noturno, banco

| Onde | Problema | Usar |
|---|---|---|
| Formatar minutos "XhYY" em 11 lugares: `W:[tenant]/dashboard/_components/employee-dashboard.tsx:31`, `escalas/_lib/format.ts:6`, `escalas/_components/launch-extras.tsx:13`, `contabilidade/_model.ts:84`, `W:lib/format.ts:35`; `A:modules/schedule-hub/launch/launch-rules.ts:34`, `calendar/calendar.service.ts:15`, `overview/overview.service.ts:181`, `requests/requests.service.ts:131,151`, `requests/request-rules.ts:118`, `employees/employee-documents.service.ts:225` | Mesma função repetida | `W:lib/format.ts:formatMinutes` e um util único na API |
| Converter "HH:MM" em minutos: `A:schedule-hub/requests/request-rules.ts:79`, `time-track.service.ts:818`, `calendar/day-resolver.ts:29`, `payroll.service.ts:148`, `notifications.service.ts:318`, `time-closing.service.ts:841-860` (`expectedMinutes`, `defaultWeeklyMinutes`) | Cópias | Um `parseHm` em `common/utils` |
| `W:[tenant]/dashboard/_components/employee-dashboard.tsx:38-40`, `page.tsx` (`totalBalanceThisMonth`) | Soma de `dailyBalance`, créditos e débitos no cliente | `dashboard/summary` (já devolve `totalTimeBalance`) |
| Totais de folha somados no cliente: `W:[tenant]/dashboard/contabilidade/_model.ts:116`, `management/payroll/page.tsx:81-90`, `escalas/_components/closing-view.tsx:44`, `platform/_hub/accounting/competencia.tsx:21` | Somas de bruto/INSS/IRRF/FGTS/líquido em quatro telas | Totais vindos da API (`AccountingPeriod` já guarda `gross`, `net`, `inss`, `irrf`, `fgts`) |

### 4.4 Preço, plano, pró-rata

| Onde | Problema | Usar |
|---|---|---|
| `W:(public)/planos/page.tsx:43-51` (`calculatePrice`) | Base + excedente e `YEARLY * 0.9` fixo no cliente; o comentário diz "mesma regra do servidor" mas `pricing.ts:24` usa `LEGACY_CYCLE_DISCOUNT_BPS {1:0,3:500,6:800,12:1000}` por `commitmentMonths` | `startingMonthlyPrice` já devolvido por `auth.service.ts:87-90`; preço sempre de `computePrice` via API |
| `W:cadastro/page.tsx:123-125` | `estimate = base + (seats - includedUnits)*seat` | Endpoint de cotação |
| `A:modules/finance/platform-finance.service.ts:1069-1095` (`monthlyPricingCents`) | Preço mensal próprio (desconto só na base, `Math.round(base*(100-d)/100)`), diferente de `computePrice` | `pricing.ts#computePrice` |
| `A:modules/jobs/jobs.repository.ts:80-86` | Limite e preço de vaga extra do plano RS lidos direto do plano | `pricing.ts` |
| `W:[tenant]/dashboard/management/notifications/page.tsx:301` | Desconto de suspensão `salary/30*dias` na tela (e `notifications.service.ts:353`) | Retorno do motor (pré-visualização via API) |
| Cotações de upgrade/seat nas telas `platform/financeiro/_views/*`, `faturas/_banco-plano.tsx` | Exibem `prorationAmount` vindo da API | OK (não calculam) |

### 4.5 Datas no fuso São Paulo

Referência correta: `W:lib/date.ts`, `W:lib/dashboard-day.ts`, `A:common/utils/date.utils.ts`, `pricing.ts:PRICING_TIME_ZONE`.
Violações no web (data do navegador ou UTC): `employees/page.tsx:23`, `management/payroll/page.tsx:30`, `employee-dashboard.tsx:20,42`, `contabilidade/_model.ts:72,141`, `dashboard/page.tsx:74,150`, `vacations/page.tsx:227` e `vacation-data.ts:48`, `jobs/metrics/page.tsx:31`, `platform/_hub/office-view.tsx:29`, `office-lists.tsx:62,115`, `rules-panel.tsx:17`, `management/seguranca/aso/_modals.tsx:47`, `settings/_hub/data-section.tsx:35`, `platform/proposals/new/page.tsx` (startDate `toISOString().split('T')[0]`).
Violações na API (UTC onde o dia é de negócio): `time-track.service.ts:166,173,541`, `time-closing.service.ts:890` (`dateKey`), `closing-compliance.ts:42`, `schedule-hub/calendar/day-resolver.ts:22`, `punch.service.ts:108`, `payroll.service.ts:12` (`fmtDay`), `management-documents.service.ts:516` (`dateKey(periodStart)` no nome do fechamento). Use `toSaoPauloDateKey`. Datas só-calendário (guardadas como meia-noite UTC) podem usar UTC; precisa revisão caso a caso: não confirmado qual das ocorrências ocasiona dia errado.

### 4.6 CPF/CNPJ

| Onde | Problema |
|---|---|
| Validadores: `A:modules/jobs/candidate-account.rules.ts:22`, `A:modules/employees/employees-import.service.ts:396`, `A:modules/auth/auth.service.ts:695-720`, `W:cadastro/page.tsx:29-45`, `W:ceo-onboarding/steps.ts:31` | Cinco implementações do dígito verificador. `A:common/company-document.ts` só normaliza, não valida |
| `A:modules/employees/dto/create-employee.dto.ts:18-20` e `update-employee.dto.ts:19` | `cpf?: string` sem validação: só a importação valida CPF (employees-import.service.ts:99). Cadastro manual aceita CPF inválido (não confirmado se há outra validação no front de `employees/new`) |
| Formatadores: `A:time-track/time-sheet-pdf.ts:66`, `privacy/terms-document.ts:40,45`, `finance/invoice-pdf.service.ts:51`, `schedule-hub/punch/punch-receipt-pdf.ts:27`, `management-documents.service.ts:503`, `common/pdf/pdf-report.ts:61`; `W:employees/page.tsx:257`, `carreiras/conta/perfil/profile-form.tsx:12-13`, `cadastro/page.tsx:25-27` | Máscaras repetidas |
| `A:modules/document-templates/document-templates.controller.ts:90-91` | `{{cpf}}` e `{{cnpj}}` entram crus (só dígitos) enquanto o PDF formata |
| Usar | Um módulo `documento` na API (`validateCpf/Cnpj`, `formatCpf/Cnpj`) e a cópia espelhada no web com teste de paridade |

### 4.7 Regras de permissão duplicadas

`ROLE_MANAGEMENT` em `A:modules/users/users.service.ts:56-66` e `A:common/constants/role-hierarchy.ts:3-14`, `canManageRole` em dois lugares (users.service.ts:481, role-hierarchy.ts:16). Matriz de Escalas espelhada em `A:modules/schedule/access/schedule-access.ts` e `W:lib/schedule-access.ts`; `recruiter-account` espelhado (`A:common/utils/recruiter-account.ts`, `W:lib/recruiter-account.ts`); `DEFAULT_PERMISSIONS` só existe no web (`W:lib/permissions.ts`) sem par na API para o conjunto não-faturas. O teste `tests/unit/web/permission-matrix.spec.ts` (passa) só garante "o front não oferece o que a API recusa", não o inverso. Por isso as divergências "API aceita, tela esconde" da seção 1 passam.

---

## 5. Telas e fluxos duplicados e recomendação

| Função | Onde está hoje | Fica | Sai |
|---|---|---|---|
| Folha do mês | `escalas?view=fechamento` (TimeClosing), `management/payroll` (Payroll), `contabilidade` (competência), holerite em `portal/holerites` | `TimeClosing` como fonte; `contabilidade` calcula/publica; `management/payroll` vira a visão do RH da competência liberada | Segundo montador `Payroll.build`; telas passam a ler o mesmo registro |
| Painel do funcionário | `dashboard` (EmployeeDashboard) e `/[tenant]/portal/*` | `dashboard` | `portal/` inteiro, trazendo `holerites` para o painel/Meu RH |
| Redirecionamentos legados | 25 `page.tsx` de redirect | Manter no `next.config.js` (já tem bloco de redirects) | Removê-los como páginas |
| Contabilidade da plataforma | `contabilidade/page.tsx` + `platform/_hub/accounting-view.tsx` (rotina) + `platform/_hub/accounting/competencia.tsx` | `contabilidade` | `competencia.tsx` se não houver importador fora de `accounting-view.tsx` (a verificar) |
| Propostas | `platform/clientes/propostas` (lista) + `platform/proposals/new|[id]` | Mover as duas para `clientes/propostas/novo|[id]` com gate de papel | Rotas `platform/proposals/*` soltas |
| Vagas internas | `/dashboard/jobs/internas` e `/carreiras/interna/[jobId]` | Um só (autenticado, no dashboard) | O outro (não confirmado se um aponta para o outro) |
| Faturas | `dashboard/faturas` (empresa), `[tenant]/fatura-pendente`, `platform/financeiro` | Faturas (empresa) e Financeiro (plataforma) | `fatura-pendente` se o layout já redireciona ADMIN para Faturas (layout.tsx:42-46) |
| Preço de plano | `/planos`, `/cadastro`, `faturas/_banco-plano`, `platform/financeiro` | Todas lendo cotação do servidor | Cálculo local |
| Edição de empresa | `settings/_hub/company-section.tsx` (empresa do tenant) e `platform/_components/company-edit-modal.tsx` (qualquer empresa) | Mesmo componente de formulário nos dois | Formulário duplicado (não confirmado o grau de duplicação) |
| Criar usuário/resetar senha | `users` (RH/ADMIN) e `platform/.../company-users-modal.tsx` (DEV) e `employees/new` ("criar acesso") | Rotas de acesso em `users`; modais chamam o mesmo serviço | Verificar chamadas duplicadas de API |
| WhatsApp | `dashboard/whatsapp` e `platform/whatsapp` (re-export) | `dashboard/whatsapp` | `platform/whatsapp` |
| Avisos disciplinares | Gestão > Comunicados (criar/PDF), `disciplinary-notice.tsx` (ciência), sem aba no funcionário | Ficha do funcionário (aba) + Comunicados | - |
| Mocks | `reports`, `performance`, `partners`, `clientes`, `parceiros` | Remover ou esconder por flag | As cinco páginas |

---

## 6. Lacunas das regras do dono

### 6.1 Funcionários

| Regra | Estado | Evidência |
|---|---|---|
| Desligar | CUMPRIDA em parte: "Desligar funcionário" muda o status e abre ASO demissional (`employees/page.tsx:117,190`; API `DELETE /employees/:id` -> `terminate`, employees.controller.ts:119-123; `api.ts:908`) | Não pede data nem tipo de desligamento (a tela diz "a data pode ser registrada em Editar cadastro", page.tsx:190) e NÃO calcula rescisão |
| Excluir/arquivar | CUMPRIDA: "Excluir ou arquivar" com confirmação por nome e impacto (`employees/page.tsx:118,201-211`; `DELETE /employees/:id/permanent`, controller.ts:113-117) |  |
| Rescisão | NÃO CUMPRIDA: o módulo existe na API (`payroll/termination.controller.ts`, `.calculator.ts`, `.pdf.ts`, `.service.ts`, controller `@Roles('DEV','ADMIN','RH')`) e NÃO tem nenhuma tela no web (nenhuma ocorrência de `termination`/"rescisão" em `W:`) | O botão Desligar não usa o cálculo |
| Aba Advertência | NÃO CUMPRIDA: o dossiê do funcionário (`EmployeeDossierDrawer`, employees/page.tsx:233-245) mostra cadastro, ASO, férias, batidas e impacto de exclusão; não lista notificações. Advertência existe apenas em Gestão > Comunicados (`management/notifications/page.tsx:83,103,167`) | `employees.controller.ts:51` (`dossier`) não traz notificações |
| Aba Suspensão | NÃO CUMPRIDA, mesmo caso. O lançamento no ponto/folha acontece em `notifications.service.ts:298-302` ao criar o aviso |
| Menu confunde | O item de menu se chama "Comunicados" (management/layout.tsx), não "Advertências e suspensões" |

### 6.2 Ponto -> Contabilidade e Gestão (sem redigitar)

Fluxo automático existente: batida (`schedule-hub/punch`) -> `time-track.service` (`calculateDaily...`, :219, :334, :672) grava `TimeTrack` -> `time-closing.generate` e `Payroll.build` leem `TimeTrack` -> `accounting-time-sheet.service.ts:46-131` agrega o espelho para o contador -> `accounting-period.calculate` gera `TimeClosing` e `Payroll`. Ou seja, a leitura é automática, mas:

1. `Payroll` (Gestão) e `TimeClosing` (Escalas/Contabilidade) calculam em motores de entrada diferentes (seção 4.1): não é "um número só".
2. A folha é um instantâneo em rascunho: nada recalcula quando o ponto muda (apenas ação manual `POST payroll/:id/recalculate`, payroll.controller.ts:45, ou "Gerar / recalcular" no fechamento, closing-view.tsx:98). Gatilho de ponto -> folha: não confirmado (nenhuma referência a payroll/closing em `time-track.service.ts`).
3. Há redigitação possível: lançamentos manuais (`ManualPayrollItemDto`, HE/noturno/faltas editáveis via `ADJUSTABLE_FIELDS`, accounting-period.service.ts:24) e `accounting.adjustClosing`. Os ajustes sobrevivem ao recálculo ("mantido no recálculo"), então um ajuste feito à mão pode esconder uma correção do ponto.
4. Suspensão grava no ponto por `upsert` e sobrescreve o dia (`notifications.service.ts:333-348`), mas não passa pelo `time-track.service`.
5. `accounting.controller.ts:19` restringe a DEV, CEO, CONTABIL: RH/ADMIN só veem a competência após publicação (`viewForCompany`, accounting-period.service.ts:109-114), sem espelho de ponto antes.

### 6.3 Erros da Gestão e PDFs (testados)

Gerados via `ManagementDocumentsService.createLegalNoticeFromNotification` (advertência, suspensão, suspensão com modelo). Texto extraído com `pdftotext`. Os specs existentes passam; os problemas abaixo são de conteúdo/regra.

PDFs de advertência/suspensão (`A:modules/management/management-documents.service.ts`):
1. O termo não qualifica o empregador (razão social, CNPJ e endereço) no corpo; só o cabeçalho traz razão social e CNPJ. O encaminhamento de ASO traz "Dados do empregador" (:300-306), o termo disciplinar não (:370-402). Também não há cidade/data de emissão por extenso nem bloco "Local e data".
2. Suspensão: o período sai apenas "3 dia(s)" (:395). Faltam data de início, data de fim e data de retorno, embora o cálculo exista (`data_inicio`/`data_fim` em `document-templates.controller.ts:93-94` e `suspensionStart` em `notifications.service.ts:218`).
3. Com modelo da empresa (`customBody`), o PDF imprime só o texto do modelo (:382-387): perde o "Motivo / fundamento" (`legalReason`) e o período de suspensão. Isso afeta toda suspensão com modelo (testado: "SUSPENSÃO MODELO" sem motivo, sem dias).
4. `customBody: extra.templateId ? true : false` (:156): basta escolher um modelo na lista, mesmo sem clicar em "Preencher com o modelo" (`notifications/page.tsx:269-276`), para o PDF imprimir só o campo "Detalhes" digitado, sem fundamento, motivo ou período.
5. `take: 1` em destinatários (:132): o PDF usa só o primeiro destinatário. Aviso com vários destinatários gera termo de um só.
6. Só aceita `WARNING_NOTICE` e `SUSPENSION_NOTICE` (:127). Comunicado (`SIMPLE_NOTICE`) e promoção não têm PDF, e a tela só mostra o botão "Baixar PDF Legal" para penalidades (notifications/page.tsx:138); o dono pediu PDF também para comunicados.
7. Cada download cria um novo `GeneratedDocument` (`storePdf` em :337,403 chamado a cada GET): nada reaproveita o termo emitido, e o hash/ID muda a cada baixada, o que enfraquece o valor probatório.
8. Assinaturas fixas "Testemunha 1/2" (:402) sem campo de local e data, sem espaço para recusa de assinatura (a tela registra "recusa" mas o PDF não mostra).
9. O logotipo da empresa sai como iniciais ("EL") no cabeçalho do PDF de teste quando `logoUrl` é nulo (conforme extração); comportamento de fallback do `PdfReport`, não confirmado se desejado.
10. `{{cpf}}`/`{{cnpj}}` do modelo vêm sem máscara (document-templates.controller.ts:90-91).

Regras de Gestão com erro ou risco:
11. `ASO referral` a partir do registro: `clinicAddress: record.observation` (:91) copia a observação para o endereço da clínica, e a observação também é impressa em "Observações" (:93, :332-334).
12. Suspensão começa na data da OCORRÊNCIA, que é passada (`extra.suspensionStart ?? occurrenceDate`, notifications.service.ts:218); o formulário diz "a partir da data da ocorrência" (notifications/page.tsx:248). Lança ausência retroativa e sobrescreve batidas já registradas (upsert, :333-348), sem checar fechamento/competência travados (não confirmado).
13. Desconto estimado `salary/30*dias` (notifications.service.ts:353; tela :301) ignora que os dias de descanso não são descontados (`workedDaysLost`); o motor desconta pelas faltas lançadas. Estimativa pode divergir do holerite.
14. `data_fim` do modelo é `início + dias - 1` corridos (document-templates.controller.ts:94), enquanto os dias lançados no ponto pulam dias de descanso (`applySuspension`). Datas do documento e do ponto não batem.
15. Filtro de status na lista usa só `recipients[0]` (notifications/page.tsx:127 `const recipientStatus = n.recipients?.[0]?.status`): comunicado para vários destinatários filtra errado.
16. Erro do PDF exibido com `window.alert` (notifications/page.tsx:69); sem toast padrão.
17. Penalidade criada não tem como ser anulada na tela; reverter os dias lançados no ponto: não confirmado.
18. Nome do arquivo de fechamento usa `toISOString().slice(0,7)` do início do período (UTC, :516): mês errado quando o início é 00:00 local; não confirmado.
19. Menu "Gestão" some para CEO e CONSULTA mesmo com API de ASO/SST liberada (seção 1).
20. `notifications/page.tsx` (rota `dashboard/notifications`) redireciona para `management?tab=notifications`, parâmetro que o layout de Gestão não usa (não confirmado).

---

## 7. Plano de correção em ondas

Cada onda tem até 4 frentes independentes (conjuntos de arquivos sem sobreposição). Critério de aceite entre parênteses.

### Onda 1: correções de risco alto, sem mudar contrato de dados

- Frente A, PDFs disciplinares: `A:modules/management/management-documents.service.ts`, `A:modules/management/dto/management-document.dto.ts`, `A:modules/document-templates/document-templates.controller.ts`, spec correspondente.
  - Bloco "Empregador" e "Local e data" no termo; início/fim/retorno da suspensão; `customBody` só quando o texto do modelo foi realmente aplicado; motivo e período preservados com modelo; todos os destinatários ou um PDF por destinatário; PDF para comunicado; reaproveitar documento já emitido; `clinicAddress` corrigido.
  - Aceite: spec por caso (advertência, suspensão, suspensão com modelo, multi-destinatário) extrai o texto do PDF e confirma cada campo; mesma notificação baixada duas vezes devolve o mesmo `X-Document-Id`.
- Frente B, Suspensão e ponto: `A:modules/notifications/notifications.service.ts` (+ spec), `A:modules/time-track/time-track.service.ts` (só o ponto de entrada para ajuste de suspensão).
  - Início da suspensão informado separadamente da ocorrência; bloquear em competência fechada; usar o ajuste do ponto em vez de `upsert` próprio; desconto pelo motor.
  - Aceite: suspensão em período travado retorna 409; os dias lançados batem com `data_fim` do documento e com o holerite do mês.
- Frente C, Permissões front: `W:lib/role-access.ts`, `nav-config.ts`, `settings/_hub/types.ts`, `W:lib/permissions.ts`, `tests/unit/web/permission-matrix.spec.ts`.
  - CEO e CONSULTA em Gestão (ASO), CEO em Usuários, RH_RS em Faturas e em Configuração da empresa por perfil; pedido de férias para GESTOR/FUNCIONARIO conforme a API; corrigir o comentário de `vacationRequest`; teste novo no sentido inverso (API aceita e a tela esconde).
  - Aceite: matriz gerada lista toda divergência e fica vazia; RH_RS abre Faturas e edita logo/CNPJ numa empresa MEI.
- Frente D, páginas mortas e legado: apagar `reports`, `performance`, `partners`, `clientes`, `parceiros`, `portal/{ferias,documentos,ponto}`, `platform/whatsapp`, `_components/{dashboard-router,dashboard-sidebar,dashboard-topbar,DashboardCharts,dashboard-home-cards}.tsx` + `role-dashboards/`, `platform/_hub/scope-picker.tsx`; mover os 25 redirects para `next.config.js` (ou mantê-los).
  - Aceite: `next build` sem importar arquivo removido; nenhum link interno aponta para as rotas removidas (grep).

### Onda 2: um único motor de folha

- Frente A, Montador único: criar `A:modules/time-track/payroll-input.builder.ts` a partir de `time-closing.service.ts:205-340`; `A:modules/payroll/payroll.service.ts` (`build`) e `time-closing.service.ts` passam a usá-lo.
  - Aceite: teste de paridade; para os mesmos funcionários e mês, `Payroll` e `TimeClosing` retornam bruto, INSS, IRRF, FGTS e líquido idênticos (com feriado, férias, admissão no meio do mês e falta sem batida).
- Frente B, Contabilidade e competência: `A:modules/payroll/accounting-period.service.ts`, `A:modules/accounting/accounting-hub.service.ts`, `A:modules/accounting/accounting-time-sheet.service.ts`.
  - `Payroll` derivado do `TimeClosing`; recálculo automático ao mudar ponto (evento ou marca "desatualizado"); ajuste manual visível ao lado do valor do ponto.
  - Aceite: editar uma batida de mês aberto marca a folha como desatualizada e a recalcula em um clique, sem redigitar nada.
- Frente C, Datas e horas: `A:common/utils/date.utils.ts`, novo `A:common/utils/time.ts` (`parseHm`, `formatHm`), trocar nos arquivos de 4.3 e 4.5 da API.
  - Aceite: teste com relógio simulado às 22h–02h (fuso) confirma o dia de negócio em `time-track`, fechamento e punch.
- Frente D, Totais e formatação no web: `W:lib/format.ts`, `W:lib/date.ts`, `contabilidade/_model.ts`, `management/payroll/*`, `escalas/_components/closing-view.tsx`, `platform/_hub/accounting/*`, `dashboard/page.tsx`, `employee-dashboard.tsx`.
  - Aceite: nenhum `reduce` de valores monetários de folha no web; um só `formatMinutes`.

### Onda 3: painéis por perfil e funcionários

- Frente A, Painéis: `W:[tenant]/dashboard/page.tsx` dividido em um componente por perfil (`_dashboards/*`), `A:modules/dashboard/*` com endpoints por perfil (FUNCIONARIO, GESTOR, CONTABIL, COMERCIAL, CEO, DEV).
  - Aceite: cada perfil abre um painel com dados reais (e vazio tratado), sem consultas que retornariam 403.
- Frente B, Funcionários: `W:[tenant]/dashboard/employees/page.tsx` (dossiê), `A:modules/employees/employees.controller.ts` e `.service.ts` (dossiê com notificações), novo componente `employees/_components/discipline-tabs.tsx`, tela de Rescisão ligada a `payroll/termination.*`.
  - Aceite: abas Advertência e Suspensão no dossiê (criar, ver, baixar PDF, status de ciência); "Desligar" pede data/tipo e mostra a rescisão calculada; excluir/arquivar mantido.
- Frente C, Configuração: `W:[tenant]/dashboard/settings/**`, `A:modules/companies/*`.
  - Seletor de empresa para DEV; seção de regras para CONTABIL; RH restrito a conta/usuários e ADMIN a empresa (decisão do dono); RH_RS (MEI) com logo, CNPJ e Faturas independentemente de módulos.
  - Aceite: tabela da seção 3 sem "NÃO" ou "PARCIAL".
- Frente D, Preço e documentos: `W:(public)/planos/page.tsx`, `W:cadastro/page.tsx`, `A:modules/finance/platform-finance.service.ts`, `A:modules/finance/pricing.ts`, `A:modules/jobs/jobs.repository.ts`, módulo único de CPF/CNPJ e uso nos arquivos de 4.6.
  - Aceite: nenhum cálculo de preço fora de `pricing.ts`; um único validador de CPF/CNPJ testado e usado na API e (por espelho) no web; `create-employee.dto.ts` rejeita CPF inválido.

### Onda 4: consolidação de telas

- Frente A: unificar o fluxo de propostas (`platform/proposals/*` -> `clientes/propostas/*`) e as telas de contabilidade (`platform/_hub/accounting/*`).
- Frente B: unificar vagas internas e `portal/` -> dashboard do funcionário (holerites, férias, documentos).
- Frente C: unificar formulários de empresa (hub x modal da plataforma) e de acesso/usuário.
- Frente D: matriz única de permissões (gerar o espelho do web a partir da API) e `ROLE_MANAGEMENT` único.
  - Aceite geral: nenhuma função em dois lugares na tabela da seção 5; `permission-matrix` verde nos dois sentidos.

---

## 8. Resumo (10 problemas mais graves)

1. Dois montadores de folha (`payroll.service.ts:146` x `time-closing.service.ts:205`) dão números diferentes para o mesmo mês.
2. Painéis de CONTABIL e COMERCIAL são placeholders; CEO, DEV, GESTOR e FUNCIONARIO usam painel genérico.
3. Sem abas de Advertência e Suspensão no funcionário; rescisão existe na API e não tem tela.
4. PDF disciplinar sem empregador/datas; com modelo perde motivo e período; só o primeiro destinatário.
5. Suspensão retroativa sobrescreve ponto e desconta fora do motor.
6. RH_RS sem Faturas, e logo/CNPJ dependentes de módulo.
7. Folha não recalcula quando o ponto muda.
8. Preço calculado no front e em `platform-finance.service.ts`, fora de `pricing.ts`.
9. Cinco validadores de CPF/CNPJ; cadastro manual aceita CPF inválido.
10. Oito páginas mortas e rotas sem gate abertas a qualquer perfil.
