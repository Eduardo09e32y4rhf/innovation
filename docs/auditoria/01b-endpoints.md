# 01b - Inventario de endpoints HTTP (modulos B)

Gerado por `docs/auditoria/scripts/extrair-rotas-b.mjs` (TypeScript compiler API, somente leitura). Dados completos: `docs/auditoria/01b-endpoints.csv` (separador `;`, UTF-8 com BOM). Apoio: `docs/auditoria/scripts/01b-notas.json`.

## 1. Escopo e metodo

- Total no codigo: 618 decorators de rota em `apps/api/src` (73 arquivos com `@Controller`). Esta entrega cobre **340 rotas em 20 modulos** (as 278 restantes sao do outro agente: auth, users, companies, platform*, finance, coupons, support, accounting, payroll, privacy, mail, notifications, lookup, welcome, metrics). Conferencia: contagem por `grep` dos decorators nos mesmos modulos = 337 + 3 (health) = 340, igual ao extrator.
- Sem prefixo global nem versionamento: `main.ts` nao chama `setGlobalPrefix` nem `enableVersioning`; o caminho final = prefixo do `@Controller` + caminho do metodo.
- Os modulos `holidays`, `people-management` e `documents` **nao tem controller** (so service/module). Documentos do colaborador ficam em `employees` (`employee-documents`); templates em `document-templates`. `common/metrics` e do outro agente.
- Cadeia global (app.module.ts:131-139, main.ts:93-104): interceptors Sanitize, Audit, Metrics, NoCache, ClassSerializer, Response; guards globais FeatureFlag (404 de modulo congelado, roda primeiro), UserThrottler (300 req/60s), MfaEnrollment, Tenant (le o JWT sozinho; 401 sem empresa, 403 empresa suspensa/cancelada), SubscriptionActive (402 fatura vencida); ValidationPipe `whitelist + transform + forbidNonWhitelisted` (400 em portugues); filtro `HttpExceptionFilter` (Prisma P2002->409, P2025->404, P2003->409, P2000/P2023->400, banco fora->503, 429 padronizado).
- Coluna `acesso`: `PUBLICO` = sem `JwtAuthGuard` e sem guard proprio; `token/guard proprio` = `CandidateAuthGuard` ou `TurnstileGuard`; `Roles: ...` = lista efetiva (metodo sobrescreve classe, como `getAllAndOverride`; `rolesWith('cap')`/constantes foram expandidos pela matriz `SCHEDULE_ACCESS`; DEV sempre passa no `RolesGuard`); `qualquer logado` = JWT sem `@Roles`.
- Coluna `erros`: uniao de (a) excecoes `new XxxException`/`HttpException` alcancaveis a partir do handler, seguindo `this.m()`, `this.servico.m()` e funcoes livres ate 4 niveis; (b) erros de guard: 401/402/403 em rotas com JWT, 400 com DTO de corpo/`ParseUUIDPipe`/query DTO, 429 (limite global 300/min sempre vale), 404 se `RequiresFeature`. E **aproximacao por cima**: 402/403/429 aparecem por guard global mesmo que o handler nunca os lance. `500*` = ha `new Error(...)` generico alcancavel (vira 500; 32 rotas).
- Sucesso: `@HttpCode` se houver, senao 201 para POST e 200 para os demais; `(stream)` = resposta por `@Res()` (PDF/arquivo).

## 2. Contagem por modulo

