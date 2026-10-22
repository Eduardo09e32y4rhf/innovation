# Handoff QA P0/P1 — Innovation RH Connect

Documento de passagem para continuar o ciclo de QA e correções. É autossuficiente: quem ler só este arquivo consegue retomar o trabalho.

- Repositório: `Eduardo09e32y4rhf/innovation` (monorepo: `apps/api` NestJS+Fastify+Prisma, `apps/web` Next 14 export estático)
- Branch de trabalho: `claude/fervent-maxwell-bbccbm` (último commit no momento da escrita: `e63ff8c`)
- Base: merge `e6927e0` (PR #691). Tudo desde então está nesta branch.
- Estado: compilação limpa (`tsc` API e web, 0 erros) e **1.444 testes vitest passando** (188 arquivos).

---

## 0. Prompt de partida sugerido para o Claude no VS Code

> Leia `docs/HANDOFF-QA-P0-P1.md` inteiro. Faça `git pull` da branch `claude/fervent-maxwell-bbccbm`. Siga a ordem da seção 12: primeiro os dois bugs graves da seção 4 (escreva o teste que falha antes de corrigir), depois as frentes inacabadas da seção 5, depois o backlog da seção 6. Respeite as regras da seção 2. Ao terminar cada item, rode `npx tsc --noEmit` em `apps/api` e `apps/web`, depois `npx vitest run` na raiz, e commite por tema.

---

## 1. Ambiente local

### Serviços
- PostgreSQL 16 em `localhost:5432`, banco `innovation_rh_connect`, usuário `innovation_user` (senha de desenvolvimento no `.env.example`). O usuário precisa de `CREATEDB` para `prisma migrate dev`: `sudo -u postgres psql -c "ALTER USER innovation_user CREATEDB;"`.
- Redis em `localhost:6379`.
- API em `localhost:3333` (`apps/api`).

### Subir a API a partir do build
```bash
cd apps/api
npm install
./node_modules/.bin/prisma generate        # NÃO use "npx prisma": pega a versão errada (8.0.0-rc)
./node_modules/.bin/prisma migrate deploy
ADMIN_PASSWORD='LoadTest@123' DEV_PASSWORD='LoadTest@123' node prisma/seed-admin.cjs
npx nest build
METRICS_TOKEN=tk1234567890abcdef node dist/main
```
Login local de teste (só desenvolvimento): `admin@innovation.local` / `LoadTest@123` (ADMIN da empresa A). Nunca use esses valores em produção.

### Testes
- Raiz do monorepo: `npx vitest run` (suíte completa; `apps/api` tem script `npm test` que roda vitest da raiz + 4 testes `.cjs`).
- `tests/qa/` **agora roda no CI** (incluído na configuração principal do vitest; 830 casos). 152 deles são defeitos abertos documentados com `it.fails`: ver `docs/auditoria/DEFEITOS-ABERTOS-QA-2026-10-21.md`.
- Playwright: projeto separado em `tests-e2e/` (tem `package.json` próprio; `node_modules` ignorado). Chromium já instalado no ambiente de nuvem em `/opt/pw-browsers/chromium`; localmente rode `npx playwright install chromium`.
- Throttle da API: 300 requisições por minuto por token. Para teste de carga, use tokens diferentes ou suba a API com limite maior só em ambiente local, sem commitar.

### Armadilhas conhecidas
1. **Não use `pkill -f node`/`pgrep -f ...` dentro do mesmo comando que sobe a API:** o padrão casa com o próprio shell e derruba a sessão (exit 144). Mate o processo pelo PID.
2. `nest build` sobrescreve `dist/` — pare a API antes de reconstruir.
3. O `ResponseInterceptor` embrulha toda resposta em `{ success, data }` e converte `Decimal` em número. `/metrics` é isento (texto puro do Prometheus).
4. Fastify `bodyLimit` global é 1 MB; rotas com limite maior estão em `apps/api/src/common/http/body-limits.ts` (ver seção 7).
5. O `ValidationPipe` global usa `whitelist` + `forbidNonWhitelisted`, mas **só valida DTOs de classe**. Controllers com `@Body()` de tipo inline escapam disso (ver seção 5, frente Isolamento).

---

## 2. Regras de trabalho

1. **Teste primeiro:** para cada bug, escreva o teste que reproduz a falha, veja falhar, corrija, veja passar.
2. **Evidência:** item só fecha com teste automatizado; fluxo de tela, com captura ou spec Playwright.
3. **Fontes:** cite a fonte oficial aberta (planalto.gov.br, gov.br/receitafederal, docs.asaas.com, docs do Mercado Pago, OWASP, PostgreSQL, Redis). **Atenção:** no ambiente em nuvem, `planalto.gov.br` e `docs.asaas.com` não abriam; várias regras trabalhistas, fiscais e de gateway foram escritas a partir de fontes secundárias. Onde este documento disser "confirmar fonte oficial", abra a página oficial e confirme antes de considerar fechado.
4. **Escopo:** edições cirúrgicas. Não reescreva arquivos inteiros. `schema.prisma` só com migration nova (somente adicionar, não alterar models existentes sem necessidade).
5. **Commits por tema**, mensagem em inglês no estilo `fix(area): ...`, sem commitar `dist*/`, `node_modules`, dados de upload ou segredos. `.gitignore` já cobre `apps/api/data/`, `apps/api/.iso-dist/`, `apps/api/dist-qa*/`.
6. Antes de qualquer commit: `npx tsc --noEmit` em `apps/api` e em `apps/web`, e `npx vitest run` na raiz.

---

## 3. Placar

### P0 original (plano de teste)
| Item | Situação |
|---|---|
| Webhooks: assinatura, token, replay, idempotência | Fechado |
| Estorno, chargeback, bloqueio por inadimplência | Fechado |
| Cálculos: folha, férias, rescisão, 13º, contábil = empresa | Fechado (com ressalvas da seção 8) |
| LGPD: exportar, anonimizar, logs mascarados | Fechado |
| Contrato da API (nenhum 500 nas ~480 rotas) | Fechado |
| Duplo clique no backend (demissão, cobrança, férias, ponto) | Fechado |
| Segredos de produção validados no boot | Fechado |
| **PATCH parcial de funcionário zera campos** | **ABERTO — bug grave (seção 4.2)** |
| **Dia da semana deslocado no fechamento do ponto** | **ABERTO — bug grave (seção 4.1)** |
| Isolamento entre empresas em TODAS as rotas | Parcial (seção 5.1) |
| Duplo clique nos botões do front | Parcial (seção 5.4) |
| Fluxos ponta a ponta no front | Parcial (seção 5.5) |
| Backup e restauração do Postgres | Parcial — script e runbook prontos, falta relatório final (seção 5.6) |
| Candidatura pública: upload e anti-spam | Parcial (seção 5.8) |
| Ciclo de pagamento real (PIX/boleto/cartão) | Testado só contra Asaas **simulado** (31/31). Falta o sandbox real |

### P1
Backlog completo na seção 6.

---

## 4. Bugs graves abertos (começar por aqui)

### 4.1 Dia da semana deslocado no fechamento do ponto
- **Onde:** `apps/api/src/modules/time-track/time-closing.service.ts`, linhas ~209 (`const dayOfWeek = saoPauloDayOfWeek(date)`) e ~386 (`const weekday = saoPauloDayOfWeek(date)`). A função está em `apps/api/src/common/utils/date.utils.ts` (`saoPauloDayOfWeek` formata com `timeZone: 'America/Sao_Paulo'`).
- **Causa:** as datas do loop (`this.eachDate(periodStart, periodEnd)`) são instantes em 00:00 UTC. Em São Paulo (UTC−3) isso cai às 21:00 do **dia anterior**, então o dia da semana recua um. Resultado: segunda vira domingo (paga hora extra de 100%) e sábado vira sexta (falta indevida); domingo vira sábado.
- **Impacto:** dinheiro e folha errados em todo fechamento.
- **Reproduzir:** teste com datas `2026-10-05T00:00:00Z` (segunda) e `2026-10-10T00:00:00Z` (sábado) e com `23:59` no horário de São Paulo; esperado 1 (segunda) e 6 (sábado).
- **Correção sugerida:** obter o dia civil primeiro (`toSaoPauloDateKey(date)` ou calcular a partir do `dateKey` já usado no loop) e derivar o dia da semana desse dia civil, não do instante UTC. Conferir todos os usos de `saoPauloDayOfWeek`, `getUTCDay` e `getDay` em `time-track/` (inclusive `time-track.service.ts`).
- **Teste:** propriedade sobre 1.000+ datas, incluindo virada de mês e ano bissexto.

### 4.2 PATCH parcial em `/employees/:id` apaga dados
- **Onde:** `apps/api/src/modules/employees/employees.service.ts`, `toData()` (~linha 528), usado em `create` (linha ~130) **e** `update` (linha ~152).
- **Causa:** `toData` aplica valores padrão quando o campo não vem: `name ?? 'Funcionario sem nome'`, `position ?? 'A definir'`, `department ?? 'A definir'`, `status ?? 'ACTIVE'` e `emptyToUndefined` em vários campos. Num PATCH que envia só `{ "phone": "..." }`, o update sobrescreve nome, cargo, departamento e **reativa** o funcionário (status volta a `ACTIVE`).
- **Correção sugerida:** separar `toCreateData` (com defaults) de `toUpdateData` (só campos presentes no DTO; `undefined` não sobrescreve; `null` só quando explícito e permitido; `status` só muda se vier no corpo). Conferir outros updates que reutilizam o mesmo padrão (users, vagas, empresas).
- **Teste:** PATCH `{phone}` mantém nome, cargo, departamento, admissão e status; PATCH `{status:'INACTIVE'}` muda só o status.

---

## 5. Frentes a concluir (trabalho parcial já commitado)

Cada frente foi conduzida por um agente que parou no meio por limite de uso. O que existe está commitado em commits "wip/in progress". Para cada uma: o que já existe, o que falta, métricas de aceite.

### 5.1 Isolamento entre empresas e mass assignment (prioridade máxima)
- **Existe:** `tests/security/tenant-isolation.live.mjs` (sonda ao vivo), `tests/security/inline-body.spec.ts` (guarda contra `@Body()` inline), DTOs novos para controllers que usavam tipo inline: `ai/dto`, `management/dto/{aso,management-event}.dto.ts`, `notifications/dto`, `payroll/dto/deduction-rule.dto.ts`, `platform/dto/{plan-payload,update-global-permissions}.dto.ts`, `promotions/dto`, `schedule/dto/update-schedule.dto.ts`, `support/dto/platform-support.dto.ts`, `employees/dto/confirm-import.dto.ts`, `finance/dto/company-charge.dto.ts`.
- **Já testado ao vivo (OK):** funcionários e usuários entre empresas (404), FUNCIONARIO sem acesso a rotas administrativas (403), `companyId`/`status`/`passwordHash` no corpo (400).
- **Falta:** executar a sonda para TODAS as rotas com `:id` (finance/invoices, payroll/termination, jobs/candidates/applications, documents, support, notifications, communication, schedule, time-track, vacations, promotions, proposals, dossiê da plataforma); gerar a tabela rota→resultado; testar mass assignment (`companyId`, `role`, `status`, `isActive`, `passwordHash`, `billingStatus`, `userId`) em create/update dos recursos principais; corrigir o bug 4.2.
- **Pendência de auditoria:** `documents/document.service.ts#readBuffer` agora exige `companyId` (corrigido); reconferir chamadores novos.
- **Aceite:** 0 respostas 2xx entre empresas; 100% das rotas com `:id` na tabela; 0 `@Body()` inline em rotas de escrita sem validação.

### 5.2 Pagamentos (PIX, boleto, cartão), cupons e conciliação
- **Existe:** servidor Asaas falso `tests/fakes/asaas-fake.mjs` e roteiro `tests/fakes/payment-cycle.qa.mjs` (31 cenários verdes), `finance/payment-reconciliation.service.ts` (+spec) e `reconciliation.controller.ts`, correção do cupom (`promotions/promotions.service.ts`: reserva o uso antes do desconto; 201 e 409 na corrida).
- **Falta:** validar contra o **sandbox real do Asaas** (precisa de chave de sandbox do dono do projeto); registrar a conciliação no módulo e confirmar o agendamento a cada 6 h; evento de cartão recusado hoje fica `IGNORED` sem avisar o cliente (decidir comportamento).
- **Aceite:** ciclo completo no sandbox; divergência pós-conciliação = 0; estorno nunca maior que o pago.

### 5.3 Nota fiscal, estorno e razão contábil
- **Existe e testado:** reserva atômica contra nota duplicada, `CANCELLATION_DENIED` não reemitível, pré-validação do tomador (CPF/CNPJ 11/14 dígitos, pagamento confirmado, valor igual ao da fatura), retry com espera de 5/15/60/240/720 min, estorno com recusa definitiva imediata e timeout em `UNKNOWN`, `GET /accounting/platform-ledger?month=&companyId=` (partida dobrada).
- **Falta:** `apps/api/src/modules/platform-hub/platform-hub.service.ts:76` soma `amount` das faturas pagas **sem descontar estornos** (diverge do razão novo e de `platform-finance.service.ts:~1004`); `apps/web/app/[tenant]/dashboard/faturas/_ajustes-fiscais.tsx` precisa exibir os motivos novos (hoje mostra o texto do `reason`); confirmar na fonte oficial o método HTTP do cancelamento (`POST /v3/invoices/{id}/cancel`) e o prazo de cancelamento por município; IBS/CBS não implementados (reforma tributária; não inventar nomes de campo).

### 5.4 Botões: duplo clique, confirmação, permissões na tela, acessibilidade
- **Existe:** `apps/web/app/lib/single-flight.ts` (+ spec), `hooks/use-action.ts`, `components/ui/confirm-provider.tsx`, `components/ui/modal.tsx`, `contexts/Providers.tsx`, vários dashboards já migrados, `tests/unit/web/permission-matrix.spec.ts`, `lib/attachments.ts`.
- **Falta:** provar com `grep` que não resta `onClick` chamando mutação direto sem trava; toda ação destrutiva (demitir, excluir, cancelar fatura, estornar, desconectar WhatsApp, efetivar rescisão com `confirm: "EFETIVAR"`) com modal de confirmação acessível (foco preso, ESC, botão com texto da ação); matriz perfil×botão sem divergência com os `@Roles` do backend; WCAG 2.2 AA (label, foco visível, aria nos modais, contraste); limite de 10 MB no upload de arquivo da tela do WhatsApp; **`carreiras/_lib/candidate-api.ts` já foi corrigido** (não manda `Content-Type` sem corpo).
- **Aceite:** 5 cliques = 1 chamada; matriz sem divergência; zero violação crítica no teste automatizado de acessibilidade.

### 5.5 Ponta a ponta com Playwright, celular e navegadores
- **Existe:** `tests-e2e/` (fixtures, helpers, specs, `playwright.config.ts`, `setup/seed-users.sql` idempotente que cria 3 usuários E2E copiando o hash do admin local).
- **Falta:** executar as specs; ≥15 specs no total; tabela página×viewport (360×740, 768×1024, 1280×800, 1920×1080) sem rolagem horizontal; token expirado sem loop; API offline com `ErrorState` e botão de tentar de novo; LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 nas 3 páginas mais pesadas; WebKit e Firefox reais (ou documentar que foram emulados); script `test:e2e`; lista priorizada de bugs do front com `arquivo:linha`. Já há indício: numa sondagem inicial as páginas de férias e ponto "pareciam travadas"; investigar se é bug real ou espera de carregamento.

### 5.6 Backup, restauração e resiliência
- **Existe:** `infra/scripts/backup-restore-verify.sh`, `infra/RUNBOOK-backup-e-resiliencia.md`, `common/redis/cron-lock.decorator.ts` (+spec), `redis.service.ts` degradando sem derrubar a API, `/health/live`, `/health/ready` e `/health`, health checks do Docker apontando para `/health/live`.
- **Falta (relatório final com números):** restauração em banco novo com diferença 0 (contagem por tabela e soma das colunas monetárias) e tempo (RTO); com o Redis fora, 0 respostas 5xx em 200 GETs e recuperação sozinha; com o banco fora, 503 limpo e reconexão em ≤30 s; headers de produção (HSTS, CORS só por `ALLOWED_ORIGINS`); confirmar que todos os `@Cron` usam o lock distribuído (2 instâncias → 1 execução).
- **Regra:** testar sempre em instância e Redis/banco **de teste**, nunca derrubar os principais.

### 5.7 PDFs e documentos (fechado, só conferir)
- Holerite e espelho de ponto batem com o cálculo (214 conferências, diferença 0). Corrigidos: glifos fora da fonte, hash estável, modelos com campo mal escrito, 500 por subpasta inexistente. Testes em `common/pdf/pdf-text.spec.ts` e `document-templates/template-render.spec.ts`.
- **Falta:** confirmar na **Portaria MTP 671/2021** (fonte oficial) o conteúdo mínimo do espelho de ponto.

### 5.8 Uploads seguros e recrutamento
- **Existe:** `common/utils/file-validation.ts` (+spec) — validação por conteúdo (magic bytes), allowlist por endpoint, nome de arquivo sanitizado, zip bomb, SVG com script; aplicado em jobs, ASO, suporte, import de funcionários, hub de escalas, onboarding do CEO, WhatsApp; `jobs/apply-abuse.ts` (anti-spam da candidatura); `apps/api/tests/unit/zip-fixture.ts`.
- **Falta:** tabela vetor→status de todos os ataques (`.exe` como `.pdf`, polyglot, nome `../../x.pdf`, zip bomb, SVG com `onload`, arquivo de 0 byte, 11 MB); candidatura em massa (50 requisições em 10 s do mesmo IP bloqueadas a partir do limite); vaga encerrada não aceita candidatura; e-mail duplicado na mesma vaga é idempotente; candidato de uma empresa nunca visível para outra (exceto banco de talentos com consentimento ativo); consentimento com prazo e rotina que anonimiza o vencido; pipeline (mover, rejeitar, contratar→converter em funcionário sem perder campos); busca com acento.
- **Nota para o teste da candidatura pública:** o formulário exige o campo `telefone` (obrigatório); sem ele a validação barra a requisição antes do arquivo. Envie o telefone nos testes de upload para chegar à validação do arquivo, e respeite o limite de requisições entre tentativas.
- **Aceite:** 100% dos vetores rejeitados; ≥15 testes.

### 5.9 Cálculo, fechamento e operação
- **Existe:** `time-track/period-lock.ts` (+spec), `vacation-double-pay.spec.ts`, `payroll-property.spec.ts`, `common/redis/cron-lock*`.
- **Conclusão do possível pagamento em dobro nas férias:** **confirmado** por conta no próprio spec (salário 5.000, 10 dias de gozo: recibo 2.222,23 + salário cheio 5.000,00 = 7.222,23 contra o devido 5.555,56; excesso 1.666,67). A correção desconta os dias de férias do salário do mês e mantém a base de INSS unificada (`vacations/vacation-tax-base.ts`). Reconfirmar com o contador (seção 8) e rodar os specs.
- **Falta:** bug 4.1; paginação (`page=-1/0/abc`, `limit=100000`, `search` gigante) em todas as listagens principais, limite máximo 100, sem 500 (tabela rota→resultado); fechamento de mês bloqueando edição com 409 e reabertura auditada; WhatsApp: `connect`, `disconnect` e `sendMessage` chamam o provedor **sem tratamento de erro** (falha vira 500) — tratar QR expirado, sessão caída, número inválido; e-mail (Resend/SES/SMTP) fora do ar não pode quebrar o fluxo (fila + retry); ≥1.000 casos de propriedade sem falha.

### 5.10 Sessão, MFA e rate limit (concluído, conferir)
Revogação testada ao vivo: trocar senha, sair, redefinir senha, desativar usuário e desligar funcionário dão 401 com o token antigo; mudar o papel derruba o privilégio na hora (403). TOTP não vale duas vezes; código de recuperação é de uso único; desativar MFA exige código; teto absoluto de sessão de 90 dias; IP vem de `request.ip`; login de conta inexistente gasta o mesmo bcrypt (sem enumeração). Specs em `auth/session-mfa-security.spec.ts`.

---

## 6. Backlog P1 ainda não iniciado ou parcial

- **F2 Resiliência:** HTTPS/HSTS/CORS em produção; plano de resposta a incidente (Resolução CD/ANPD nº 15/2024 — confirmar prazo na fonte); alertas do Prometheus; rotação de logs.
- **F3 Front:** navegadores reais (Chrome, Safari iOS, Firefox, Samsung Internet).
- **F4:** MFA obrigatório para ADMIN de empresa hoje depende de `MFA_ENFORCE_ROLES`; mensagem de "conta bloqueada" ainda revela que a conta existe; token de acesso dura 7 dias (`JWT_EXPIRES_IN`), embora cada requisição confira a sessão.
- **F6:** relatório de saltos de numeração das notas só alerta (numeração é da prefeitura/Asaas).
- **F7:** troca de plano com cupom e pró-rata (testado no simulado, falta sandbox).
- **F8:** rescisão — sem média de horas extras do mês do desligamento, sem eSocial S-2299, 13º com IRRF só pela dedução legal, teto do art. 477 §5º com divergência entre TST e TRT-3 (aplicado só às compensações); `TerminationRecord` não tem chave estrangeira para `Company`/`Employee` (excluir empresa deixa termos órfãos); INSS das férias: base unificada sem norma explícita encontrada; hora noturna: o motor já aplica 60/52,5 (testado), prorrogação após 05h só vale para jornada que cobre toda a janela 22h–05h.
- **F9:** retenção de candidatos (rotina de anonimização do consentimento vencido).
- **F10:** jobs agendados com lock (ver 5.6/5.9), e-mail e WhatsApp com retry.
- **Reativação de funcionário:** hoje o `PATCH` de status não reativa o usuário de login (decisão de produto pendente).
- **Pagamento avulso:** `Idempotency-Key` agora é obrigatório nas rotas `/finance/charge/:companyId`, `/finance/platform/invoices`, `/faturas/plataforma/invoices` (chamadas internas geram chave no servidor).

---

## 7. O que já foi entregue (referência)

### Segurança e acesso
- XSS: interceptor global `common/pipes/sanitize-input.interceptor.ts` (APP_INTERCEPTOR) sanitiza corpo e query, remove `__proto__`/`constructor`/`prototype`, não toca em webhooks, multipart, `/document-templates`, nem em campos de senha/token/hash/base64/html; `common/utils/sanitize-string.ts`; link `javascript:` bloqueado no front (`safeHref` em `apps/web/app/lib/text.ts`); script de limpeza de dados antigos `apps/api/scripts/sanitize-existing-data.cjs` (simulação por padrão, `--apply` grava, recusa banco remoto sem `--allow-remote`).
- Rate limit: `UserThrottlerGuard` usa `req.ip` resolvido pelo Fastify com `TRUST_PROXY` (padrão `loopback,uniquelocal`); não confia em `X-Forwarded-For`/`X-Real-IP`/`CF-Connecting-IP` do cliente.
- `/metrics` exige `Authorization: Bearer $METRICS_TOKEN` (obrigatório em produção) e devolve texto puro; `POST /ai/support/classify` exige login.
- Webhooks: Asaas e Mercado Pago retornam 403 sem credencial em qualquer ambiente (bypass só fora de produção com `ASAAS_WEBHOOK_INSECURE`/`MERCADOPAGO_WEBHOOK_INSECURE=true`); assinatura do Mercado Pago `x-signature` (`ts`/`v1`, HMAC-SHA256) com janela anti-replay de 5 minutos (`MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS`).
- Em produção a API **não sobe** sem `METRICS_TOKEN` (≥16), `ASAAS_WEBHOOK_TOKEN` (≥32), `MERCADOPAGO_WEBHOOK_SECRET` (≥16), `JWT_SECRET` forte e `ALLOWED_ORIGINS`.
- Auditoria mascara salário, dados bancários, PIS/RG/CNH, tokens e MFA (comparação sem diferenciar maiúsculas).

### Limites de corpo (`apps/api/src/common/http/body-limits.ts`)
| Rota | Limite |
|---|---|
| Todas as rotas JSON | 1 MB |
| `PATCH /companies/me` (logo base64) | 6 MB |
| `POST /communication/messages/send` (mídia WhatsApp) | 14 MB |
| Rotas multipart (anexos, escala, import, currículo, PDF assinado) | 10 MB (plugin) |

### Folha, férias, rescisão, 13º
- Conta e arredondamento em centavos; tabelas 2026 conferidas: INSS até R$ 1.621,00 / teto de contribuição R$ 8.475,55 (INSS máximo R$ 988,09); IR isento até R$ 5.000 com redutor até R$ 7.350 (Lei 15.270/2025).
- Competência na contabilidade = mês em que o ciclo termina (`periodEnd`), igual à folha.
- Dependentes: parser único `common/utils/dependents.ts` (`countDependents`) usado por contábil e folha. Script `apps/api/scripts/normalize-dependents.ts` (simulação por padrão).
- Recibo de férias com INSS e IRRF separados do salário do mês; abono pecuniário + 1/3 isentos (`VACATION_RECEIPT_V2`); `vacations.repository.findForReceipt`.
- Rescisão: `POST /payroll/termination/simulate`, `POST /payroll/termination/:employeeId/finalize` (corpo com `confirm: "EFETIVAR"`; transação única; 409 na repetição; grava `TerminationRecord`, derruba sessões, abre ASO demissional, audita), `GET /payroll/termination/:employeeId`, `GET .../trct.pdf` (mesmo hash na reemissão). Tipos: `SEM_JUSTA_CAUSA`, `JUSTA_CAUSA`, `PEDIDO_DEMISSAO`, acordo 484-A, término de contrato, rompimento antecipado (arts. 479/480). Modos de aviso: `INDENIZADO`, `TRABALHADO`, `NAO_CUMPRIDO`, `DISPENSADO`. Média das variáveis dos últimos 12 meses (Súmula 347 do TST), férias vencidas e dobra do art. 137, limite de desconto de um mês (art. 477 §5º).
- 13º: `GET /payroll/thirteenth/:employeeId?year=`.
- Demissão concorrente: 10 chamadas simultâneas = 1 sucesso e 9 respostas 409 (`terminateOnce`).

### LGPD
- `GET /privacy/me/export`, `POST /privacy/me/erasure-request` (protocolo de 15 dias), `GET /privacy/employees/:id/export` e `POST /privacy/employees/:id/anonymize` (ADMIN/RH/CEO; só funcionário desligado; confirmação `{"confirm":"ANONIMIZAR"}`; mantém o que a lei obriga a guardar e devolve a lista com a base legal; prazo de guarda adotado: 5 anos após o desligamento — validar com o jurídico).

### Financeiro
- `Idempotency-Key` obrigatória nas cobranças avulsas; fila de ajustes fiscais (`GET /finance/fiscal-adjustments`, `POST .../:invoiceId/resolve` com `RETRY_CANCEL`, `REISSUE`, `MARK_RESOLVED`) para DEV/CEO/CONTABIL, aba "Ajustes fiscais" em Faturas; o webhook de pagamento atrasado após chargeback não reabre a fatura (só reabre se `getCharge` do Asaas confirmar pago).

### Banco (migrations aplicadas)
1. `20261020123939_add_employee_composite_indexes` — índices `(companyId, status)` e `(companyId, name)` em `Employee`.
2. `20261020142753_money_float_to_decimal` — 21 colunas de dinheiro de `Float` para `Decimal` (`TimeClosing` 14,2; `hourlyRate` 14,4; `Proposal.monthlyPrice` 14,2; custo de IA 14,6), com `ROUND(col::numeric, n)`. **Rodar antes numa cópia do banco de produção:** o banco local não tinha fechamentos de ponto, então a conversão de dados reais não foi exercitada.
3. `20261020161111_termination_record` — nova tabela `TerminationRecord`.

### Saúde e operação
`/health` (compatível), `/health/live` (processo vivo), `/health/ready` (dependências). Lock distribuído para tarefas agendadas.

---

## 8. Validações que dependem de pessoas

**Contador**
1. IRRF sobre o 1/3 do abono de férias (deixei isento; a Solução de Consulta Cosit 209/2021 aparece citada como tributável).
2. INSS das férias somado ao salário do mês (base unificada) — sem norma explícita encontrada.
3. Confirmar a correção do pagamento em dobro nas férias (seção 5.9).
4. Obrigatoriedade da NFS-e nacional (LC 214/2025, em vigor desde 01/01/2026) e prazo de cancelamento por município.
5. IBS/CBS (reforma tributária).

**Jurídico**
1. Prazo de guarda de dados trabalhistas: adotado 5 anos após o desligamento; há fontes citando 10 anos (INSS) e 30 (FGTS, Lei 8.036 art. 23 §5º).
2. Comunicação de incidente à ANPD (Resolução CD/ANPD nº 15/2024).

**DevOps / dono do projeto**
1. Cadastrar em produção: `METRICS_TOKEN`, `ASAAS_WEBHOOK_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `TRUST_PROXY` (faixa do seu proxy), `ALLOWED_ORIGINS`, `JWT_SECRET` forte. Se o Prometheus usa `infra/prometheus.yml`, grave o mesmo token em `/etc/prometheus/metrics_token`.
2. Rodar as migrations antes numa cópia do banco de produção e comparar somas antes e depois (diferença de R$ 0,00).
3. Chave de **sandbox do Asaas** para testar o ciclo de pagamento de verdade.
4. Decisões: reativar o login junto com a reativação do funcionário? MFA obrigatório para ADMIN de empresa? Quais navegadores suportar?

---

## 9. Variáveis de ambiente relevantes

| Variável | Para quê |
|---|---|
| `METRICS_TOKEN` | Bearer do `/metrics` (obrigatório em produção) |
| `ASAAS_WEBHOOK_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` | Autenticação dos webhooks (obrigatórios em produção) |
| `ASAAS_WEBHOOK_INSECURE`, `MERCADOPAGO_WEBHOOK_INSECURE` | Só desenvolvimento; nunca em produção |
| `MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS` | Janela anti-replay (padrão 300) |
| `TRUST_PROXY` | Saltos de proxy confiáveis (padrão `loopback,uniquelocal`) |
| `MFA_ENFORCE`, `MFA_ENFORCE_ROLES` | MFA obrigatório (padrão em produção: DEV, CEO, CONTABIL, COMERCIAL) |
| `SESSION_ABSOLUTE_DAYS` | Teto absoluto da sessão (padrão 90) |
| `JWT_EXPIRES_IN` | Validade do token de acesso (hoje 7d) |
| `ASAAS_NFSE_NATIONAL` | Usa só `municipalServiceCode` para NFS-e nacional |
| `ASAAS_API_URL` | Aponta para o Asaas (sandbox ou o simulado em `tests/fakes`) |

---

## 10. Dados de teste no banco local (apagar antes de qualquer demonstração)

Funcionários "Race Test*" (inclusive um já desligado e com TRCT gravado), funcionário com `<script>` no nome (já higienizado), segunda empresa de teste com 2 usuários, `funcionario@innovation.local` com o hash do admin, 6 usuários `qa-*@innovation.local`, usuários E2E criados por `tests-e2e/setup/seed-users.sql`, empresas marcadas como ativas para destravar o bloqueio de inadimplência. Nada disso vai para produção; o banco local é descartável.

---

## 11. Descobertas fora de escopo já registradas

- `platform-hub.service.ts:76` ignora estornos (seção 5.3).
- ~~A pasta `tests/qa/` não roda no CI~~: resolvido, roda no CI (seção 1).
- `Prisma.Decimal` volta como número pelo `ResponseInterceptor`; rotas com `PlainJsonInterceptor` (faturas) também convertem para número desde a migração.
- O 401 observado em um teste após pagamento por webhook **não** tem causa no código (regressão coberta por 3 testes: a reativação não toca usuário nem sessão).

---

## 12. Ordem de execução recomendada

1. Bug 4.1 (dia da semana) e bug 4.2 (PATCH parcial), cada um com teste que falha primeiro.
2. Frente 5.1 (isolamento em todas as rotas) e 5.8 (uploads/recrutamento).
3. Frentes 5.4 e 5.5 (botões e ponta a ponta) e 5.9 (cálculo/operação/paginação/WhatsApp).
4. Frente 5.6 (relatório de backup e resiliência) e 5.3 (hub financeiro e tela de ajustes).
5. Frente 5.2 no sandbox real do Asaas, quando houver chave.
6. Backlog da seção 6 e validações da seção 8.

### Critério de saída
- `tsc` 0 erros (API e web); `npx vitest run` verde; Playwright verde nos viewports definidos.
- Nenhuma resposta 500 no teste de contrato (todas as rotas do Swagger em `/api/docs-json`, com e sem token, corpo lixo, ID inválido).
- 0 resposta 2xx entre empresas; todos os vetores de upload rejeitados.
- Aba contábil = aba da empresa (diferença R$ 0,00); webhooks idempotentes comprovados; restauração de backup com diferença 0.
- Zero P0 aberto.
