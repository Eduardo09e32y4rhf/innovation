# 01a - Inventario de rotas HTTP (escopo 01a)

Gerado por `docs/auditoria/scripts/extrair-rotas.mjs` (AST do TypeScript) sobre `apps/api/src`, somente leitura. CSV: `docs/auditoria/01a-endpoints.csv` (separador `;`, UTF-8 com BOM). Base completa (todos os 73 controllers, 618 rotas): `docs/auditoria/scripts/01a-rotas-todas.json`.

## Resumo

- Rotas no escopo 01a: **281** (de 618 em toda a API, 73 controllers).
- Publicas (sem JwtAuthGuard): **19**; so login (JwtAuthGuard sem @Roles): **20**; com @Roles: **242**, das quais sem RolesGuard (restricao NAO aplicada): **0**.
- Modulos `mail` e `queue` nao possuem controller (so servicos/workers Bull): 0 rotas. Nao existe `app.controller`; os controllers fora de `modules/` sao `health` e `metrics`.

### Contagem por modulo

| Modulo | Rotas | Publicas | So login | Com @Roles | Mutacoes (POST/PUT/PATCH/DELETE) |
|---|---:|---:|---:|---:|---:|
| auth | 23 | 11 | 10 | 2 | 18 |
| users | 20 | 0 | 0 | 20 | 14 |
| companies | 4 | 0 | 1 | 3 | 2 |
| platform | 23 | 0 | 0 | 23 | 13 |
| platform-hub | 2 | 0 | 0 | 2 | 0 |
| platform-audit | 2 | 0 | 0 | 2 | 0 |
| finance | 83 | 2 | 1 | 80 | 47 |
| coupons | 5 | 0 | 0 | 5 | 4 |
| support | 27 | 2 | 0 | 25 | 20 |
| accounting | 43 | 0 | 0 | 43 | 24 |
| payroll | 23 | 0 | 0 | 23 | 16 |
| privacy | 9 | 0 | 0 | 9 | 3 |
| mail | 0 | 0 | 0 | 0 | 0 |
| notifications | 9 | 0 | 8 | 1 | 6 |
| lookup | 2 | 0 | 0 | 2 | 0 |
| queue | 0 | 0 | 0 | 0 | 0 |
| welcome | 2 | 0 | 0 | 2 | 1 |
| metrics | 1 | 1 | 0 | 0 | 0 |
| health | 3 | 3 | 0 | 0 | 0 |
| **Total** | **281** | **19** | **20** | **242** | **168** |

Rotas por controller (escopo):

`metrics/MetricsController` 1 · `health/HealthController` 3 · `accounting/AccountingPayrollController` 8 · `accounting/AccountingController` 35 · `auth/AuthController` 23 · `companies/CompaniesController` 4 · `coupons/CouponsController` 5 · `finance/AsaasWebhookController` 1 · `finance/CompanyBillingController` 7 · `finance/FaturasPermissoesController` 4 · `finance/FaturasController` 46 · `finance/FinanceController` 20 · `finance/IntegrationsController` 2 · `finance/MercadoPagoWebhookController` 1 · `finance/ReconciliationController` 2 · `lookup/LookupController` 2 · `notifications/NotificationsController` 9 · `payroll/DeductionRulesController` 4 · `payroll/PayrollPeriodsController` 4 · `payroll/PayrollController` 10 · `payroll/TerminationController` 5 · `platform-audit/PlatformAuditController` 2 · `platform-hub/PlatformHubController` 2 · `platform/GlobalPermissionsController` 2 · `platform/PlatformPlansController` 6 · `platform/PlatformController` 15 · `privacy/DataSubjectController` 4 · `privacy/PrivacyController` 5 · `support/PlatformSupportController` 13 · `support/PublicSupportController` 2 · `support/SupportController` 12 · `users/UsersController` 20 · `welcome/WelcomeController` 2

## Premissas de roteamento e erros

- `main.ts`: sem `setGlobalPrefix` e sem `enableVersioning`; caminho final = prefixo do `@Controller` + rota. `/metrics` vem de `PrometheusModule.register({ controller: MetricsController })` (`app.module.ts:72`, path padrao `/metrics`). Swagger em `/api/docs` so fora de producao (nao e rota de controller).
- Pipes globais (`main.ts`): `ValidationPipe({ whitelist, transform, forbidNonWhitelisted })` => DTO invalido = 400; campo sem nenhum decorator class-validator e rejeitado (400) mesmo enviado de proposito; tipos que nao sao classe (interface, `any`, `Record`, `import type`) NAO sao validados.
- Guards globais (`app.module.ts:135-139`): FeatureFlagGuard, UserThrottlerGuard (300 req/60s, chave por email/documento do corpo, token ou IP), MfaEnrollmentGuard, TenantGuard, SubscriptionActiveGuard. **JwtAuthGuard e RolesGuard NAO sao globais**: so protege quem declara `@UseGuards(JwtAuthGuard[, RolesGuard])`. `@Roles` sem `RolesGuard` nao restringe nada. Sem `@Roles` o `RolesGuard` libera qualquer logado.
- Formato de sucesso (`ResponseInterceptor`): `{ success: true, data }` (exceto `/metrics`; `PlainJsonInterceptor` nas rotas /faturas).
- Formato de erro (`HttpExceptionFilter`): `{ success:false, statusCode, path, timestamp, error:{ message, code?, ... } }`. Mapeamentos: 429 -> `TOO_MANY_ATTEMPTS`; Prisma P2002 -> 409 `DUPLICATE`, P2025 -> 404 `NOT_FOUND`, P2003 -> 409 `RELATION`, P2034 -> 409, P2000 -> 400 `TOO_LONG`, P2023 -> 400 `INVALID_ID`, PrismaClientValidationError -> 400; queda do banco (P1001/P1002/P1008/P1017/P2024, init error) -> 503 `DB_UNAVAILABLE`; erros Fastify 4xx (413 corpo grande, 415, JSON invalido 400) mantidos; qualquer outra excecao (inclusive `throw new Error`) -> **500** com `requestId`.
- Colunas do CSV: `erros` = codigos explicitos (handler + servicos seguidos + guards) + 401 (JwtAuthGuard), 403 (RolesGuard com @Roles), 400 (DTO/pipe), 429 (salvo @SkipThrottle) e `500*`; codigos com `*` sao inferidos do filtro global (Prisma create/update/delete no caminho) e `500*` e o generico do filtro. A origem exata de cada codigo esta em `observacao` (`origem:`). O throttle e a localizacao (arquivo:linha) tambem ficam em `observacao`.

## Rotas PUBLICAS (sem JwtAuthGuard) - 19