| Modulo | Rotas | GET | POST | PUT | PATCH | DELETE | Publicas | Token proprio | Congelado (FEATURE_*) |
|---|---|---|---|---|---|---|---|---|---|
| jobs | 118 | 52 | 43 | 13 | 3 | 7 | 18 | 15 | - |
| time-track | 42 | 18 | 11 | 6 | 5 | 2 | 0 | 0 | - |
| schedule-hub | 34 | 17 | 13 | 2 | 0 | 2 | 0 | 0 | - |
| management | 25 | 14 | 6 | 0 | 2 | 3 | 0 | 0 | - |
| employees | 20 | 9 | 7 | 0 | 1 | 3 | 0 | 0 | - |
| schedule | 16 | 8 | 5 | 0 | 2 | 1 | 0 | 0 | - |
| communication | 15 | 9 | 4 | 0 | 2 | 0 | 0 | 0 | sim |
| vacations | 11 | 6 | 3 | 0 | 2 | 0 | 0 | 0 | - |
| manual-contracts | 9 | 5 | 1 | 0 | 2 | 1 | 0 | 0 | sim |
| ceo-onboarding | 8 | 4 | 3 | 0 | 1 | 0 | 0 | 0 | sim |
| ai | 7 | 1 | 6 | 0 | 0 | 0 | 0 | 0 | sim |
| onboarding | 6 | 3 | 1 | 0 | 1 | 1 | 0 | 0 | - |
| proposals | 6 | 3 | 3 | 0 | 0 | 0 | 0 | 0 | sim |
| document-templates | 5 | 1 | 2 | 0 | 1 | 1 | 0 | 0 | - |
| promotions | 5 | 2 | 2 | 1 | 0 | 0 | 0 | 0 | sim |
| analytics | 3 | 2 | 1 | 0 | 0 | 0 | 1 | 0 | - |
| commercial-sales | 3 | 1 | 1 | 0 | 1 | 0 | 0 | 0 | sim |
| health | 3 | 3 | 0 | 0 | 0 | 0 | 3 | 0 | - |
| dashboard | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | - |
| partners | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | sim |
| **Total** | **340** | 161 | 113 | 22 | 23 | 21 | 22 | 15 | 55 rotas |

Acesso: Roles=302, publico=22, token/guard proprio=15, logado sem Roles=1. Sucesso: 200=211, 200 stream=21, 201=105, 201 stream=2, 202=1. 84 rotas passam tambem por `ModuleGuard` (`RequireModule('recruitment')`, plano da empresa). 25 rotas sao so-DEV.

## 3. Rotas publicas e com guard proprio (37)

| Metodo | Caminho | Protecao | Observacao |
|---|---|---|---|
| POST | `/public/visits` | nenhuma | Throttle 20/60s |
| GET | `/health` | nenhuma |  |
| GET | `/health/live` | nenhuma |  |
| GET | `/health/ready` | nenhuma |  |
| GET | `/candidate-portal/applications` | CandidateAuthGuard |  |
| POST | `/candidate-portal/auth/forgot-password` | TurnstileGuard | Throttle 5/60s |
| POST | `/candidate-portal/auth/login` | TurnstileGuard | Throttle 10/60s |
| POST | `/candidate-portal/auth/logout` | CandidateAuthGuard |  |
| POST | `/candidate-portal/auth/register` | TurnstileGuard | Throttle 5/60s |
| POST | `/candidate-portal/auth/reset-password` | nenhuma | Throttle 10/60s |
| GET | `/candidate-portal/cep/:cep` | CandidateAuthGuard | Throttle 20/60s |
| GET | `/candidate-portal/invites` | CandidateAuthGuard |  |
| POST | `/candidate-portal/invites/:inviteId/decline` | CandidateAuthGuard |  |
| POST | `/candidate-portal/jobs/:jobId/apply` | CandidateAuthGuard | Throttle 5/60s |
| DELETE | `/candidate-portal/me` | CandidateAuthGuard |  |
| GET | `/candidate-portal/me` | CandidateAuthGuard |  |
| PUT | `/candidate-portal/me` | CandidateAuthGuard |  |
| PUT | `/candidate-portal/me/resume` | CandidateAuthGuard | Throttle 10/60s |
| GET | `/public/candidate-documents/:token` | nenhuma | Throttle 30/60s |
| POST | `/public/candidate-documents/:token/upload` | nenhuma | Throttle 10/60s |
| POST | `/public/candidate-requests` | nenhuma | Throttle 5/60s |
| GET | `/public/candidate-status/:token` | nenhuma | Throttle 30/60s |
| GET | `/public/internal-jobs/:jobId` | nenhuma | Throttle 30/60s |
| POST | `/public/internal-jobs/:jobId/apply` | TurnstileGuard | Throttle 5/60s |
| GET | `/public/jobs` | nenhuma |  |
| GET | `/public/jobs/:jobId` | nenhuma |  |
| POST | `/public/jobs/:jobId/apply` | TurnstileGuard | Throttle 5/60s |
| GET | `/public/jobs/company/:companyKey` | nenhuma |  |
| GET | `/public/recruitment/assessment/:token` | nenhuma | Throttle 30/60s |
| POST | `/public/recruitment/assessment/:token/start` | nenhuma | Throttle 10/60s |
| POST | `/public/recruitment/assessment/:token/submit` | nenhuma | Throttle 10/60s |
| GET | `/public/recruitment/interview/:token` | nenhuma | Throttle 30/60s |
| POST | `/public/recruitment/interview/:token` | nenhuma | Throttle 10/60s |
| GET | `/public/recruitment/offer/:token` | nenhuma | Throttle 30/60s |
| POST | `/public/recruitment/offer/:token` | nenhuma | Throttle 10/60s |
| GET | `/public/recruitment/slots/:token` | nenhuma | Throttle 30/60s |
| POST | `/public/recruitment/slots/:token` | nenhuma | Throttle 10/60s |