| Modulo | Metodo | Caminho | Handler | Arquivo | Throttle | Protecao propria |
|---|---|---|---|---|---|---|
| metrics | GET | `/metrics` | index | `common/metrics/metrics.controller.ts:9` | global 300/60s | Bearer METRICS_TOKEN (timingSafeEqual); em producao sem token configurado responde 401; fora de producao e sem METRICS_TOKEN fica ABERTO |
| health | GET | `/health/live` | live | `health/health.controller.ts:15` | global 300/60s | nenhuma (liveness, sem dados) |
| health | GET | `/health/ready` | ready | `health/health.controller.ts:22` | global 300/60s | nenhuma (readiness; 503 se banco cair) |
| health | GET | `/health` | check | `health/health.controller.ts:31` | global 300/60s | nenhuma; expõe uptime, memoria heap e status de banco/redis |
| auth | GET | `/auth/public-plans` | publicPlans | `modules/auth/auth.controller.ts:38` | 60/60s | nenhuma (catalogo publico) |
| auth | POST | `/auth/public-plans/quote` | quotePublicPlan | `modules/auth/auth.controller.ts:44` | 30/60s | nenhuma (simulacao) |
| auth | POST | `/auth/register-company` | registerCompany | `modules/auth/auth.controller.ts:50` | 3/1800s | Turnstile (so se TURNSTILE_SECRET_KEY existir) |
| auth | POST | `/auth/login` | login | `modules/auth/auth.controller.ts:57` | 5/900s | Turnstile (idem) + senha/MFA |
| auth | POST | `/auth/mfa/verify` | verifyMfa | `modules/auth/auth.controller.ts:65` | 5/300s | mfaToken (JWT do desafio) no corpo + codigo TOTP/recuperacao |
| auth | POST | `/auth/refresh` | refresh | `modules/auth/auth.controller.ts:72` | 30/60s | cookie httpOnly irh_rt |
| auth | POST | `/auth/logout` | logout | `modules/auth/auth.controller.ts:83` | global 300/60s | cookie irh_rt (sem cookie apenas limpa) |
| auth | POST | `/auth/verify-email` | verifyEmail | `modules/auth/auth.controller.ts:90` | 10/600s | JWT de verificacao (purpose email) no corpo |
| auth | POST | `/auth/password-reset/request` | requestPasswordReset | `modules/auth/auth.controller.ts:149` | 5/1800s | Turnstile + honeypot `website` |
| auth | POST | `/auth/password-reset/validate-code` | validateResetCode | `modules/auth/auth.controller.ts:159` | 5/300s | codigo enviado por e-mail |
| auth | POST | `/auth/password-reset/confirm` | resetPassword | `modules/auth/auth.controller.ts:165` | 5/300s | JWT de redefinicao (emitido apos validate-code) |
| finance | POST | `/finance/webhook/asaas` | handleAsaasWebhook | `modules/finance/asaas-webhook.controller.ts:26` | SKIP | header asaas-access-token (timingSafeEqual com ASAAS_WEBHOOK_TOKEN); rejeita 403 se nao configurado |
| finance | POST | `/finance/webhook/mercadopago` | handle | `modules/finance/mercadopago-webhook.controller.ts:31` | SKIP | header x-signature (HMAC) + reconsulta do pagamento na API do MP |
| support | POST | `/support/public/tickets` | createTicket | `modules/support/public-support.controller.ts:17` | 5/60s | somente honeypot `website` + throttle 5/min; SEM Turnstile |
| support | POST | `/support/public/password-reset` | requestPasswordReset | `modules/support/public-support.controller.ts:70` | 5/60s | somente honeypot `website` + throttle 5/min; SEM Turnstile |

## Rotas sem @Roles (qualquer usuario logado) - 20

So `JwtAuthGuard` (ou permissao por decorator proprio). A autorizacao real, quando existe, esta no servico (coluna "Checagem em servico" = funcoes assert/require/check encontradas no caminho).

| Modulo | Metodo | Caminho | Handler | Arquivo | Acesso | Checagem em servico |
|---|---|---|---|---|---|---|
| auth | POST | `/auth/resend-verification` | resendVerification | `modules/auth/auth.controller.ts:96` | LOGADO | - |
| auth | GET | `/auth/sessions` | sessions | `modules/auth/auth.controller.ts:103` | LOGADO | - |
| auth | POST | `/auth/sessions/revoke-others` | revokeOthers | `modules/auth/auth.controller.ts:109` | LOGADO | - |
| auth | DELETE | `/auth/sessions/:id` | revokeSession | `modules/auth/auth.controller.ts:115` | LOGADO | - |
| auth | GET | `/auth/mfa/status` | mfaStatus | `modules/auth/auth.controller.ts:121` | LOGADO | - |
| auth | POST | `/auth/mfa/setup` | mfaSetup | `modules/auth/auth.controller.ts:127` | LOGADO | - |
| auth | POST | `/auth/mfa/enable` | mfaEnable | `modules/auth/auth.controller.ts:134` | LOGADO | - |
| auth | POST | `/auth/mfa/disable` | mfaDisable | `modules/auth/auth.controller.ts:141` | LOGADO | - |
| auth | POST | `/auth/change-password` | changePassword | `modules/auth/auth.controller.ts:171` | LOGADO | - |
| auth | GET | `/auth/me` | me | `modules/auth/auth.controller.ts:205` | LOGADO | canAccessCompany |
| companies | GET | `/companies/me` | me | `modules/companies/companies.controller.ts:17` | LOGADO | - |
| finance | GET | `/faturas/permissoes/minhas` | mine | `modules/finance/faturas-permissoes.controller.ts:28` | LOGADO | - |
| notifications | GET | `/notifications` | list | `modules/notifications/notifications.controller.ts:16` | LOGADO | - |
| notifications | GET | `/notifications/unread-count` | unreadCount | `modules/notifications/notifications.controller.ts:21` | LOGADO | - |
| notifications | PATCH | `/notifications/:id/read` | markAsRead | `modules/notifications/notifications.controller.ts:26` | LOGADO | - |
| notifications | PATCH | `/notifications/read-all` | markAllAsRead | `modules/notifications/notifications.controller.ts:31` | LOGADO | - |
| notifications | PATCH | `/notifications/:id/archive` | archive | `modules/notifications/notifications.controller.ts:36` | LOGADO | - |
| notifications | DELETE | `/notifications/:id` | delete | `modules/notifications/notifications.controller.ts:41` | LOGADO | - |
| notifications | PATCH | `/notifications/:id/respond` | respond | `modules/notifications/notifications.controller.ts:54` | LOGADO | - |
| notifications | GET | `/notifications/dashboard-widget` | dashboardWidget | `modules/notifications/notifications.controller.ts:59` | LOGADO | - |

## Rotas que mudam dados com corpo sem DTO validado - 3

Corpo tipado como interface/`any`/`Record`/inline/`import type`/array, classe sem validadores, `@Body('campo')` solto ou `req.body` direto: o `ValidationPipe` nao valida (ou, para classe com propriedades sem decorator, rejeita o campo).

| Metodo | Caminho | Handler | Arquivo | Problema |
|---|---|---|---|---|
| POST | `/finance/webhook/asaas` | handleAsaasWebhook | `modules/finance/asaas-webhook.controller.ts:26` | AsaasWebhookPayload [interface(sem-validacao)] |
| POST | `/finance/webhook/mercadopago` | handle | `modules/finance/mercadopago-webhook.controller.ts:31` | MercadoPagoNotification [interface(sem-validacao)] |
| PATCH | `/platform/support/tickets/:id/priority` | updatePriority | `modules/support/platform-support.controller.ts:89` | campo solto 'priority' [campo-solto] |

### Mutacoes com DTO parcialmente validado (propriedades so com @IsOptional, aceitam qualquer tipo) - 5

A propriedade passa no whitelist, mas o `ValidationPipe` nao confere tipo/limite; a validacao, se existir, esta no servico/controller.

- POST `/deduction-rules` `modules/payroll/deduction-rules.controller.ts:44`: DeductionRuleDto [props-so-IsOptional(2): value/maxAmount]
- PATCH `/deduction-rules/:id` `modules/payroll/deduction-rules.controller.ts:52`: DeductionRuleDto [props-so-IsOptional(2): value/maxAmount]
- POST `/platform/plans` `modules/platform/plans.controller.ts:20`: PlanPayloadDto [props-so-IsOptional(4): price/discountPercent/baseMonthlyPrice/userMonthlyPrice]
- PATCH `/platform/plans/:id` `modules/platform/plans.controller.ts:32`: PlanPayloadDto [props-so-IsOptional(4): price/discountPercent/baseMonthlyPrice/userMonthlyPrice]
- PATCH `/platform/companies/:id` `modules/platform/platform.controller.ts:102`: UpdatePlatformCompanyDto [props-so-IsOptional(1): activeModules]

### Query sem DTO validado (todos os verbos) - 14

| Metodo | Caminho | Arquivo | Problema |
|---|---|---|---|
| GET | `/accounting/rules` | `modules/accounting/accounting.controller.ts:69` | campo solto 'date' [campo-solto] |
| GET | `/accounting/office/tasks` | `modules/accounting/accounting.controller.ts:153` | campo solto 'status' [campo-solto]; campo solto 'companyId' [campo-solto]; campo solto 'assigneeId' [campo-solto] |
| GET | `/accounting/office/docs` | `modules/accounting/accounting.controller.ts:173` | campo solto 'month' [campo-solto]; campo solto 'companyId' [campo-solto]; campo solto 'status' [campo-solto] |
| GET | `/auth/password-reset/employees` | `modules/auth/auth.controller.ts:176` | campo solto 'search' [campo-solto] |
| GET | `/faturas/empresa/seats/quote` | `modules/finance/faturas.controller.ts:111` | campo solto 'seatQuantity' [campo-solto] |
| GET | `/faturas/plataforma/reembolsos` | `modules/finance/faturas.controller.ts:203` | campo solto 'status' [campo-solto] |
| GET | `/faturas/plataforma/companies/:companyId/seats/quote` | `modules/finance/faturas.controller.ts:260` | campo solto 'seatQuantity' [campo-solto] |
| GET | `/finance/fiscal-adjustments` | `modules/finance/finance.controller.ts:91` | campo solto 'companyId' [campo-solto] |
| GET | `/finance/integrations/health` | `modules/finance/integrations.controller.ts:23` | campo solto 'test' [campo-solto] |
| POST | `/finance/webhook/mercadopago` | `modules/finance/mercadopago-webhook.controller.ts:31` | campo solto 'data.id' [campo-solto]; campo solto 'type' [campo-solto] |
| GET | `/payroll` | `modules/payroll/payroll.controller.ts:18` | campo solto 'from' [campo-solto]; campo solto 'to' [campo-solto]; campo solto 'year' [campo-solto]; campo solto 'month' [campo-solto]; campo solto 'status' [campo-solto] |
| GET | `/payroll/thirteenth/:employeeId` | `modules/payroll/termination.controller.ts:54` | campo solto 'year' [campo-solto] |
| GET | `/platform/companies` | `modules/platform/platform.controller.ts:24` | campo solto 'page' [campo-solto]; campo solto 'limit' [campo-solto]; campo solto 'search' [campo-solto]; campo solto 'status' [campo-solto]; campo solto 'billingStatus' [campo-solto] |
| GET | `/platform/companies/:id/audit-logs` | `modules/platform/platform.controller.ts:84` | campo solto 'page' [campo-solto]; campo solto 'limit' [campo-solto] |

### DTOs com propriedades SEM nenhum decorator class-validator (rejeitadas por whitelist+forbidNonWhitelisted, 400) - 0 rotas


## Rotas sensiveis sem throttling proprio - 11

Sensiveis = login/cadastro/senha/MFA/verificacao/webhook/upload/publicas (nao-GET). "global" = apenas o limite de 300 req/60s do `UserThrottlerGuard`; "SKIP" = sem nenhum limite.

| Metodo | Caminho | Handler | Arquivo | Throttle atual | Acesso |
|---|---|---|---|---|---|
| POST | `/auth/password-reset/employee` | adminResetEmployeePassword | `modules/auth/auth.controller.ts:189` | global 300/60s | ROLES:ADMIN,RH,DEV |
| POST | `/finance/webhook/asaas` | handleAsaasWebhook | `modules/finance/asaas-webhook.controller.ts:26` | SKIP | PUBLICO |
| POST | `/finance/company/checkout` | checkout | `modules/finance/company-billing.controller.ts:35` | global 300/60s | ROLES:ADMIN,DEV |
| POST | `/faturas/empresa/checkout` | checkout | `modules/finance/faturas.controller.ts:57` | global 300/60s | ROLES:DEV,CEO,CONTABIL,COMERCIAL,ADMIN,RH,GESTOR,FUNCIONARIO,CONSULTA+RequireFaturasPermission('faturas.pagar') |
| POST | `/finance/platform/companies/:companyId/checkout` | companyCheckout | `modules/finance/finance.controller.ts:85` | global 300/60s | ROLES:DEV |
| POST | `/finance/platform/webhook-events/:id/retry` | retryWebhookEvent | `modules/finance/finance.controller.ts:202` | global 300/60s | ROLES:DEV |
| POST | `/finance/webhook/mercadopago` | handle | `modules/finance/mercadopago-webhook.controller.ts:31` | SKIP | PUBLICO |
| POST | `/legal/terms/accept` | accept | `modules/privacy/privacy.controller.ts:33` | global 300/60s | ROLES:DEV,CEO,CONTABIL,COMERCIAL,ADMIN,RH,RH_RS,GESTOR,FUNCIONARIO,CONSULTA |
| POST | `/support/tickets/:id/attachments` | uploadAttachment | `modules/support/support.controller.ts:87` | global 300/60s | ROLES:DEV,CEO,CONTABIL,COMERCIAL,ADMIN,RH,GESTOR,FUNCIONARIO,CONSULTA |
| POST | `/users/:id/reset-password` | resetPassword | `modules/users/users.controller.ts:96` | global 300/60s | ROLES:DEV,ADMIN,RH |
| POST | `/users/:id/mfa/reset` | resetMfa | `modules/users/users.controller.ts:156` | global 300/60s | ROLES:DEV |