Observacoes: `TurnstileGuard` esta em edicao por outro agente (captcha) e nao foi auditado. As 7 rotas `/public/recruitment/*` e `candidate-*` usam token na URL; `/public/jobs*` (3 GET) e `/health*` nao tem `@Throttle` proprio (valem so os 300/min globais por IP).

### 3.1 Tokens do recrutamento: expiracao e limite de tentativas

| Fluxo | Token | Expira? | Armazenamento | Limite de tentativas |
|---|---|---|---|---|
| Entrevista (`/public/recruitment/interview/:token`) | `responseToken`, 24 bytes base64url (192 bits), `recruitment-tokens.ts:4` | **Nao tem validade propria**: so bloqueia depois de `scheduledAt` (interview-followup.service.ts:54-62, 88-91) ou processo encerrado | texto puro no banco | so `@Throttle` 30/min (GET) e 10/min (POST) |
| Horarios (`slots/:token`) | 192 bits | Sim, `expiresAt` (<= 14 dias e no maximo o ultimo horario), 410 depois (interview-followup.service.ts:182,253) | texto puro | idem |
| Proposta (`offer/:token`) | 192 bits | Sim, `expiresAt`; 410 expirada; resposta atomica (`claimed.count`) (job-offer.service.ts:204-211) | texto puro | idem |
| Teste (`assessment/:token`) | 192 bits | Sim, `expiresAt`; status EXPIRED; 410 (assessments.service.ts:103-139) | texto puro | idem |
| Acompanhar candidatura (`candidate-status/:token`) | `trackingToken`, 20 bytes hex (160 bits) (recruitment-privacy.service.ts:47) | **Nao expira** (vale ate anonimizar a candidatura) | texto puro | `@Throttle` 30/min |
| Documentos admissionais (`candidate-documents/:token`) | `generateAccessToken` | Sim, 14 dias, revogavel (`revokedAt`) (recruitment-documents.service.ts:49,176-184) | **somente hash** | `@Throttle` 30/10 por min |
| Area do candidato (`/candidate-portal/*`) | sessao Bearer com hash e `SESSION_TTL_DAYS`; codigo de e-mail de 6 digitos | Sim (sessao e codigo `LOGIN_CODE_TTL_MINUTES`) | hash | Sim, por conta: `LOGIN_MAX_FAILURES` com bloqueio `lockedUntil`, `LOGIN_CODE_MAX_ATTEMPTS` por codigo (candidate-account.service.ts:68-73,106-109) |

Conclusao: nenhum fluxo de token por link tem contador de falhas por token; o limite e por rota e por tracker. Com 160-192 bits a forca bruta e inviavel, entao o risco real e baixo; o risco de "link sem validade" e de token em texto puro (entrevista e acompanhamento) e de governanca/LGPD, nao de adivinhacao. O unico fluxo com tentativas curtas (codigo de 6 digitos) tem contador e bloqueio.

## 4. Achados

Severidade: A = corrigir antes de producao, M = media, B = baixa/observacao.