### Rotas com @SkipThrottle - 2

- POST `/finance/webhook/asaas` `modules/finance/asaas-webhook.controller.ts:26` (PUBLICO)
- POST `/finance/webhook/mercadopago` `modules/finance/mercadopago-webhook.controller.ts:31` (PUBLICO)

### Publicas sem @Throttle proprio (so limite global) - 7

- GET `/metrics` `common/metrics/metrics.controller.ts:9` -> global 300/60s
- GET `/health/live` `health/health.controller.ts:15` -> global 300/60s
- GET `/health/ready` `health/health.controller.ts:22` -> global 300/60s
- GET `/health` `health/health.controller.ts:31` -> global 300/60s
- POST `/auth/logout` `modules/auth/auth.controller.ts:83` -> global 300/60s
- POST `/finance/webhook/asaas` `modules/finance/asaas-webhook.controller.ts:26` -> SKIP
- POST `/finance/webhook/mercadopago` `modules/finance/mercadopago-webhook.controller.ts:31` -> SKIP

## Inconsistencias

### Status code / verbo (toda a API; marcado [escopo] quando no escopo 01a)

**POST de leitura/acao sem HttpCode (devolve 201)** - 18
- [escopo] POST `/accounting/companies/:companyId/periods/:month/calculate` `modules/accounting/accounting.controller.ts:52` (calculatePeriod)
- [escopo] POST `/accounting/rules/simulate` `modules/accounting/accounting.controller.ts:85` (simulate)
- POST `/ai/platform/company/:id/summary` `modules/ai/ai.controller.ts:33` (getCompanySummary)
- POST `/ai/platform/company/:id/risk` `modules/ai/ai.controller.ts:60` (getCompanyRisk)
- POST `/ai/platform/assistant` `modules/ai/ai.controller.ts:81` (queryAssistant)
- [escopo] POST `/auth/public-plans/quote` `modules/auth/auth.controller.ts:44` (quotePublicPlan)
- [escopo] POST `/auth/login` `modules/auth/auth.controller.ts:57` (login)
- [escopo] POST `/auth/mfa/verify` `modules/auth/auth.controller.ts:65` (verifyMfa)
- [escopo] POST `/auth/logout` `modules/auth/auth.controller.ts:83` (logout)
- [escopo] POST `/auth/verify-email` `modules/auth/auth.controller.ts:90` (verifyEmail)
- [escopo] POST `/auth/sessions/revoke-others` `modules/auth/auth.controller.ts:109` (revokeOthers)
- [escopo] POST `/auth/password-reset/validate-code` `modules/auth/auth.controller.ts:159` (validateResetCode)
- POST `/employees/import/validate` `modules/employees/employees-import.controller.ts:36` (validate)
- [escopo] POST `/finance/company/checkout` `modules/finance/company-billing.controller.ts:35` (checkout)
- [escopo] POST `/faturas/empresa/checkout` `modules/finance/faturas.controller.ts:57` (checkout)
- [escopo] POST `/payroll/termination/simulate` `modules/payroll/termination.controller.ts:18` (simulate)
- POST `/escalas/requests/preview` `modules/schedule-hub/requests/requests.controller.ts:20` (preview)
- POST `/schedules/assign/preview` `modules/schedule/schedule.controller.ts:95` (previewAssignment)