1. **A - Perfis de leitura gravam em `management/aso`.** Classe com `@Roles('DEV','ADMIN','RH','GESTOR','CEO','CONSULTA')` (`aso.controller.ts:11-13`) e os metodos de escrita nao restringem: `POST /management/aso` (:56), `PATCH /management/aso/:id` (:61), `DELETE /management/aso/:id` (:66), `POST|DELETE /management/aso/clinic-presets` (:39,:44). `CONSULTA` (somente leitura) e `GESTOR` conseguem criar, alterar e apagar ASO (dado de saude). O proprio `sst.controller.ts` restringe `complete` a DEV/ADMIN/RH, o que confirma a intencao. As outras 3 rotas do tipo (`POST /escalas/punch`, `POST /time-track/register`, `POST /internal-jobs/:jobId/apply`) sao autoatendimento legitimo.
2. **M - Corpo sem validacao (interface/tipo em vez de classe).** `POST /proposals` e `POST /proposals/:id/accept-terms` usam `interface CreateProposalDto/AcceptTermsDto` (`proposals.service.ts:9,21`; controller `proposals.controller.ts:13,48`); `POST /promotions` usa `PromotionDto` importado com `type` e sem decorators (`promotions.service.ts:13`; `promotions.controller.ts:10,34`). O `ValidationPipe` global nao valida (metadado vira `Object`): `monthlyPrice`, `usersLimit`, `employeeId`, `newSalary` chegam crus. Os tres modulos estao congelados (FEATURE_*), entao so sao alcancaveis se a flag for ligada.
3. **M - Limitador contornavel por campo do corpo.** `UserThrottlerGuard` usa `body.email`/`body.cpf`/`document` como chave (`user-throttler.guard.ts:13-19`). Em `POST /public/internal-jobs/:jobId/apply` (`internal-jobs.controller.ts:57`, comentario "impede testar matricula/CPF em sequencia") quem varia o CPF a cada tentativa cai num balde novo de 5/min; a protecao efetiva e so o Turnstile. Idem `POST /public/candidate-requests` (`recruitment-privacy.controller.ts:55`, variando e-mail) e `POST /candidate-portal/auth/reset-password` (chave = e-mail; por conta e o desejado, mas para enumeracao em massa nao limita). Sugestao: balde adicional por IP nas rotas publicas.
4. **M - Tokens sem expiracao/texto puro:** `responseToken` da entrevista e `trackingToken` do acompanhamento (secao 3.1); guardar so o hash e dar prazo (ex.: `retentionUntil`) ao link de acompanhamento.
5. **M - 200 no lugar de 404 em `ai`:** `POST /ai/support/ticket/:id/summarize` e `/suggest-reply` devolvem 200 com texto "Ticket nao encontrado" (`ai.controller.ts:102-107`, `:117-122`). Ainda em `ai`, `POST /ai/support/classify` (:96) e a **unica rota do conjunto "so logado sem @Roles"**: qualquer usuario autenticado de qualquer empresa aciona o provedor de IA (custo), sem limite proprio alem do global. Modulo congelado.
6. **B - Gateway de comunicacao fora da flag:** `CommunicationGateway` (`communication/realtime/communication.gateway.ts:10-14`) registra o namespace socket.io `communication` mesmo com `FEATURE_COMMUNICATION` desligada, sem autenticacao na conexao e sem handler de `join`; hoje so emite para sala que ninguem entra (inofensivo, mas a flag nao cobre WebSocket).
7. **B - Status inconsistentes com o verbo** (itens abaixo; nenhum e erro funcional, mas o cliente recebe 201 sem criar recurso):
   - POST de consulta/previa devolvendo 201 padrao: 7 rotas: `/employees/import/validate`, `/schedules/assign/preview`, `/escalas/assign/preview`, `/escalas/requests/preview`, `/ai/platform/company/:id/summary|risk`, `/ai/platform/assistant`.
   - POST de acao (cancel, approve, send, decide, close, reopen, hire, forward...) com 201 padrao: 25 rotas (lista completa abaixo). Nao ha `@HttpCode` nelas.
   - Todos os 21 DELETE devolvem 200 (nenhum 204), coerente entre si. `POST /public/visits` usa 202 (correto, aceita e nao revela).