**GET com escrita no banco** - 24
- GET `/employees/:id/documents/point-sheet.pdf` `modules/employees/employees.controller.ts:56` (escreve em: this.prisma.generatedDocument.create modules/documents/document.service.ts:76)
- GET `/employees/:id/documents/occurrences.pdf` `modules/employees/employees.controller.ts:68` (escreve em: this.prisma.generatedDocument.create modules/documents/document.service.ts:76)
- GET `/employees/:id/documents/record.pdf` `modules/employees/employees.controller.ts:80` (escreve em: this.prisma.generatedDocument.create modules/documents/document.service.ts:76)
- [escopo] GET `/finance/company/status` `modules/finance/company-billing.controller.ts:20` (escreve em: this.prisma.platformInvoice.update modules/finance/platform-finance.service.ts:596; this.prisma.company.update modules/finance/platform-finance.service.ts:597)
- [escopo] GET `/faturas/empresa/status` `modules/finance/faturas.controller.ts:45` (escreve em: this.prisma.platformInvoice.update modules/finance/platform-finance.service.ts:596; this.prisma.company.update modules/finance/platform-finance.service.ts:597)
- [escopo] GET `/finance/platform/reports/monthly` `modules/finance/finance.controller.ts:46` (escreve em: this.prisma.platformInvoice.update modules/finance/platform-revenue-report.service.ts:73)
- [escopo] GET `/finance/platform/reports/monthly.csv` `modules/finance/finance.controller.ts:52` (escreve em: this.prisma.platformInvoice.update modules/finance/platform-revenue-report.service.ts:73)
- GET `/public/recruitment/offer/:token` `modules/jobs/candidate-actions.controller.ts:214` (escreve em: this.prisma.jobOffer.update modules/jobs/job-offer.service.ts:194)
- GET `/jobs/documents/:documentId/download` `modules/jobs/recruitment-documents.controller.ts:54` (escreve em: this.prisma.auditLog.create modules/jobs/recruitment-documents.service.ts:234)
- GET `/jobs/pipeline` `modules/jobs/recruitment.controller.ts:34` (escreve em: this.prisma.hiringPipeline.create modules/jobs/recruitment.service.ts:68)
- GET `/jobs/:jobId/applications/export` `modules/jobs/recruitment.controller.ts:189` (escreve em: this.prisma.hiringPipeline.create modules/jobs/recruitment.service.ts:68; this.prisma.application.updateMany modules/jobs/recruitment.service.ts:154)
- GET `/jobs/:jobId/applications` `modules/jobs/recruitment.controller.ts:204` (escreve em: this.prisma.hiringPipeline.create modules/jobs/recruitment.service.ts:68; this.prisma.application.updateMany modules/jobs/recruitment.service.ts:154)
- GET `/talent-pool/:id/resume` `modules/jobs/talent-pool.controller.ts:32` (escreve em: this.prisma.candidateProfileView.create modules/jobs/talent-pool.service.ts:93)
- GET `/management/documents/aso/:id/referral` `modules/management/management-documents.controller.ts:16` (escreve em: this.prisma.generatedDocument.create modules/documents/document.service.ts:76; this.prisma.generatedDocument.update modules/management/management-documents.service.ts:438)
- GET `/management/documents/notifications/:id/legal-notice` `modules/management/management-documents.controller.ts:40` (escreve em: this.prisma.generatedDocument.create modules/documents/document.service.ts:76; this.prisma.generatedDocument.update modules/management/management-documents.service.ts:438)
- GET `/management/documents/closings/:id` `modules/management/management-documents.controller.ts:64` (escreve em: this.prisma.generatedDocument.create modules/documents/document.service.ts:76; this.prisma.generatedDocument.update modules/management/management-documents.service.ts:438)
- [escopo] GET `/payroll/termination/:employeeId/trct.pdf` `modules/payroll/termination.controller.ts:38` (escreve em: this.prisma.generatedDocument.create modules/payroll/termination.service.ts:264; this.prisma.terminationRecord.update modules/payroll/termination.service.ts:276)
- [escopo] GET `/privacy/me/export` `modules/privacy/data-subject.controller.ts:23` (escreve em: this.prisma.auditLog.create modules/privacy/data-subject.service.ts:131)
- [escopo] GET `/privacy/employees/:id/export` `modules/privacy/data-subject.controller.ts:36` (escreve em: this.prisma.auditLog.create modules/privacy/data-subject.service.ts:131)
- [escopo] GET `/legal/terms/download/:userId` `modules/privacy/privacy.controller.ts:38` (escreve em: this.prisma.privacyConsent.update modules/privacy/privacy.repository.ts:77; this.prisma.generatedDocument.update modules/privacy/privacy.repository.ts:88)
- GET `/promotions` `modules/promotions/promotions.controller.ts:30` (escreve em: this.prisma.employee.update modules/promotions/promotions.service.ts:94; this.prisma.employeePromotion.update modules/promotions/promotions.service.ts:95)
- GET `/schedules` `modules/schedule/schedule.controller.ts:37` (escreve em: prisma.schedule.createMany modules/schedule/default-schedules.ts:60)
- GET `/time-closing/collective/pdf` `modules/time-track/time-closing.controller.ts:48` (escreve em: this.prisma.timeTrack.updateMany modules/time-track/time-track.repository.ts:293; this.prisma.timeOccurrence.deleteMany modules/time-track/time-track.service.ts:753)
- GET `/vacations/:id/receipt.pdf` `modules/vacations/vacations.controller.ts:72` (escreve em: this.prisma.generatedDocument.create modules/vacations/vacations.repository.ts:83)

**API do Express sobre Fastify (TypeError -> 500)** - 7
- [escopo] GET `/finance/platform/reports/monthly.csv` `modules/finance/finance.controller.ts:52` (res.setHeader())
- POST `/escalas/launch/attachment` `modules/schedule-hub/hub.controller.ts:150` (FileInterceptor (multer))
- GET `/escalas/launch/attachments/:id` `modules/schedule-hub/hub.controller.ts:157` (stream.pipe(reply))
- GET `/escalas/punch/receipt/:receipt/pdf` `modules/schedule-hub/punch/punch.controller.ts:24` (res.set(), res.end())
- [escopo] POST `/support/tickets/:id/attachments` `modules/support/support.controller.ts:87` (FileInterceptor (multer))
- [escopo] GET `/support/tickets/:id/attachments/:attachmentId/download` `modules/support/support.controller.ts:98` (res.set(), stream.pipe(res))
- GET `/vacations/:id/receipt.pdf` `modules/vacations/vacations.controller.ts:72` (response.setHeader())

### Rotas duplicadas (mesmo verbo + caminho, parametros normalizados) - 0

Nenhuma.


### Controllers sem nenhum JwtAuthGuard (100% publicos) e controllers mistos

**Sem guard em nenhuma rota:**

- [escopo] `common/metrics/metrics.controller.ts` (1 rotas): GET /metrics
- [escopo] `health/health.controller.ts` (3 rotas): GET /health/live, GET /health/ready, GET /health
- [escopo] `modules/finance/asaas-webhook.controller.ts` (1 rotas): POST /finance/webhook/asaas
- [escopo] `modules/finance/mercadopago-webhook.controller.ts` (1 rotas): POST /finance/webhook/mercadopago
- `modules/jobs/candidate-account.controller.ts` (14 rotas): POST /candidate-portal/auth/register, POST /candidate-portal/auth/login, POST /candidate-portal/auth/forgot-password, POST /candidate-portal/auth/reset-password, POST /candidate-portal/auth/logout, GET /candidate-portal/me, GET /candidate-portal/cep/:cep, PUT /candidate-portal/me, PUT /candidate-portal/me/resume, DELETE /candidate-portal/me, GET /candidate-portal/applications, GET /candidate-portal/invites, POST /candidate-portal/invites/:inviteId/decline, POST /candidate-portal/jobs/:jobId/apply
- `modules/jobs/public-candidate-documents.controller.ts` (2 rotas): GET /public/candidate-documents/:token, POST /public/candidate-documents/:token/upload
- `modules/jobs/public-jobs.controller.ts` (4 rotas): GET /public/jobs, GET /public/jobs/company/:companyKey, GET /public/jobs/:jobId, POST /public/jobs/:jobId/apply
- [escopo] `modules/support/public-support.controller.ts` (2 rotas): POST /support/public/tickets, POST /support/public/password-reset

**Mistos (rotas publicas no meio de rotas protegidas):**

- `modules/analytics/analytics.controller.ts`: 1 publicas de 3 -> POST /public/visits
- [escopo] `modules/auth/auth.controller.ts`: 11 publicas de 23 -> GET /auth/public-plans, POST /auth/public-plans/quote, POST /auth/register-company, POST /auth/login, POST /auth/mfa/verify, POST /auth/refresh, POST /auth/logout, POST /auth/verify-email, POST /auth/password-reset/request, POST /auth/password-reset/validate-code, POST /auth/password-reset/confirm
- `modules/jobs/candidate-actions.controller.ts`: 9 publicas de 25 -> GET /public/recruitment/interview/:token, POST /public/recruitment/interview/:token, GET /public/recruitment/slots/:token, POST /public/recruitment/slots/:token, GET /public/recruitment/offer/:token, POST /public/recruitment/offer/:token, GET /public/recruitment/assessment/:token, POST /public/recruitment/assessment/:token/start, POST /public/recruitment/assessment/:token/submit
- `modules/jobs/internal-jobs.controller.ts`: 2 publicas de 5 -> GET /public/internal-jobs/:jobId, POST /public/internal-jobs/:jobId/apply
- `modules/jobs/recruitment-privacy.controller.ts`: 2 publicas de 7 -> GET /public/candidate-status/:token, POST /public/candidate-requests

### Handlers que podem estourar 500 por `throw new Error` (sem HttpException) - 11

- POST `/auth/mfa/verify` `modules/auth/auth.controller.ts:65`
- POST `/auth/mfa/enable` `modules/auth/auth.controller.ts:134`
- POST `/auth/mfa/disable` `modules/auth/auth.controller.ts:141`
- POST `/finance/webhook/asaas` `modules/finance/asaas-webhook.controller.ts:26`
- GET `/faturas/empresa/invoices/:id/pdf` `modules/finance/faturas.controller.ts:83`
- GET `/faturas/plataforma/invoices/:id/pdf` `modules/finance/faturas.controller.ts:162`
- POST `/finance/webhook/mercadopago` `modules/finance/mercadopago-webhook.controller.ts:31`
- POST `/payroll/termination/simulate` `modules/payroll/termination.controller.ts:18`
- POST `/payroll/termination/:employeeId/finalize` `modules/payroll/termination.controller.ts:23`
- GET `/payroll/thirteenth/:employeeId` `modules/payroll/termination.controller.ts:54`
- POST `/users/:id/temporary-password/reveal` `modules/users/users.controller.ts:103`

### Mutacoes cujo handler/servico direto tem try/catch que NAO relanca (erro engolido: o cliente recebe 2xx mesmo com falha) - 13

Candidatas: confira se o catch so faz log de efeito colateral (ok) ou esconde falha da operacao principal (problema).

- POST `/auth/register-company` `modules/auth/auth.controller.ts:50` -> catch em `modules/auth/auth.service.ts:201`, `modules/auth/auth.service.ts:214`
- POST `/finance/webhook/asaas` `modules/finance/asaas-webhook.controller.ts:26` -> catch em `modules/finance/asaas-webhook.controller.ts:40`
- POST `/finance/company/change-plan` `modules/finance/company-billing.controller.ts:40` -> catch em `modules/finance/platform-finance.service.ts:871`, `modules/finance/platform-finance.service.ts:887`, `modules/finance/platform-finance.service.ts:915`
- POST `/faturas/plataforma/companies/:companyId/free-days` `modules/finance/faturas.controller.ts:254` -> catch em `modules/finance/faturas-acoes.service.ts:230`
- POST `/faturas/plataforma/companies/:companyId/coupon` `modules/finance/faturas.controller.ts:316` -> catch em `modules/finance/faturas-acoes.service.ts:230`
- POST `/finance/reconciliation/run` `modules/finance/reconciliation.controller.ts:18` -> catch em `modules/finance/payment-reconciliation.service.ts:82`
- PATCH `/notifications/:id/read` `modules/notifications/notifications.controller.ts:26` -> catch em `modules/notifications/notifications.service.ts:112`
- PATCH `/notifications/read-all` `modules/notifications/notifications.controller.ts:31` -> catch em `modules/notifications/notifications.service.ts:131`
- PATCH `/notifications/:id/archive` `modules/notifications/notifications.controller.ts:36` -> catch em `modules/notifications/notifications.service.ts:143`
- DELETE `/notifications/:id` `modules/notifications/notifications.controller.ts:41` -> catch em `modules/notifications/notifications.service.ts:162`
- POST `/payroll/termination/:employeeId/finalize` `modules/payroll/termination.controller.ts:23` -> catch em `modules/payroll/termination.service.ts:214`
- POST `/platform/companies` `modules/platform/platform.controller.ts:97` -> catch em `modules/platform/platform.service.ts:149`
- POST `/legal/terms/accept` `modules/privacy/privacy.controller.ts:33` -> catch em `modules/privacy/privacy.service.ts:120`, `modules/privacy/privacy.service.ts:131`, `modules/privacy/privacy.service.ts:152`

### GET com :param sem 404 explicito no caminho do handler (candidatos a devolver 200 com dado vazio) - 6

Heuristica: nenhum `NotFoundException`/`HttpException(404)` encontrado seguindo o servico. Conferir se a rota devolve lista (filtro) ou recurso unico.

- GET `/faturas/plataforma/companies/:companyId/invoices` `modules/finance/faturas.controller.ts:156`
- GET `/finance/platform/companies/:companyId/invoices` `modules/finance/finance.controller.ts:66`
- GET `/platform/receita/:cnpj` `modules/platform/platform.controller.ts:132`
- GET `/legal/terms/download/:userId` `modules/privacy/privacy.controller.ts:38`
- GET `/legal/job/:jobId/status` `modules/privacy/privacy.controller.ts:50`
- GET `/support/tickets/:id/attachments/:attachmentId/download` `modules/support/support.controller.ts:98`

### Mutacoes com :param sem nenhuma excecao explicita e sem try/catch no caminho (dependem so do filtro global/Prisma) - 1

- DELETE `/platform/plans/:id` `modules/platform/plans.controller.ts:40` (401,403,429,500*,400*,404*)

## Achados confirmados lendo o codigo (revisao manual)

Itens abaixo foram conferidos linha a linha; os marcados "reproduzido" foram executados em um app Nest 11 + Fastify minimo, montado com as mesmas dependencias do repositorio (`node_modules` do projeto, `@fastify/multipart` registrado como em `main.ts`). Nada em `apps/` foi alterado.

### Severidade alta

1. **Download de CSV da receita da plataforma responde 500 (reproduzido).** `GET /finance/platform/reports/monthly.csv` (`modules/finance/finance.controller.ts:52-58`) usa `res.setHeader(...)` e `res.send(...)` com o tipo `import('express').Response`, mas o app roda com `FastifyAdapter`; `FastifyReply` nao tem `setHeader` -> `TypeError: res.setHeader is not a function` -> 500. O front chama essa rota (`apps/web/app/lib/api.ts:1183`). O teste unitario (`platform-revenue-report.spec.ts:180`) passa porque simula um `res` estilo Express. Correcao: `res.header(...)` + `res.send(...)` ou retornar `StreamableFile`.
2. **Upload de anexo de chamado responde 500 (reproduzido).** `POST /support/tickets/:id/attachments` (`modules/support/support.controller.ts:87-93`) usa `FileInterceptor` (multer, Express) sob Fastify: `TypeError: req.on is not a function`. O padrao que funciona no repo e `req.file()` do `@fastify/multipart` (`employees/employees-import.controller.ts:58`).
3. **Download de anexo de chamado responde 500 (reproduzido).** `GET /support/tickets/:id/attachments/:attachmentId/download` (`support.controller.ts:98-115`): `res.set({...})` inexistente no `FastifyReply` + `stream.pipe(res)` (o reply nao e um Writable). Correcao: `res.header(...)` e `return res.send(stream)`.
4. Mesmo defeito fora do escopo 01a, detectado pelo script (secao "API do Express sobre Fastify"): `escalas/launch/attachment` (`schedule-hub/hub.controller.ts:150`), `escalas/launch/attachments/:id` (`:157`, `stream.pipe(reply)`), `escalas/punch/receipt/:receipt/pdf` (`schedule-hub/punch/punch.controller.ts:24-28`) e `vacations/:id/receipt.pdf` (`vacations/vacations.controller.ts:72-85`, `response.setHeader`). O item 1 e o `vacations` sao novos em relacao a `docs/auditoria/05-seguranca-e-frameworks.md` (A1).