8. **B - IDOR / isolamento por empresa:** nao encontrei IDOR nas 340 rotas. Verificacao: todas as rotas com JWT passam `companyId` (via `@CurrentCompany` ou `req.user.companyId`) ate o `where` do servico; as 14 sinalizadas pelo script como "sem companyId no fluxo / baixo privilegio sem CurrentUser" foram lidas e estao corretas: `manual-contracts/*`, `proposals/:id/send`, `commercial-sales/commissions/:id/:status` sao de plataforma (DEV/CEO/COMERCIAL/CONTABIL) e escopam pela carteira (`assertInWallet`, `commercial-wallet.ts`) ou por papel; `time-closing/:id*` e `me/payslips/:id/pdf` escopam por empresa e, para FUNCIONARIO/GESTOR, por colaborador/equipe (`time-closing.service.ts:415-440`); `management/sst/aso/employee/:employeeId` filtra por `companyId` (sst.service.ts:104-107); `ai/support/ticket/:id/*` e so DEV (tickets de plataforma). Restam duas observacoes de granularidade, nao de empresa: `GET /job-workflow/jobs/:id/approvals` (job-workflow.controller.ts:33) deixa GESTOR/CEO/CONTABIL ver aprovacoes de qualquer vaga da empresa (sem `JobScopeService`), e `GET /schedules/:id` (schedule.controller.ts:126) nao aplica escopo de equipe ao GESTOR.
9. **B - Rotas "so login sem @Roles":** apenas 1 (`POST /ai/support/classify`). O restante usa `@Roles` com lista explicita; `RolesGuard` esta presente em todas as rotas com `@Roles` (0 rotas com `@Roles` sem `RolesGuard`).
10. **Escrita sem DTO classe:** 7 rotas; 4 sao multipart com validacao manual e **nao sao falha** (`POST /public/jobs/:jobId/apply` valida com `class-validator` dentro do servico, `jobs.service.ts:260-274`; `PUT /candidate-portal/me/resume`, `POST /public/candidate-documents/:token/upload`, `POST /ceo-onboarding/contract/:contractId/signed` leem so o arquivo). As outras 3 sao o achado 2. Escritas sem corpo (apenas `:id`, ex. `cancel`) nao foram contadas.
11. **Congelados por flag:** 55 rotas com `@RequiresFeature` (ai=7, ceo-onboarding=8, commercial-sales=3, communication=15, manual-contracts=9, partners=2, promotions=5, proposals=6); as 8 pastas congeladas (ai, partners, commercial-sales, proposals, manual-contracts, ceo-onboarding, communication, promotions) tem 100% das rotas marcadas, nenhum controller fora delas usa os services congelados, e o `FeatureFlagGuard` responde 404 antes do login. Pontos ainda acessiveis: o gateway WebSocket (achado 6). Fora do escopo desta lista: crons de `finance`/`promotions` ja checam `isFeatureEnabled`.
12. **Duplicadas/conflitos:** 0 pares metodo+caminho iguais. Ambiguidades entre controllers (`GET /jobs/:id` de `JobsController` vs `/jobs/pipeline|stats|tags|talent|views` de `RecruitmentController`; `/jobs/:id/recruiters` vs `/jobs/applications/:id`): o Fastify (find-my-way) prioriza segmento estatico sobre parametrico, entao nao ha sombra. Sobreposicao funcional (nao de URL): `/schedules/*` e `/escalas/*` (schedule e schedule-hub) expoem previa de atribuicao e excecoes parecidas.
13. **500 potencial:** 32 rotas alcancam `new Error(...)` generico (coluna `erros` com `500*`); sao candidatas a virar `BadRequest/Conflict`.