### Severidade media

5. **IP de auditoria/consentimento forjavel.** O app configura `trustProxy` e `request.ip` e confiavel (comentario em `auth.controller.ts`), mas quatro lugares preferem cabecalhos que o cliente controla: `modules/privacy/privacy.controller.ts:57-69` (IP gravado como evidencia do aceite de termos em `POST /legal/terms/accept`, `:33`), `modules/users/users.controller.ts:15-19` (`cf-connecting-ip`/`x-real-ip`/`x-forwarded-for`, usado na auditoria de criar/bloquear/cancelar/reset de usuario), `common/interceptors/audit.interceptor.ts:81-84` (trilha de auditoria geral) e `common/guards/rate-limit.guard.ts:74-85` (limite de batida de ponto por IP; so afeta as 2 rotas de ponto fora do escopo). Qualquer usuario autenticado pode escrever o IP que quiser na trilha.
6. **Throttle por e-mail do corpo permite contornar o limite nas rotas publicas.** `common/guards/user-throttler.guard.ts:12-18` usa `email:<corpo>` como chave quando existe `body.email`. Em `POST /support/public/tickets` e `POST /support/public/password-reset` (`support/public-support.controller.ts:16,69`, limite 5/min) basta variar o e-mail para ter um balde novo a cada requisicao: criacao ilimitada de chamados anonimos (spam/negacao de servico no suporte). Essas duas rotas tambem nao usam `TurnstileGuard` (so honeypot `website`), ao contrario de `/auth/register-company`, `/auth/login` e `/auth/password-reset/request`. Em `/auth/login` o mesmo desenho significa limite por conta (5/15 min) e nenhum limite por IP: um atacante testa uma senha em muitas contas sem bater no limite (mitigacao: Turnstile, quando `TURNSTILE_SECRET_KEY` esta definida, e bloqueio por conta `lockedUntil`).
7. **`ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }])` sem `storage`** (`app.module.ts:88`): contadores em memoria do processo. Com mais de uma instancia, o limite efetivo e multiplicado; reinicio zera. O Redis ja existe no projeto (`RateLimitGuard` o usa).
8. **Webhooks com `@SkipThrottle()` de classe** (`finance/asaas-webhook.controller.ts:16`, `finance/mercadopago-webhook.controller.ts:19`): nenhum limite contra tentativa de adivinhar o token/assinatura. Ambos falham fechado (403 se o segredo nao esta configurado; comparacao em tempo constante), entao o risco e baixo, mas um limite generoso por IP (ex.: 600/min) manteria o retry do provedor e cortaria abuso. O corpo dos dois e tipado por `interface` (nao validado pelo `ValidationPipe`); a autenticidade vem do token/HMAC, e o Mercado Pago reconsulta o pagamento na API antes de agir.
9. **GET que muda estado.** `GET /finance/company/status` (`finance/company-billing.controller.ts:20`) e `GET /faturas/empresa/status` (`finance/faturas.controller.ts:45`) executam o "polling fallback" de `PlatformFinanceService.getCompanyBilling` (`platform-finance.service.ts:590-606`): ao ler o status, se o Asaas informa pagamento, a fatura vira `PAID` e a empresa `ACTIVE` (e cobrancas redundantes sao canceladas). Tambem gravam em GET: `GET /finance/platform/reports/monthly(.csv)` (backfill de `gatewayNetValue`, `platform-revenue-report.service.ts:73`), `GET /payroll/termination/:employeeId/trct.pdf` (cria `generatedDocument`, `termination.service.ts:264`), `GET /legal/terms/download/:userId` (cacheia o PDF, `privacy.repository.ts:77-90`) e `GET /privacy/me/export` / `/privacy/employees/:id/export` (gravam `auditLog`, `data-subject.service.ts:131`; legitimo). Efeitos: repeticao/prefetch/cache de GET dispara transicao de cobranca; difícil de auditar.
10. **Erros engolidos devolvem 2xx.** `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/archive` e `DELETE /notifications/:id` (`notifications.service.ts:112,131,143,162`) envolvem tudo em `try/catch` com `safeLog` e nunca relancam: falha de banco ou id inexistente responde 200 `{success:true}`. `POST /payroll/termination/:employeeId/finalize` (`termination.service.ts:214`) e `POST /legal/terms/accept` (`privacy.service.ts:120,131,152`) tambem tem catch que nao relanca (conferir se so protege efeitos colaterais).
11. **Rotas de consulta externa sem throttle proprio**: `GET /lookup/cep/:cep` (`lookup/lookup.controller.ts:65`), `GET /lookup/cnpj/:cnpj` (`:70`, ate 2 chamadas de 8 s a BrasilAPI/CNPJ.ws) e `GET /platform/receita/:cnpj` (`platform/platform.controller.ts:132`). Exigem login, mas qualquer papel listado pode gastar a cota de terceiros e prender workers; so valem os 300 req/min globais.

### Severidade baixa / consistencia

12. **Estado dependente de parametro vira codigo de erro "falso"** no analisador: `POST /users/:id/cancel` e `DELETE /users/:id` (`users.controller.ts:150,89`) chamam `changeAccess(..., 'CANCEL')`; o 409 `SEAT_LIMIT_REACHED` (`users.service.ts:241`) so existe no ramo `UNBLOCK`. O CSV lista 409 nessas duas rotas (e em `/block`); na pratica so `/unblock` o devolve. Conhecido, nao corrigido no script.
13. **`DELETE /users/:id` nao exclui**: faz cancelamento de acesso (`users.service.ts:387-390`, resposta `{deleted:true, deactivated:true, canceled:true}`); a exclusao real e `DELETE /users/:id/permanent`. Nome do verbo promete mais do que a rota faz.
14. **`@Param` sem `ParseUUIDPipe`**: 74 das 281 rotas do escopo (coluna `observacao`: "param sem pipe"). Um id invalido chega ao Prisma e o filtro global converte P2023 em 400 `INVALID_ID`, entao nao ha 500, mas a validacao esta na camada errada e a mensagem e generica. Ex.: `DELETE /users/:id` (`users.controller.ts:89`), `POST /platform/ghost-mode/:companyId`, `DELETE /platform/plans/:id`.
15. **Corpo/consulta sem DTO de classe**: `PATCH /platform/support/tickets/:id/priority` usa `@Body('priority') priority` cru (`support/platform-support.controller.ts:89-96`): valor invalido sobe ao Prisma (`PrismaClientValidationError` -> 400 generico, mas e DEV-only). 14 consultas usam `@Query('campo')` solto (listadas acima); as de `GET /payroll` (`from`, `to`, `year`, `month`, `status`) e `GET /platform/companies` (`page`, `limit`...) dependem de validacao manual no servico.
16. **DTOs "so @IsOptional"** (aceitam qualquer tipo, validacao no servico): `DeductionRuleDto.value/maxAmount`, `PlanPayloadDto.price/discountPercent/baseMonthlyPrice/userMonthlyPrice` (usam `Transform` + `normalizePlanPayload`), `UpdatePlatformCompanyDto.activeModules` (`PATCH /platform/companies/:id`, `platform.controller.ts:102`; vale conferir se o servico filtra modulos desconhecidos).
17. **Resposta fora do envelope padrao**: `GET /legal/terms/download/:userId` devolve `reply.status(404).send({ success:false, message })` (`privacy.controller.ts:40`) em vez de lancar `NotFoundException` (formato `{success,statusCode,path,timestamp,error}`). `POST /support/public/*` devolve `{ success:true, ... }` dentro de `data` (duplo envelope).
18. **Metodo/status**: `POST /auth/login`, `/auth/mfa/verify`, `/auth/refresh`, `/auth/logout`, `/auth/verify-email`, `/auth/password-reset/validate-code`, `/auth/public-plans/quote` e as simulacoes (`/accounting/rules/simulate`, `/payroll/termination/simulate`) devolvem 201 (padrao do Nest para POST) embora nao criem recurso; o `/auth/login` devolve 201 tambem quando responde o desafio MFA (`{ mfaRequired: true }`, `auth.service.ts:276`). `POST /privacy/me/erasure-request` usa 202 (coerente). `GET /health*` fixa `@HttpCode(200)` (redundante). Nenhuma rota do escopo usa 204.
19. **Observabilidade publica**: `GET /health` expoe uptime, heap em MB e estado do Redis a qualquer um (`health/health.controller.ts:31-48`); `GET /metrics` fica aberto se `METRICS_TOKEN` nao estiver definido e `NODE_ENV !== 'production'` (`common/metrics/metrics.controller.ts:13-19`; em producao sem token responde 401).
20. **`FaturasController` tem `@Roles` com os 9 perfis** e delega a decisao ao `FaturasPermissionGuard` (`common/permissions/require-faturas-permission.ts`); conferido: as 46 rotas tem `@RequireFaturasPermission`. O guard libera (`return true`) quando a rota nao tem a permissao, entao uma rota nova sem o decorator ficaria aberta a qualquer perfil logado.
21. O caminho `/api/finance/webhook/asaas` exibido em `GET /finance/integrations/health` (`payment-provider.service.ts:56,63`) tem prefixo `/api`; o app nao define prefixo global (`main.ts`). O prefixo so existe se o proxy reverso o remove: confirmar no ingress para que o webhook cadastrado no Asaas/MP aponte para a rota real `/finance/webhook/{asaas,mercadopago}`.

## Validacao do extrator (amostragem manual)

Metodo: tres amostras sistematicas das 281 rotas do escopo (a cada 9a rota, deslocamentos 4, 7 e 1), 31 + 31 + 32 = **94 rotas**, mais ~12 rotas lidas a parte (login, refresh, mfa/verify, webhooks, health, metrics, suporte publico, verify-email, validate-code, lookup, termos). Para cada uma, abri o controller e os servicos e conferi: metodo/caminho/handler, acesso (`@UseGuards`/`@Roles`), guards, DTO, status de sucesso, throttle e, para erros, cada codigo contra o `throw` citado em `origem:` e procurei omissoes lendo o servico.

| Verificacao | Resultado |
|---|---|
| Enumeracao de rotas | 618 rotas / 73 controllers. `grep` dos decorators acha 613: a diferenca (5) e `jobs/job-workflow.controller.ts`, com decorators na mesma linha do metodo (11 rotas, conferido a mao). Acerto 618/618 |
| Metodo, caminho, handler, acesso, guards, DTO, sucesso, throttle | 94/94 corretos na versao final |
| Erros (conjunto de codigos explicitos por rota) | 92/94 rotas exatas na versao final; 2 falsos positivos (item 12) |
| Primeira versao do script (amostra 4, 31 rotas) | 22/31 = 71%. Defeitos achados e corrigidos: `(+status manual)` falso (leitura de `response.status` como chamada), 403 do `RolesGuard` mesmo sem `@Roles`, erros de chamadas dentro de `try/catch` que nao relanca (provedores Asaas/MP), `@Query('x', ParseUUIDPipe)` tratado como "campo solto", ausencia de 400 inferido para `:id` sem pipe, `@IsOptional` sem outro validador tratado como "sem decorator" |
| Versao final, amostra 7 (31 rotas) | 29/31 = 93,5% (as 2 falhas sao o item 12) |
| Versao final, amostra 1 (32 rotas, nao usada para ajustar) | 32/32 = 100% |
| Versao final, total | **92/94 = 97,9%** rotas totalmente corretas; ressalva: as amostras 4 e 7 orientaram correcoes, so a amostra 1 e independente |

Limites conhecidos do extrator (nao cobertos pela amostra): (a) excecoes lancadas por chamadas dinamicas (`moduleRef.get`, callbacks passados como argumento, listeners de evento) nao sao seguidas, entao a coluna `erros` e um minimo confiavel, nao um maximo; (b) ramos dependentes do valor de parametro (item 12) viram codigo possivel; (c) codigos com `*` (409/404/400 do Prisma) sao inferidos do filtro global e podem nao ocorrer na pratica; (d) `try/catch` cujo `catch` chama funcao que relanca (sem `throw` literal) e tratado como "engolido"; (e) os guards globais (Feature flag, Tenant, Subscription, MFA) nao entram em `erros` por rota: o `TenantGuard`/`SubscriptionActiveGuard` podem devolver 403 `COMPANY_BILLING_BLOCKED`/`COMPANY_ACCESS_TEMPORARILY_UNAVAILABLE` e o `JwtAuthGuard` 403 `CEO_ONBOARDING_REQUIRED` em qualquer rota autenticada.

Reproducao: `node docs/auditoria/scripts/extrair-rotas.mjs` (usa o `typescript` do `node_modules` da raiz; regenera CSV, JSON e este arquivo, anexando estas notas).