### POST de acao com 201 padrao
- POST /ceo-onboarding/contract/:contractId/confirm apps/api/src/modules/ceo-onboarding/ceo-onboarding.controller.ts:57
- POST /communication/messages/send apps/api/src/modules/communication/communication.controller.ts:64
- POST /employees/import/confirm apps/api/src/modules/employees/employees-import.controller.ts:44
- POST /jobs/applications/:id/slot-offers/:offerId/cancel apps/api/src/modules/jobs/candidate-actions.controller.ts:93
- POST /jobs/offers/:offerId/approve apps/api/src/modules/jobs/candidate-actions.controller.ts:127
- POST /jobs/offers/:offerId/return apps/api/src/modules/jobs/candidate-actions.controller.ts:133
- POST /jobs/offers/:offerId/send apps/api/src/modules/jobs/candidate-actions.controller.ts:139
- POST /jobs/offers/:offerId/cancel apps/api/src/modules/jobs/candidate-actions.controller.ts:145
- POST /jobs/applications/:id/assessments/:inviteId/cancel apps/api/src/modules/jobs/candidate-actions.controller.ts:178
- POST /public/recruitment/assessment/:token/start apps/api/src/modules/jobs/candidate-actions.controller.ts:223
- POST /public/recruitment/assessment/:token/submit apps/api/src/modules/jobs/candidate-actions.controller.ts:226
- POST /job-workflow/jobs/:id/decide apps/api/src/modules/jobs/job-workflow.controller.ts:34
- POST /jobs/:id/duplicate apps/api/src/modules/jobs/jobs.controller.ts:85
- POST /jobs/applications/:id/hire apps/api/src/modules/jobs/jobs.controller.ts:115
- POST /jobs/applications/:id/forward apps/api/src/modules/jobs/recruitment-documents.controller.ts:39
- POST /management/sst/aso/:id/complete apps/api/src/modules/management/sst/sst.controller.ts:34
- POST /promotions/:id/cancel apps/api/src/modules/promotions/promotions.controller.ts:36
- POST /proposals/:id/send apps/api/src/modules/proposals/proposals.controller.ts:41
- POST /escalas/requests/:id/decide apps/api/src/modules/schedule-hub/requests/requests.controller.ts:50
- POST /escalas/requests/:id/peer apps/api/src/modules/schedule-hub/requests/requests.controller.ts:56
- POST /escalas/requests/:id/cancel apps/api/src/modules/schedule-hub/requests/requests.controller.ts:62
- POST /time-closing/:id/submit-review apps/api/src/modules/time-track/time-closing.controller.ts:73
- POST /time-closing/:id/approve apps/api/src/modules/time-track/time-closing.controller.ts:77
- POST /time-closing/:id/close apps/api/src/modules/time-track/time-closing.controller.ts:81
- POST /time-closing/:id/reopen apps/api/src/modules/time-track/time-closing.controller.ts:85

## 5. Validacao por amostragem manual

Amostra aleatoria de 30 rotas (semente fixa 7, de 340), conferidas lendo o decorator/classe no codigo-fonte: metodo, caminho final, handler, acesso/Roles efetivo, guards, DTO, status de sucesso.
- Campos estruturais (metodo, caminho, handler, acesso, guards, DTO, sucesso): **30/30 corretos = 100%** (210/210 verificacoes) na versao final do script.
- Campo `erros`: na primeira passada 28/30 (93%) com duas imprecisoes: `GET /time-closing/conference` ganhava 400 por ter `@Query('month')` simples, e `POST /jobs/applications/:id/assessments/:inviteId/cancel` perdia o 400 do `ParseUUIDPipe`. Ambas corrigidas no script e reconferidas; apos a correcao 30/30 coerentes. Ressalva: `erros` e aproximacao por cima (inclui 402/403/429 de guards globais) e nao enxerga `throw` em dependencias fora de `this.servico.metodo()`/funcoes livres (ex.: helpers importados de classes estaticas), nem erros de Prisma mapeados pelo filtro.
- Outros erros de extracao encontrados e corrigidos durante a validacao: DTO `RecordVisitDto`/`AsoRecordDto` marcados como "sem DTO" (regex pegava a palavra `Record`), `HttpStatus.OK` nao resolvido no `/health`, e `@Roles(...rolesWith('x'))` e constantes `REQUESTERS/APPROVERS/VIEWERS` que apareciam como texto em vez de papeis.
- Conferencia cruzada de cobertura: 340 rotas extraidas = 337 decorators por `grep` nos 19 modulos + 3 de `health`.
