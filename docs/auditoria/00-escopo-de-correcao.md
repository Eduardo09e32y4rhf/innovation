# 00 - Escopo completo de correção (Innovation)

Data-base: 2026-10-29. Consolida e **reconfirma no código** os relatórios 01a, 01b, 02, 03, 04 e 05 de `docs/auditoria/`. Nenhum código foi alterado ao produzir este documento. Nenhum segredo foi lido ou impresso; só nomes de variáveis.

Convenção de evidência usada no catálogo:

- **[CONF]** = reconferido por mim, neste escopo, lendo o arquivo:linha citado.
- **[REL]** = vem do relatório de origem (01a/01b/02/03/04/05) e **não** foi relido por mim. Trate como hipótese forte, mas rode o teste de aceite antes de afirmar.
- **Números de linha** = estado do repositório lido nesta tarefa. Outros agentes editam o código em paralelo (ver 2.6): as linhas de arquivos listados lá podem ter se deslocado.
- Marcadores de documentação oficial: **VERIFICADO** (página/registro lido na íntegra), **VIA BUSCA** (só resumo de busca), **NAO VERIFICADO** (não consegui ler).

---

## 1. Sumário executivo

- **62 achados** no catálogo, **518 h** de esforço base (1 dev, com testes): onda 0 = 67 h, onda 1 = 176 h, onda 2 = 275 h.
- Gravidade: **0 Críticas**, **15 Altas**, **31 Médias**, **16 Baixas**. O relatório 03 chamava o Next 14 de crítico; rebaixei para Alta (DEP-01) porque o otimizador de imagens está desligado e os demais avisos críticos não se aplicam a este deploy.
- Distribuição:

| Onda | Alta | Média | Baixa | Total | Horas |
|---|---:|---:|---:|---:|---:|
| 0 | 10 | 3 | 0 | 13 | 67 |
| 1 | 3 | 21 | 3 | 27 | 176 |
| 2 | 2 | 7 | 13 | 22 | 275 |
| **Total** | 15 | 31 | 16 | 62 | 518 |

- Bloqueios de negócio: 12 decisões (seção 3). As que travam a Onda 0 são D1 a D5 e D12 (D6 só se o Mercado Pago entrar no lançamento).
- Já corrigido por outros agentes no repositório: SEG-02 e SEG-03 (commitados); PAG-01, PAG-02, PAG-03, SEG-01, SEG-06 e INF-01 parcialmente, sem commit (seção 2.6). Falta conferir os testes de aceite.
- Descartados ou reduzidos após conferência: 9 afirmações (seção 2.4). Zero IDOR confirmado.
- Cinco itens mais urgentes:
  1. **PAG-01** reativação indevida de empresa por pagamento (dinheiro e acesso)
  2. **SEG-01** upload/download com API do Express sob Fastify (anexos, recibo de ponto e CSV falham)
  3. **INF-01** variáveis (captcha, assinatura LGPD, flags) não chegam à API em produção
  4. **PAG-02** `PAYMENT_UPDATED` desfaz vencimento e ressuscita fatura
  5. **LGPD-01** exclusão definitiva apaga dados de retenção legal
- Não verificado: banco e nginx de produção, sites oficiais bloqueados (Asaas, Mercado Pago, Nest, Fastify, Prisma, Next), `.env` real, execução dos testes (seção 2.3).

---

## 2. Metodologia e limites

### 2.1 O que foi verificado de fato

| Item | Como | Fonte |
|---|---|---|
| Inventário de 618 rotas / 73 controllers | AST do TypeScript (extratores em `docs/auditoria/scripts/`), conferido por `grep` (337+3 = 340 no 01b) e amostra manual de 30 rotas (100% campos estruturais) | 01a, 01b |
| Drift entre `schema.prisma` e as 42 migrations | Postgres 16 descartável + `prisma migrate diff` = migração vazia | 05 (§4) |
| Falha de `FileInterceptor`/`res.set` sob Fastify | Reproduzido em app Nest 11 + Fastify 5.12 mínimo (`TypeError: req.on is not a function`, `res.set is not a function`) | 05 (A1) |
| Versões, advisories, imagens, tags de Actions | `npm audit/outdated/view`, Docker Hub, `git ls-remote` | 03 |
| Cada achado de severidade Alta e a maioria dos Médios | Releitura do arquivo:linha por mim nesta rodada (marcador [CONF]) | este documento |

### 2.2 O que foi só por busca / heurística

- Textos de documentação do Asaas, Mercado Pago, NestJS, Fastify, OWASP, Next: **VIA BUSCA** (hosts bloqueados na sessão; relatórios 04 e 05). Os URLs no catálogo são as páginas oficiais, mas o texto integral não foi lido.
- Listas "GET com escrita no banco" (24), "GET sem 404" (6), "`throw new Error` alcançável" (32) e "erros por rota" do CSV são **heurísticas do extrator** (aproximação por cima; 01a §Premissas e 01b §5). Não foram confirmadas rota a rota.
- Breaking changes do Prisma 7, Next 15/16, ioredis 6, openai 7 e notas das Actions: **NAO VERIFICADO** (03 §0).
- Estimativas de esforço em horas são minhas (1 dev pleno que conhece o repositório, incluindo teste e revisão), com margem ±30%.

### 2.3 O que NÃO foi verificado (limites)

- **Banco de produção** (drift real, dados já gravados, índices) e **nginx/firewall/certificados reais do host** (só há exemplos em `infra/`).
- **Valores reais de `.env` de produção** (segredos não lidos). Só se sabe quais variáveis o compose repassa.
- Sites bloqueados: `docs.asaas.com`, `www.mercadopago.com.br`, `docs.nestjs.com`, `fastify.dev`, `cheatsheetseries.owasp.org`, `www.prisma.io`, `nextjs.org`, `endoflife.date`, NVD/GitHub Advisory direto.
- Ordem de entrega dos webhooks Asaas (modo sequencial ou não) configurada na conta; se o `ts` do Mercado Pago é ms ou s; statuses de reembolso do MP; sandbox de ambos.
- Comportamento do ClamAV em runtime, testes de carga, criptografia de disco/backup do host, `FaceEnrollment` (biometria) em repouso.
- Rodar `npx vitest run` / typecheck: **não executado** nesta tarefa (somente leitura). Os testes sugeridos abaixo ainda **não existem**.
- Ambiente das auditorias era Node 22/npm 10; o repositório exige Node 24/npm 11. Rode `npm ci` em Node 24 antes de qualquer correção de dependência.

### 2.4 Achados descartados ou reduzidos após a conferência

| Origem | Afirmação do relatório | Resultado da conferência | Decisão |
|---|---|---|---|
| 01a "DTOs com propriedades sem decorator, rejeitadas pela whitelist" (`DeductionRuleDto.value/maxAmount`, `PlanPayloadDto.price/discountPercent/baseMonthlyPrice/userMonthlyPrice`) | Campos seriam recusados com 400 | **Falso positivo**: todos têm `@IsOptional()` (`deduction-rule.dto.ts:8,12`; `plan-payload.dto.ts:13-18`, onde `@keepMoney` é só `Transform`). `@IsOptional` registra metadado e o campo passa na whitelist. O problema real é outro: **não há validador de tipo** (aceitam qualquer valor). | Descartado como "rota quebrada"; mantido como Baixa em API-02 |
| 01a mesma lista, `UpdatePlatformCompanyDto.activeModules` | idem | `activeModules` tem só `@IsOptional()` (`update-platform-company.dto.ts:32-37`): passa, sem checar que é array de strings | Mantido em API-02 |
| 02 risco 6 "`punch.service.ts:53` (batida de ponto) sem timeout" | Provedor lento prende a batida | **Incorreto**: `punch.service.ts:55` já usa `AbortSignal.timeout(2500)` | Retirado da lista de timeouts (INF-04) |
| 04 B3 "tamanho mínimo do token de webhook Asaas não verificado" | Aceita qualquer valor | **Parcialmente incorreto**: o boot em produção exige `ASAAS_WEBHOOK_TOKEN` ≥ 32 e sem marcador de exemplo (`env.validation.ts:56-58`). Resta só "token não pode ser igual a `ASAAS_API_KEY`" | Reduzido a um item de PAG-11 |
| 01b #8 e 05 §5 "IDOR / vazamento entre empresas" | Procurado em 340 rotas / ~45 pontos Prisma | **Zero IDOR confirmado** pelos dois relatórios; só defesa em profundidade (`where:{id}` sem `companyId` após verificação) | Sem achado de IDOR; defesa em profundidade em SEG-13 |
| 01a "Rotas sem @Roles (20)" e 01b #9 | Poderiam ser abertas demais | São intencionais (auto-atendimento do usuário logado). Única exceção real: `POST /ai/support/classify` (módulo congelado) | Só a exceção virou achado (API-03) |
| 01b #4 / 3.1 "forças brutas em tokens de link" | Adivinhação do token | Inviável (160-192 bits). O risco real é **governança/LGPD** (sem expiração, texto puro) | Mantido só como SEG-12 (Média) |
| 05 M6 "drift de produção" | Pode haver drift real | Não medível daqui; no repositório o drift é **zero** | Mantido como ação operacional (INF-12), sem afirmar defeito |
| 04 M4 "`PAYMENT_REFUNDED` em `statusFromEvent` é código morto" | Retorno antecipado do reembolso | Não relido; o ramo de estorno existe nos dois webhooks (`mercadopago-webhook.controller.ts:81-85`) [CONF] | Mantido, rótulo "código morto" tratado como [REL] |

### 2.5 Ocorrência adicional encontrada na conferência (mesma causa de um achado existente)

`finance.controller.ts:54-58` (`GET /finance/platform/reports/monthly.csv`) tipa `res` como `express.Response` e chama `res.setHeader(...)`/`res.send(...)`. Em `FastifyReply` não existe `setHeader` (existe `header`). É o **mesmo defeito de SEG-01**, ainda **não reproduzido**; entra no escopo de SEG-01 com teste e2e. Não é achado novo de classe, só de instância.

### 2.6 Estado do repositório no momento da escrita (correções já em andamento por outros agentes)

Durante a conferência o repositório mudou: dois achados foram corrigidos e **commitados**, e vários outros estão **em edição, sem commit**, na árvore de trabalho (HEAD `c9541c7a`). A evidência [CONF] do catálogo descreve o código **antes** dessas edições. O desenvolvedor deve revisar `git log -5` e `git diff` e executar só o que faltar (principalmente os testes de aceite).

| ID | Estado | O que já existe | O que falta |
|---|---|---|---|
| SEG-02 | Corrigido e commitado (`54507429`) | `@Roles('DEV','ADMIN','RH')` em 5 métodos de escrita de `aso.controller.ts`; teste `aso-roles.spec.ts` | Decidir se GESTOR cria ASO da equipe; entrada no teste de inventário (SEG-09) |
| SEG-03 | Corrigido e commitado (`c9541c7a`) | `@Roles('DEV')` na escrita das regras globais (`accounting.controller.ts:76,82`); teste `accounting-global-tables.spec.ts`; front ajustado. A decisão D3 ficou como "só DEV" (mais restritiva que a recomendação "DEV/CEO") | Confirmar com o dono se CEO também deve editar; auditLog de ator |
| PAG-01 | Em edição, não commitado | `payment-access.ts` (`companyDataAfterPayment`, motivos reativáveis, fatura vencida pendente) usado em `asaas-webhook.processor.ts` | Mesma regra no ramo do Mercado Pago; aviso ao DEV; testes (`webhook-reactivation.spec.ts` em edição) |
| PAG-02 | Em edição, não commitado | `resolveStatus` e `deletedAt` preservado em `asaas-webhook.processor.ts`; `asaas-webhook-state.spec.ts` novo | Rodar os testes de aceite; revisar `PAYMENT_RESTORED` |
| PAG-03 | Parcial, não commitado | `mercadopago-payment-sync.service.ts` (lógica compartilhada webhook + conciliação) | Incluir MP no cron, tolerância do `ts`, variável no compose |
| SEG-01 | Parcial, não commitado | `common/http/multipart-upload.ts`; `support.controller.ts`, `hub.controller.ts`, `punch.controller.ts`, `vacations.controller.ts`, `faturas.controller.ts`, `finance.controller.ts` migrados para `reply`; testes `*.http.spec.ts` e `tests/security/no-express-api-under-fastify.spec.ts` | Teste e2e com `FastifyAdapter` real; remover `multer`/`@nestjs/platform-express`; conferir `accounting-payroll.controller.ts` e demais `@Res()` |
| SEG-06 | Em edição, não commitado | `common/http/client-ip.ts` e `rate-limit.guard.ts` alterado | Conferir que só `request.ip` é usado |
| INF-01 | Parcial, não commitado | `docker-compose.prod.yml`, `.env.example`, `apps/web/Dockerfile` (build-args Turnstile/FEATURE), `env.validation.ts` (`COMPOSE_API_PASSTHROUGH_ENV`), `tests/contract/compose-env.spec.ts` | `.env.prod.example` e `infra/.env.prod.example`; checagem na VPS (seção 7.1) |
| Demais | Abertos | - | Tudo o que está no catálogo |

---

## 3. Decisões de negócio pendentes (bloqueiam correções)

Cada decisão tem dono sugerido: **Dono do produto (você)**. Prazo: antes de começar a correção dependente.

| ID | Pergunta | Opções | Recomendação | Bloqueia |
|---|---|---|---|---|
| D1 | Pagamento de **cartão em status CONFIRMED** conta como pago? (Asaas: CONFIRMED = aprovado mas saldo ainda não liberado; RECEIVED = liberado) | A) CONFIRMED = pago (hoje, `asaas-webhook.processor.ts:275`); B) acesso em CONFIRMED, mas NFS-e e "receita reconhecida" só em RECEIVED | **B** para cartão. Acesso imediato (experiência) e nota fiscal só com saldo liberado, reduzindo nota emitida sobre chargeback. PIX/boleto: CONFIRMED e RECEIVED coincidem, sem mudança. | PAG-06 |
| D2 | **Retenção legal x exclusão definitiva** (`purgeCompany`, `deleteWithHistory`) | A) manter exclusão total; B) bloquear exclusão quando houver dado com prazo legal e oferecer arquivar + anonimizar | **B**. Prazos citados pelos relatórios: ponto 5 anos (Portaria 671/2021), ASO/PCMSO 20 anos, fiscal 5 anos. **Validar prazos com advogado/contador antes de fixar em código.** Exclusão total só para empresa de teste (sem fatura paga, sem ponto, sem folha) e com confirmação dupla + exportação prévia. | LGPD-01, LGPD-03 |
| D3 | **CONTABIL pode editar tabelas globais de folha** (INSS/IRRF/FGTS/parâmetros)? | A) sim (hoje); B) não, só DEV/CEO; C) CONTABIL propõe, DEV/CEO aprova | **B agora** (1 linha de código), **C** como evolução. Uma alteração afeta todos os clientes. | SEG-03 |
| D4 | **Estorno total** de uma fatura: o que acontece com a empresa? | A) nada (hoje); B) fatura vira estornada e empresa entra em inadimplência/suspensão como no chargeback; C) só alerta ao DEV | **B** com aviso de 48 h antes de suspender (estorno costuma ser decisão comercial). Defina e aplique em um único ponto de código. | PAG-05 |
| D5 | Quando um pagamento chega, **quais empresas voltam a ficar ativas sozinhas**? | A) todas (hoje); B) só as suspensas por inadimplência/aguardando 1º pagamento e sem outra fatura vencida | **B**. Empresa `CANCELED`, suspensa manualmente ou por segurança exige ação humana do DEV. | PAG-01 |
| D6 | **Mercado Pago entra no lançamento?** (`PAYMENT_PROVIDER` padrão é Asaas) | A) só Asaas; B) Asaas + MP | **A** no lançamento. Se A, PAG-03 e PAG-09 caem para Onda 1 e o webhook MP deve ser desligado no painel do MP. | PAG-03, PAG-09 |
| D7 | **Turnstile obrigatório em produção?** Hoje é opcional e fail-open (se a Cloudflare cair, passa) | A) manter; B) obrigatório (boot falha sem chave) mas fail-open na queda da Cloudflare com limite por IP reforçado; C) obrigatório e fail-closed | **B**. C derruba cadastro/login se a Cloudflare falhar. | SEG-10 |
| D8 | **Prazo de vida dos links por e-mail** (entrevista, acompanhamento da candidatura) | Sugestão: entrevista = data da entrevista + 7 dias; acompanhamento = fim da retenção da candidatura | Adotar a sugestão; gravar só o hash do token. | SEG-12 |
| D9 | **Módulos congelados** (IA, parceiros, vendas, propostas, contratos manuais, CEO onboarding, comunicação, promoções): ficam desligados no lançamento? | A) sim; B) algum ligará | **A**. Se alguma flag for ligada, os itens marcados "antes de ligar a flag" (API-02, API-03, INF-13) viram Onda 0 para aquele módulo. | API-02, API-03, INF-13 |
| D10 | **WhatsApp**: seguir com Baileys (não oficial, risco de banimento) ou migrar para a API oficial? | A) manter; B) desligar notificações por WhatsApp no lançamento; C) migrar | **B** no lançamento (e-mail cobre cobrança) e **C** depois. | INF-13 |
| D11 | **Reembolso de boleto**: o produto aceita o fluxo "link para o pagador informar a conta"? | A) sim; B) só PIX/cartão reembolsáveis | **A** (é o que o Asaas oferece), com texto claro na tela. | PAG-10 |
| D12 | **Robô de QA flutuante** (`NEXT_PUBLIC_ROBO_QA`, hoje ligado por padrão no build) fica em produção? | A) sim; B) desligar | **B** no lançamento comercial. | INF-02 |

---

## 4. Ondas

### Onda 0 - antes de cobrar clientes reais / lançamento

Dinheiro, acesso, dado de outra empresa, upload quebrado, ASO por CONSULTA, tabelas globais, variáveis do compose que não chegam à API. Critério de saída: seção 7.1 inteira marcada.

| ID | Resumo |
|---|---|
| PAG-01 | Pagamento reativa qualquer empresa (inclusive cancelada/suspensa) |
| PAG-02 | `PAYMENT_UPDATED/RESTORED` sobrescreve status e ressuscita fatura |
| PAG-03 | Mercado Pago sem conciliação e com janela de 5 min (condicional a D6) |
| PAG-04 | Asaas sem chave responde `{}` em silêncio |
| PAG-05 | Estorno total não altera fatura nem acesso (D4) |
| PAG-06 | Cartão CONFIRMED conta como pago (D1) |
| SEG-01 | Upload/download com API do Express sob Fastify: 500 |
| SEG-02 | CONSULTA/GESTOR gravam e apagam ASO |
| SEG-03 | CONTABIL altera tabelas globais de folha |
| SEG-04 | Scan de anexo de suporte fail-open |
| INF-01 | Variáveis e exemplos de `.env` não chegam à API |
| INF-02 | Robô de QA ligado por padrão no build |
| LGPD-01 | Exclusão definitiva apaga dados de retenção legal |

### Onda 1 - até 30 dias

Headers de segurança, rate limit por IP e em Redis, timeouts, backup remoto, Next 16, dependências vulneráveis, imagens Node 20 (PAG-07 a PAG-10, SEG-05 a SEG-10 e SEG-14, API-01, INF-03 a INF-12, DEP-01 a DEP-05; detalhe no catálogo).

### Onda 2 - depois

Prisma 7, Nest 12, criptografia de CPF/RG em repouso, filas mortas, tokens de link com expiração/hash, limpeza de código morto (PAG-11, SEG-11 a SEG-13, API-02 a API-06, INF-13 a INF-16, LGPD-02 a LGPD-04, DEP-06 a DEP-11).

Ordem sugerida dentro da Onda 0 (dependências): D1-D5 decididas -> INF-01 -> SEG-02, SEG-03 (rápidas) -> SEG-01 + SEG-04 (juntas) -> PAG-04 -> PAG-01, PAG-02, PAG-05 -> PAG-03 (se D6=B) -> LGPD-01 -> INF-02 e PAG-06.

---

## 5. Catálogo de achados

Legenda de esforço: horas de 1 dev, com teste. Risco = chance de a própria correção quebrar algo em produção.


## Catálogo - Onda 0 - antes de cobrar clientes reais / lançamento

### INF-01 — Variáveis do compose de produção que não chegam à API; exemplos de `.env` incompletos

> Status no repositório: parcial, não commitado (compose, `.env.example`, `env.validation.ts`, `compose-env.spec.ts`).

| Campo | Conteúdo |
|---|---|
| Gravidade | Alta |
| Onda | 0 |
| Área | Infra / configuração |
| Definição | O `docker-compose.prod.yml` só repassa à API as variáveis que lista. Várias que o código lê (captcha, assinatura RSA do termo LGPD, sal de hash, flags, proxy, caminho da sessão WhatsApp) não estão na lista, então ficam inertes mesmo se existirem no `.env`. Além disso, `KMS_MASTER_KEY`, obrigatória no boot, não aparece em nenhum `.env.example`. |
| Como acontece / como reproduzir | Definir `TURNSTILE_SECRET_KEY` no `.env` e subir: `docker compose exec api printenv TURNSTILE_SECRET_KEY \| wc -c` devolve 0 (captcha desligado). |
| Evidência (arquivo:linha) | [CONF] `docker-compose.prod.yml:35-123` (nenhuma ocorrência de `TURNSTILE_SECRET_KEY`, `FEATURE_*`, `TRUST_PROXY`, `ANALYTICS_SALT`, `PRIVACY_RSA_PRIVATE_KEY`, `TRIAL_DOCUMENT_HASH_SECRET`, `WHATSAPP_SESSION_PATH`); `:55` (`KMS_MASTER_KEY` só no compose); `config/env.validation.ts:56-60` (exige `METRICS_TOKEN`, `ASAAS_WEBHOOK_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` sempre). [REL] lista completa em 02 §5.4 |
| O que a documentação oficial diz (regra + URL + marcador) | Docker Compose: variável só entra no container se estiver em `environment:`/`env_file:` (NAO VERIFICADO online; comportamento padrão). |
| Impacto | Segurança e LGPD: captcha desligado, termo LGPD sem assinatura, hash de documento de trial cai em fallback, flags impossíveis de ligar. Operação: quem segue os exemplos não consegue subir a API. |
| Correção | 1) Adicionar ao bloco `environment` da API: `TURNSTILE_SECRET_KEY`, `PRIVACY_RSA_PRIVATE_KEY`, `TRIAL_DOCUMENT_HASH_SECRET`, `ANALYTICS_SALT`, `TRUST_PROXY`, `WHATSAPP_SESSION_PATH` (apontar para volume), `MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS`, `REFRESH_TTL_DAYS`, `SESSION_ABSOLUTE_DAYS`, `BILLING_GRACE_DAYS`, `DUNNING_WARN_DAY`, `DUNNING_BLOCK_DAY`, `DUNNING_CANCEL_DAY`, `ASAAS_WEBHOOK_SECRET`, `MAIL_REQUIRED` e as `FEATURE_*` (valor padrão vazio). Para o web: build-args `NEXT_PUBLIC_FEATURE_*` e `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. 2) Atualizar `.env.example`, `.env.prod.example` e `infra/.env.prod.example` com os nomes que faltam (incluindo `KMS_MASTER_KEY`, `TURNSTILE_SECRET_KEY`, `SENTRY_DSN`, `PRIVACY_RSA_PRIVATE_KEY`) e remover as mortas (`COMPREFACE_*`, `FRONTEND_URL`, `FINANCE_*_NOTIFICATIONS_ENABLED`, `ENABLE_LOCAL_SESSION`...). 3) Teste de CI que compara os nomes lidos no código (`process.env.X`) com os do compose e dos exemplos. 4) Na VPS: checar cada variável sem imprimir o valor (seção 7.1). |
| Critério de aceite | Teste `tests/contract/env-parity.test.ts`: "todo nome lido na API existe no compose ou na lista de exceções". Manual: `docker compose -f docker-compose.prod.yml exec api printenv TURNSTILE_SECRET_KEY \| wc -c` > 1 para cada variável obrigatória. |
| Esforço | 4 h |
| Risco da correção | Baixo; atenção: ao repassar `TURNSTILE_SECRET_KEY` o captcha passa a valer (testar login e cadastro, ver SEG-10). |
| Depende de | - |

### LGPD-01 — Exclusão definitiva apaga dados com retenção legal (`purgeCompany`, `deleteWithHistory`)

| Campo | Conteúdo |
|---|---|
| Gravidade | Alta |
| Onda | 0 (travas); estrutural em LGPD-03 (Onda 2) |
| Área | LGPD / retenção |
| Definição | Existem duas rotas de exclusão definitiva. A de empresa apaga assinaturas, faturas, tickets, auditoria, usuários e a própria empresa; a de funcionário apaga em cascata ponto, folha, férias e saúde ocupacional. Não há confirmação dupla, exportação prévia nem checagem de prazo legal. |
| Como acontece / como reproduzir | `DELETE /platform/companies/:id/purge` (somente DEV). `employees.service.ts:379` chama `deleteWithHistory`. Um clique apaga tudo. |
| Evidência (arquivo:linha) | [CONF] `platform/platform.repository.ts:380-389`; `platform/platform.controller.ts:114-117`; `employees/employees.repository.ts:319-323`; `employees/employees.service.ts:379`. [REL] 118 `onDelete: Cascade` (02 §7, 05 M7) |
| O que a documentação oficial diz (regra + URL + marcador) | LGPD art. 16, I (conservação para cumprimento de obrigação legal): https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm (VIA BUSCA, rel. 05). Prazos de ponto/ASO/fiscal: citados pelos relatórios; **validar com advogado**. |
| Impacto | Lei/LGPD e dinheiro: perda de prova trabalhista e fiscal; passivo em fiscalização. |
| Correção | 1) D2=B. 2) `purgeCompany`: recusar (409) se existir fatura paga/NFS-e, ponto, folha ou ASO; exigir `confirmName` no corpo e exportação gerada nas últimas 24 h; nunca apagar `auditLog` de empresa com faturas. 3) `deleteWithHistory`: recusar para funcionário com registros dentro da retenção; oferecer `anonymize` (já existe em `privacy/data-subject.service.ts`). 4) Registrar `PlatformAuditLog` com ator, motivo e contagens. 5) Estrutural (cascades -> Restrict e filtro de `deletedAt`) fica em LGPD-03. |
| Critério de aceite | `platform-purge-guards.spec.ts`: "purge recusa empresa com fatura paga", "purge exige confirmação por nome", "purge de empresa de teste vazia funciona e audita". `employees-delete-guards.spec.ts`: "excluir com histórico recente devolve 409". |
| Esforço | 8 h |
| Risco da correção | Baixo (restringe operação destrutiva); avisar suporte que a rotina de limpeza muda. |
| Depende de | D2 |


### PAG-01 — Pagamento reativa qualquer empresa, mesmo cancelada ou suspensa

> Status no repositório: correção em andamento, não commitada (ver 2.6).

| Campo | Conteúdo |
|---|---|
| Gravidade | Alta |
| Onda | 0 |
| Área | Pagamentos / acesso |
| Definição | Quando um pagamento chega, o sistema marca a empresa como ativa sem olhar por que ela estava bloqueada nem se existem outras faturas vencidas. Uma empresa cancelada por inadimplência, suspensa por segurança ou suspensa manualmente volta a ter acesso. |
| Como acontece / como reproduzir | Empresa com `billingStatus: CANCELED` ou `suspensionReason` manual. Entregar o webhook `PAYMENT_RECEIVED` de qualquer fatura dela (inclusive uma antiga e atrasada). Resultado: `status ACTIVE`, `isActive true`, `suspensionReason null`. O mesmo ocorre no Mercado Pago. |
| Evidência (arquivo:linha) | [CONF] `apps/api/src/modules/finance/asaas-webhook.processor.ts:160-161`; `apps/api/src/modules/finance/mercadopago-webhook.controller.ts:90-91` |
| O que a documentação oficial diz (regra + URL + marcador) | Regra de negócio, sem página oficial. Asaas recomenda não depender de ordem/duplicidade de eventos: https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook (VIA BUSCA, rel. 04) |
| Impacto | Dinheiro e acesso: cliente cancelado volta a usar o serviço sem pagar o que deve; reativação indevida de conta suspensa por segurança. |
| Correção | 1) `grep -rn suspensionReason apps/api/src` e listar todos os motivos existentes; classificar em "reativáveis por pagamento" e "não reativáveis". 2) Criar `apps/api/src/modules/finance/company-reactivation.ts` com `canAutoReactivate(company, paidInvoiceId)` (usado pelos dois webhooks). 3) Regra (D5=B): `billingStatus !== 'CANCELED'` e `suspensionReason` ∈ reativáveis (ou nulo) e `count(platformInvoice OVERDUE, deletedAt null, id != paga) === 0`. 4) Se não puder reativar: gravar só `billingStatus` coerente + `auditLog` + notificação ao DEV ("pagamento recebido de empresa bloqueada"). 5) Substituir os dois blocos `companyData` por essa função. Trecho: `const stillOverdue = await tx.platformInvoice.count({ where: { companyId, status: 'OVERDUE', deletedAt: null, id: { not: invoice.id } } });` |
| Critério de aceite | Teste `apps/api/src/modules/finance/company-reactivation.spec.ts`: "não reativa empresa CANCELED", "não reativa suspensão manual/segurança", "não reativa com outra fatura OVERDUE", "reativa suspensão por inadimplência sem outra dívida", nos dois provedores. Manual: sandbox Asaas, empresa cancelada, enviar `PAYMENT_RECEIVED` -> empresa continua bloqueada e DEV é avisado. |
| Esforço | 6 h |
| Risco da correção | Médio: pode deixar cliente que pagou bloqueado se a lista de motivos estiver incompleta; mitigado pelo aviso ao DEV. |
| Depende de | D5 |

### PAG-02 — `PAYMENT_UPDATED` e `PAYMENT_RESTORED` sobrescrevem estado e `deletedAt`

> Status no repositório: correção em andamento, não commitada (ver 2.6).

| Campo | Conteúdo |
|---|---|
| Gravidade | Alta |
| Onda | 0 |
| Área | Pagamentos |
| Definição | Eventos de "cobrança alterada" são tratados como "fatura aberta" e gravam esse status por cima do real. Uma fatura vencida volta a "aberta" e uma cancelada ressuscita. |
| Como acontece / como reproduzir | Fatura `OVERDUE`; chegar `PAYMENT_UPDATED` (mudança de vencimento ou valor). A fatura vira `OPEN`, o cron de inadimplência (filtra `status: 'OVERDUE'`) deixa de bloquear até a conciliação de 6 h. Em fatura cancelada, `deletedAt` é zerado. |
| Evidência (arquivo:linha) | [CONF] `asaas-webhook.processor.ts:278` (mapa `PAYMENT_UPDATED -> OPEN`), `:155` (`deletedAt: ... : null`); [REL] `billing-cron.service.ts:368` |
| O que a documentação oficial diz (regra + URL + marcador) | `PAYMENT_UPDATED` = alteração de vencimento ou valor de cobrança existente: https://docs.asaas.com/docs/webhook-para-cobrancas (VIA BUSCA, rel. 04) |
| Impacto | Dinheiro: inadimplente adia o bloqueio; fatura cancelada reaparece. |
| Correção | 1) Em `statusFromEvent`, remover `PAYMENT_UPDATED` do grupo `OPEN`. 2) Para `PAYMENT_UPDATED`, atualizar só `amount`/`dueDate`/`invoiceUrl` e **preservar** `existing.status`. 3) Quando o payload trouxer `payment.status`, derivar o status por um mapa (`PENDING->OPEN`, `OVERDUE->OVERDUE`, `RECEIVED/CONFIRMED->PAID`) em vez de confiar no nome do evento. 4) `deletedAt` só é limpo em `PAYMENT_RESTORED` e só se `payment.deleted === false`. |
| Critério de aceite | Teste `asaas-webhook-updated-event.spec.ts`: "UPDATED não muda OVERDUE para OPEN", "UPDATED não limpa deletedAt", "RESTORED limpa deletedAt", "UPDATED atualiza vencimento". Manual: sandbox, alterar vencimento de fatura vencida e conferir que a regra de bloqueio continua valendo. |
| Esforço | 5 h |
| Risco da correção | Baixo; coberto por testes existentes de webhook (`apps/api/test/asaas-webhook.e2e-spec.ts`). |
| Depende de | - |

### PAG-03 — Mercado Pago sem conciliação periódica e com janela anti-replay de 5 minutos

> Status no repositório: parcial, `mercadopago-payment-sync.service.ts` criado e não commitado (ver 2.6).

| Campo | Conteúdo |
|---|---|
| Gravidade | Alta (se D6=B; Média se só Asaas) |
| Onda | 0 (condicional; Onda 1 se D6=A) |
| Área | Pagamentos |
| Definição | O cron que confere pagamentos só olha faturas do Asaas. Um webhook do Mercado Pago rejeitado ou perdido nunca é recuperado, e o webhook é rejeitado se o `ts` for mais velho que 300 s. |
| Como acontece / como reproduzir | Fatura MP paga; webhook chega 10 min depois (retry do MP) com o `ts` original: 403. Nenhum cron reconsulta. Empresa fica suspensa e a fatura aberta. |
| Evidência (arquivo:linha) | [CONF] `payment-reconciliation.service.ts:72` (`provider: 'ASAAS'`); `mercadopago.service.ts:224` (tolerância padrão 300 s); [CONF] `findPaymentForInvoice` só usado sob demanda (`platform-finance.service.ts:615,1525,1546`) |
| O que a documentação oficial diz (regra + URL + marcador) | MP reenvia notificações até receber 200/201: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks (VIA BUSCA, rel. 04). Se o retry reaproveita o `ts` original: NAO VERIFICADO. |
| Impacto | Dinheiro: cliente paga e continua bloqueado; risco de cobrança em duplicidade. |
| Correção | 1) Extrair do controller (`mercadopago-webhook.controller.ts:process`) a função `applyMercadoPagoPayment(invoice, payment)`. 2) No `PaymentReconciliationService.reconcile`, incluir faturas `provider: 'MERCADOPAGO'` com status `OPEN/OVERDUE` ou `paymentProcessingStatus` UNKNOWN/PROCESSING, consultar `mercadoPago.findPaymentForInvoice(invoice.id, invoice.mpPaymentId)` e aplicar a mesma função. 3) Repassar `MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS` no compose (hoje não passa) e subir o padrão para 3600, ou usar o `ts` só para log (o HMAC já o cobre). 4) Se D6=A: desligar o webhook do MP e manter o item em Onda 1. |
| Critério de aceite | Teste `payment-reconciliation-mercadopago.spec.ts`: "cron concilia fatura MP paga sem webhook", "webhook com ts de 10 min é aceito dentro da nova tolerância", "assinatura inválida continua 403". Manual: sandbox MP, pagar e bloquear o webhook; após o cron a fatura vira PAID. |
| Esforço | 10 h |
| Risco da correção | Médio: reaproveitar a mesma transição evita divergência; cuidado com corrida entre cron e webhook (ver PAG-09). |
| Depende de | D6, PAG-01 (a função extraída deve usar a regra nova de reativação), PAG-09 |

### PAG-04 — Asaas sem chave devolve `{}` em silêncio

| Campo | Conteúdo |
|---|---|
| Gravidade | Alta |
| Onda | 0 |
| Área | Pagamentos / configuração |
| Definição | Se `ASAAS_API_KEY` estiver vazia, qualquer chamada ao Asaas só registra um aviso e devolve um objeto vazio, como se tivesse dado certo. Quem lê `.id` do retorno pode gravar faturas sem vínculo com o Asaas. |
| Como acontece / como reproduzir | Subir a API em produção com `ASAAS_API_KEY` vazia (o compose usa `${ASAAS_API_KEY:-}`, e `env.validation.ts` não a exige). Fazer checkout: nenhuma cobrança criada, mas a fatura local existe. |
| Evidência (arquivo:linha) | [CONF] `apps/api/src/modules/finance/asaas.service.ts:75-78`; compose `docker-compose.prod.yml:85` (valor padrão vazio) |
| O que a documentação oficial diz (regra + URL + marcador) | n/a (regra interna: falhar alto em produção). |
| Impacto | Dinheiro: cliente acha que está cobrado e não está; faturas órfãs. |
| Correção | 1) Em `request`, se `!this.apiKey` e `NODE_ENV === 'production'`: `throw new ServiceUnavailableException('Provedor de pagamento não configurado')`. 2) Fora de produção, manter o retorno vazio **somente** com `ALLOW_MOCK_PAYMENTS=true`; senão lançar. 3) `grep -rn "asaas\.\(createCharge\|createSubscription\|createCustomer\)"` e garantir que todo chamador usa `isConfigured()` antes. 4) Em produção, exigir `ASAAS_API_KEY` no boot **quando** `PAYMENT_PROVIDER=asaas` (`env.validation.ts`). |
| Critério de aceite | Teste `asaas-service-unconfigured.spec.ts`: "produção sem chave lança 503", "dev sem ALLOW_MOCK_PAYMENTS lança", "dev com ALLOW_MOCK_PAYMENTS devolve vazio". Manual: `docker compose exec api printenv ASAAS_API_KEY \| wc -c` deve ser > 1 em produção. |
| Esforço | 3 h |
| Risco da correção | Baixo; pode revelar chamadores que dependiam do `{}` em dev/CI (ajustar fixtures). |
| Depende de | INF-01 (variável chega ao container) |

### SEG-01 — API do Express usada sob Fastify: upload e download respondem 500

> Status no repositório: parcial, migração para `reply`/`readMultipartUpload` em andamento e não commitada (ver 2.6).

| Campo | Conteúdo |
|---|---|
| Gravidade | Alta |
| Onda | 0 |
| Área | Segurança / uploads |
| Definição | O servidor usa Fastify, mas quatro rotas usam recursos que só existem no Express (`FileInterceptor`, `res.set`, `stream.pipe(res)`). Elas falham com 500. Enquanto isso, o aviso de vulnerabilidade do `multer` não tem superfície real. |
| Como acontece / como reproduzir | `POST /support/tickets/:id/attachments` com arquivo -> 500 `req.on is not a function`; `GET /support/tickets/:id/attachments/:attachmentId/download`, `GET /escalas/punch/receipt/:receipt/pdf` e `POST /escalas/launch/attachment` idem. Reproduzido por 05 em app mínimo. |
| Evidência (arquivo:linha) | [CONF] `support/support.controller.ts:3,4,88,107-113`; `schedule-hub/hub.controller.ts:2,152,164`; `schedule-hub/punch/punch.controller.ts:27-28`; `main.ts:47` (`FastifyAdapter`); correto como referência: `employees/employees-import.controller.ts:58` (`req.file()`). **Mesma causa, não reproduzida:** `finance/finance.controller.ts:54-58` (`res.setHeader`) |
| O que a documentação oficial diz (regra + URL + marcador) | Upload nativo do Nest é baseado em multer e não é compatível com `FastifyAdapter` (usar `@fastify/multipart`): https://docs.nestjs.com/techniques/file-upload (VIA BUSCA, rel. 05); adaptador: https://docs.nestjs.com/techniques/performance |
| Impacto | Cliente: anexos de suporte, anexo de lançamento de escala e recibo de ponto em PDF não funcionam. |
| Correção | 1) Upload: trocar `@UseInterceptors(FileInterceptor('file'))`/`@UploadedFile()` por `const part = await req.file()` (padrão de `employees-import.controller.ts:58`) e ler o buffer (limite já em `@fastify/multipart` 10 MB). 2) Download/PDF: `reply.header('Content-Type', ...).header('Content-Disposition', contentDisposition(name)).send(stream)` (ou `send(buffer)`), nunca `res.set`, `res.end`, `res.setHeader` nem `stream.pipe(reply)`. 3) Corrigir `finance.controller.ts:54-58` (`@Res() reply: FastifyReply`, `reply.header(...).send(content)`). 4) Trocar `import { Response } from 'express'` (`support.controller.ts:4`) por `FastifyReply`. 5) Quando não restar import de `@nestjs/platform-express`/`multer`, remover ambos (fecha o advisory do multer em DEP-03). 6) Criar teste e2e com `FastifyAdapter` real (os unitários com mock não pegam isso). |
| Critério de aceite | Testes `apps/api/test/fastify-binary-responses.e2e-spec.ts`: "upload de anexo de suporte devolve 201", "download devolve 200 com Content-Disposition seguro", "recibo de ponto PDF devolve 200", "CSV de receita devolve 200", "anexo de escala 201/200". Manual: `curl -F file=@x.pdf` na rota e abrir o download. |
| Esforço | 12 h |
| Risco da correção | Médio: fluxos sem uso em produção hoje (falhavam), então regressão é baixa; atenção ao limite de 10 MB e ao antivírus (SEG-04). |
| Depende de | SEG-04 (ativar o upload exige o scan fail-closed) |

### SEG-02 — Perfis de leitura (CONSULTA, GESTOR) gravam e apagam ASO

> Status no repositório: **corrigido e commitado** em `54507429` (ver 2.6). Restam o teste de inventário e a decisão sobre GESTOR. A evidência abaixo é do código anterior ao commit.

| Campo | Conteúdo |
|---|---|
| Gravidade | Alta |
| Onda | 0 |
| Área | Autorização / dado de saúde |
| Definição | A classe inteira do controle de ASO permite `CONSULTA` e `GESTOR`, e os métodos de escrita não restringem mais. Quem só deveria ler consegue criar, alterar e apagar atestado de saúde ocupacional. |
| Como acontece / como reproduzir | Logar como `CONSULTA` e chamar `POST /management/aso`, `PATCH /management/aso/:id`, `DELETE /management/aso/:id`, `POST|DELETE /management/aso/clinic-presets`: esperado 403, hoje passam. |
| Evidência (arquivo:linha) | [CONF] `apps/api/src/modules/management/aso.controller.ts:12` (`@Roles('DEV','ADMIN','RH','GESTOR','CEO','CONSULTA')` na classe), `:39,44,56,61,66` (escritas sem `@Roles`). Referência da intenção: [REL] `sst.controller.ts` restringe `complete` a DEV/ADMIN/RH |
| O que a documentação oficial diz (regra + URL + marcador) | NestJS guards/`@Roles` por método sobrescreve a classe: https://docs.nestjs.com/guards (NAO VERIFICADO; comportamento confirmado no código `roles.guard.ts:11` com `getAllAndOverride`) |
| Impacto | Segurança/LGPD: adulteração de dado de saúde (dado sensível, art. 11 LGPD) por perfil sem permissão. |
| Correção | 1) Em `aso.controller.ts` adicionar `@Roles('DEV','ADMIN','RH')` nos 5 métodos de escrita (`POST /`, `PATCH :id`, `DELETE :id`, `POST` e `DELETE clinic-presets`). 2) Confirmar com o produto se `GESTOR` deve criar ASO da própria equipe (se sim, escopar por equipe, não liberar geral). 3) Gerar teste que percorre todas as rotas não-GET e falha se a lista de papéis for igual à da classe de leitura (ver SEG-09). |
| Critério de aceite | `apps/api/src/modules/management/aso.controller.spec.ts`: "CONSULTA recebe 403 em POST/PATCH/DELETE de ASO e de presets", "GESTOR recebe 403", "RH recebe 201/200". Manual: curl com token de CONSULTA -> 403. |
| Esforço | 3 h |
| Risco da correção | Baixo (se o front mostrava botões a esses perfis, ocultá-los). |
| Depende de | - |

### SEG-03 — Tabelas globais de regras de folha editáveis por CONTABIL

> Status no repositório: **corrigido e commitado** em `c9541c7a` (só DEV). A evidência abaixo é do código anterior ao commit.

| Campo | Conteúdo |
|---|---|
| Gravidade | Alta |
| Onda | 0 |
| Área | Autorização / dado de outra empresa |
| Definição | As tabelas de INSS, IRRF, FGTS e parâmetros de cálculo são únicas para todos os clientes, mas qualquer usuário `CONTABIL` de qualquer escritório pode criar nova versão ou desativar. Um escritório altera o cálculo de folha de todas as empresas da plataforma. |
| Como acontece / como reproduzir | Token de um `CONTABIL`: `POST /accounting/rules` (nova versão) ou `DELETE /accounting/rules/:id`. Esperado 403; hoje passa. |
| Evidência (arquivo:linha) | [CONF] `accounting/accounting.controller.ts:17-19` (`@Roles('DEV','CEO','CONTABIL')` na classe), `:69-83` (`rules`: list/save/delete/simulate sem restrição extra); `accounting-rules.service.ts:123-154` (`payrollTaxTable` sem empresa) |
| O que a documentação oficial diz (regra + URL + marcador) | n/a (regra interna) |
| Impacto | Dinheiro e lei: cálculo trabalhista errado em todos os tenants; sem trilha de aprovação. |
| Correção | 1) D3=B: `@Roles('DEV','CEO')` em `saveRule` e `deactivateRule`; `listRules` e `simulate` seguem com CONTABIL (somente leitura). 2) Gravar `auditLog` com ator em `saveVersion/deactivate`. 3) (D3=C, depois) fluxo de proposta e aprovação. |
| Critério de aceite | `accounting-rules.controller.spec.ts`: "CONTABIL recebe 403 em POST e DELETE de rules", "CONTABIL lê rules (200)", "DEV/CEO gravam (201) e geram auditLog". |
| Esforço | 4 h |
| Risco da correção | Baixo; avisar escritórios que usam a tela. |
| Depende de | D3 |

### SEG-04 — Scan de anexos de suporte é assíncrono e fail-open

| Campo | Conteúdo |
|---|---|
| Gravidade | Alta |
| Onda | 0 |
| Área | Segurança / uploads |
| Definição | O arquivo é gravado como `QUARANTINED` e o antivírus roda depois, sem aguardar. Se o ClamAV não iniciar ou falhar, o arquivo fica em quarentena para sempre, mas o download só bloqueia `REJECTED`. Hoje está oculto pela quebra do upload (SEG-01); ao corrigir SEG-01 o risco aparece. |
| Como acontece / como reproduzir | Com SEG-01 corrigido e ClamAV parado: enviar anexo -> `QUARANTINED`; baixar -> 200. |
| Evidência (arquivo:linha) | [CONF] `support/support-attachment.service.ts:85-102` (grava `QUARANTINED` e dispara scan), `:106` (`if (!this.clamscan) return;`), `:124-133` (download bloqueia só `REJECTED`). Contraste: `jobs/candidate-document-scanner.service.ts:36-52` (fail-closed) |
| O que a documentação oficial diz (regra + URL + marcador) | OWASP File Upload Cheat Sheet (antivírus e quarentena): https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html (VIA BUSCA, rel. 05) |
| Impacto | Segurança: malware servido a atendentes/clientes. |
| Correção | 1) Em `downloadAttachment`, bloquear se `status !== 'CLEAN'` (409/423 com mensagem "arquivo em verificação"). 2) Em produção, exigir scanner no upload reutilizando `CandidateDocumentScanner.assertClean` (falha fechada, 503). 3) Usar o MIME detectado por `inspectFile`, não o `declaredMimeType` do cliente (`support.controller.ts:108`). 4) Cron que reprocessa anexos `QUARANTINED` há mais de 10 min. |
| Critério de aceite | `support-attachment-scan.spec.ts`: "download de QUARANTINED é bloqueado", "upload sem ClamAV em produção devolve 503", "CLEAN baixa com MIME detectado". |
| Esforço | 5 h |
| Risco da correção | Baixo. |
| Depende de | SEG-01, INF-08 (healthcheck/ordem do ClamAV) |

### INF-02 — Robô de QA flutuante ligado por padrão no build de produção

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 0 |
| Área | Infra / web |
| Definição | A variável de build `NEXT_PUBLIC_ROBO_QA` vale `on` por padrão no Dockerfile do web e no compose, então o robô de teste aparece no site de produção para clientes reais. |
| Como acontece / como reproduzir | Fazer o build sem definir a variável: o robô fica ativo. |
| Evidência (arquivo:linha) | [CONF] `apps/web/Dockerfile:10-12`; `docker-compose.prod.yml:159` (`${NEXT_PUBLIC_ROBO_QA:-on}`) |
| O que a documentação oficial diz (regra + URL + marcador) | n/a. Variáveis `NEXT_PUBLIC_*` são fixadas no build do Next (NAO VERIFICADO online). |
| Impacto | Cliente: elemento de teste visível; superfície extra de código de QA em produção. |
| Correção | 1) Mudar o padrão para `off` no Dockerfile e no compose. 2) Ligar apenas em staging via `.env`. 3) Rebuild do web. |
| Critério de aceite | Teste `apps/web` (ou Playwright `tests-e2e`): "home de produção não renderiza o robô". Manual: abrir o site e não ver o botão flutuante. |
| Esforço | 1 h |
| Risco da correção | Baixo. |
| Depende de | D12 |

### PAG-05 — Estorno total não altera a fatura nem o acesso

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 0 |
| Área | Pagamentos / relatórios |
| Definição | Quando o estorno é confirmado, o sistema só registra o valor estornado e cancela a NFS-e. A fatura continua "paga" e a empresa continua ativa, enquanto um chargeback suspende a empresa. A política é inconsistente e a receita pode ser contada em dobro. |
| Como acontece / como reproduzir | Estornar totalmente uma fatura paga pelo painel; chega `PAYMENT_REFUNDED`. `refunds.reconcile` grava `refundedAmount/refundStatus`; `status` segue `PAID`. |
| Evidência (arquivo:linha) | [CONF] `mercadopago-webhook.controller.ts:81-85` (reconcile e retorno); [REL] `asaas-webhook.processor.ts:115-121`, `payment-refund.service.ts:151`; relatório de receita não conferido (`platform-revenue-report.ts`) |
| O que a documentação oficial diz (regra + URL + marcador) | n/a (regra de negócio) |
| Impacto | Dinheiro: receita reconhecida errada; cliente reembolsado mantém acesso. |
| Correção | 1) Decidir D4. 2) Aplicar a decisão em **um** ponto: dentro de `refunds.reconcile` quando `refundedAmount >= amount`. 3) Verificar `platform-revenue-report.ts` e excluir faturas com `refundStatus` total da receita. 4) Remover as entradas mortas `PAYMENT_REFUNDED` de `statusFromEvent`/`PAYMENT_EVENT_MAP` se de fato não alcançáveis. |
| Critério de aceite | Teste `payment-refund-total-policy.spec.ts`: "estorno total aplica a política D4 uma única vez", "estorno parcial não muda acesso", "relatório mensal não soma fatura totalmente estornada". |
| Esforço | 4 h |
| Risco da correção | Médio (afeta acesso do cliente). |
| Depende de | D4 |

### PAG-06 — Cartão CONFIRMED conta como pago (nota fiscal sai antes do saldo)

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 0 (decisão); implementação da opção B pode ir à Onda 1 |
| Área | Pagamentos / fiscal |
| Definição | No cartão, "CONFIRMED" significa aprovado, mas o dinheiro ainda não está disponível. O sistema trata CONFIRMED igual a RECEIVED e emite a NFS-e já na confirmação; se houver chargeback depois, a nota já saiu. |
| Como acontece / como reproduzir | Pagar com cartão no sandbox: eventos `PAYMENT_CONFIRMED` e depois `PAYMENT_RECEIVED`. A NFS-e e `gatewayNetValue` são gravados no primeiro. |
| Evidência (arquivo:linha) | [CONF] `asaas-webhook.processor.ts:275` (`CONFIRMED` e `RECEIVED` -> `PAID`) |
| O que a documentação oficial diz (regra + URL + marcador) | CONFIRMED = pagamento feito, saldo não disponível; RECEIVED = valor disponível: https://docs.asaas.com/docs/webhook-para-cobrancas (VIA BUSCA, rel. 04) |
| Impacto | Dinheiro/fiscal: risco de nota emitida sobre chargeback (baixo a médio). |
| Correção | 1) Fechar D1. 2) Opção A: documentar e manter. 3) Opção B: manter `PAID` e acesso em CONFIRMED, mas emitir NFS-e e registrar `gatewayNetValue` somente em `PAYMENT_RECEIVED` para `billingType = CREDIT_CARD` (guardar `confirmedAt` e `receivedAt`). |
| Critério de aceite | Teste `asaas-card-confirmed.spec.ts`: "CONFIRMED libera acesso mas não emite NFS-e" e "RECEIVED emite NFS-e uma vez". |
| Esforço | 2 h (A) / 8 h (B) |
| Risco da correção | Baixo na A; Médio na B (sincronia com `asaas-fiscal.service`). |
| Depende de | D1 |


## Catálogo - Onda 1 - até 30 dias

### DEP-01 — Next 14.2.35 sem patches: vulnerabilidades críticas/altas

| Campo | Conteúdo |
|---|---|
| Gravidade | Alta |
| Onda | 1 |
| Área | Dependências / web |
| Definição | O web usa Next 14.2.35, a última versão da linha 14, que não recebe mais correções. O `npm audit` aponta 30 avisos, incluindo 3 críticos (execução remota no otimizador de imagens e em host Windows) e vários altos (SSRF no upgrade de WebSocket, negação de serviço em Server Actions, desvio de middleware com i18n). Usa também React 18 e ESLint 8 (sem suporte). |
| Como acontece / como reproduzir | `npm audit --omit=dev` (em Node 24/npm 11) lista `next` como critical. |
| Evidência (arquivo:linha) | [CONF] `apps/web/next.config.js:11` (`images.unoptimized: true`); [REL] 03 §3.1 (GHSA-p293-qw3h-jr36, -2xp9-vwfh-vxw4, -2464-fhr4-w9xw, -c4j6-fc7j-m34r, -36qx-fr4f-26g5 etc.; faixas corrigidas >=15.5.28 e 16.x; alvo 16.4.3). **Gravidade rebaixada de Crítica para Alta** porque `unoptimized: true` desliga o otimizador de imagens (vetor de 2 dos 3 críticos), deploy não é Windows e a API é separada; ainda assim há avisos altos aplicáveis (DoS, SSRF, middleware). |
| O que a documentação oficial diz (regra + URL + marcador) | Guias de upgrade 14->15->16: https://nextjs.org/docs/app/guides/upgrading (NAO VERIFICADO; nextjs.org bloqueado). Advisories via `npm audit` (VERIFICADO, rel. 03). |
| Impacto | Segurança e disponibilidade do site; ESLint/`next lint` sem suporte. |
| Correção | 1) Branch dedicada (existe `chore/atualiza-next`, de outro agente: reaproveitar). 2) Node 24/npm 11. 3) `npm install next@16.4.3 react@19.3.1 react-dom@19.3.1 react-is@19.3.1 --workspace apps/web` e `-D eslint-config-next@16.4.3 @types/react@19 @types/react-dom@19`. 4) Itens a vigiar (03 §4): `params`/`searchParams` assíncronos (38 arquivos com `params: {`), `redirects()` com `has/query`, remoção de `next lint` (migrar para ESLint CLI/flat config), `forwardRef` (5 arquivos), `framer-motion`/`lucide-react` compatíveis com React 19. 5) Reexecutar SEG-07 (middleware/headers). 6) Atualizar `images.yml` para build-args `NEXT_PUBLIC_*`. |
| Critério de aceite | `npm audit --omit=dev` sem `next`; `npm run quality:gate` e `npm run test:e2e` (Playwright) verdes; smoke manual de login, dashboard, ponto, carreiras e checkout. |
| Esforço | 40 h |
| Risco da correção | Alto (2 majors + React 19); fazer com staging e rollback por SHA. |
| Depende de | INF-11 (CI atualizado), SEG-07 |

### DEP-03 — Correções do mesmo major (fastify, multer, nodemailer, zod, class-validator, body-parser)

| Campo | Conteúdo |
|---|---|
| Gravidade | Alta |
| Onda | 1 |
| Área | Dependências |
| Definição | Vários pacotes de produção têm correção publicada sem mudar de major: `multer` 2.4.0 (negação de serviço), `body-parser`/`express` (DoS), `nodemailer` 10.1.0 (3 avisos de destinatário extra), `zod` 4.4.3 (memória), `fastify` 5.12.5 (cabeçalho), `fast-uri`, `qs`, e `class-validator` 0.14.1 com `validator.js` com falhas já corrigidas. |
| Como acontece / como reproduzir | `npm audit --omit=dev`. |
| Evidência (arquivo:linha) | [REL] 03 §3.1 e §3.3 (GHSA-q7qp-rjg7-q26m, -27r3-jxmh-p828, -8c8m-p3m8-cjg8, -mrhx-c7xc-m3w5, -389g-gv7q-r4x8); versões-alvo: `fastify 5.12.7`, `multer 2.5.0`, `nodemailer 10.3.1`, `zod 4.6.7`, `class-validator 0.14.4`, `express 5.3.0` |
| O que a documentação oficial diz (regra + URL + marcador) | Avisos GHSA via `npm audit` (VERIFICADO, rel. 03); NVD/GitHub direto: NAO VERIFICADO. |
| Impacto | Segurança/disponibilidade: DoS e validação de e-mail do `nodemailer` (destinatário extra em e-mails de reset/convite). |
| Correção | Comando de 03 §7 P0-3 (em Node 24): `npm install fastify@5.12.7 @fastify/static@10.1.8 && npm install -w apps/api multer@2.5.0 nodemailer@10.3.1 @fastify/cookie@^11.1.5 @fastify/helmet@^13.2.0 @fastify/multipart@10.1.6 express@^5.3.0 class-validator@0.14.4 zod@4.6.7 && npm install -w apps/web zod@4.6.7 && npm install class-validator@0.14.4 && npm update body-parser qs fast-uri`. Se SEG-01 remover multer/`@nestjs/platform-express`, não atualizar multer, remover. |
| Critério de aceite | `npm audit --omit=dev` sem esses pacotes; `npx vitest run` e `npm run typecheck:api` verdes; smoke de envio de e-mail e validação de DTO. |
| Esforço | 4 h |
| Risco da correção | Baixo. |
| Depende de | SEG-01 (para decidir multer) |

### INF-05 — Backup: cópia remota opcional e rotina interna inoperante

| Campo | Conteúdo |
|---|---|
| Gravidade | Alta |
| Onda | 1 (**recomendo antecipar a configuração para antes do 1º cliente pagante; não exige código**) |
| Área | Infra / continuidade |
| Definição | O backup real é um script no host. Se `BACKUP_REMOTE` ficar vazio, a cópia fica no mesmo disco da VPS (perde-se tudo junto). Além disso, a API tem um `@Cron` de backup à meia-noite que roda `pg_dump` dentro do container, onde `pg_dump` não existe e a pasta não está em volume. Redis tem `appendonly` e filas, sem política de memória. |
| Como acontece / como reproduzir | Ver logs à 00:00 UTC: falha do `pg_dump`. Na VPS: `ls storage/backups` e `crontab -l`. |
| Evidência (arquivo:linha) | [CONF] `apps/api/src/database/backup.service.ts:21-40` (cron `EVERY_DAY_AT_MIDNIGHT`, `storage/backups` em `process.cwd()`); [REL] `scripts/backup/backup.sh` (`BACKUP_REMOTE`, `BACKUP_ENCRYPTION_PASSPHRASE`), `infra/RUNBOOK-backup-e-resiliencia.md`; `docker-compose.prod.yml` (volumes: `postgres_data`, `redis_data`, `api_data`, `clamav_data`) |
| O que a documentação oficial diz (regra + URL + marcador) | Postgres `pg_dump` e restore testado (NAO VERIFICADO, bloqueado); regra 3-2-1 (prática). |
| Impacto | Dinheiro/lei: perda total de dados em falha de disco ou ransomware; sem prova de restore. |
| Correção | 1) Configurar `BACKUP_REMOTE=s3` (R2/B2/S3) com `BACKUP_S3_*` e `BACKUP_ENCRYPTION_PASSPHRASE` (guardar a senha fora da VPS). 2) Rodar `scripts/backup/restore-test.sh` em outra máquina e registrar a data. 3) Incluir os volumes `api_data` (currículos/anexos) no backup. 4) Remover `BackupService` da API (ou reduzir a alerta "backup externo não configurado") para não dar falsa segurança. 5) Alerta se o último backup remoto tiver > 26 h. 6) Definir RPO/RTO (sugestão: RPO 24 h, RTO 4 h). |
| Critério de aceite | Script `scripts/backup/verify-remote.sh` (a criar) retorna 0 se existir objeto remoto das últimas 26 h; `restore-test.sh` concluído com sucesso e logado. Manual: restaurar em banco limpo e contar linhas de `Company`. |
| Esforço | 8 h |
| Risco da correção | Baixo. |
| Depende de | - |

### API-01 — `throw new Error` vira 500 (32 rotas)

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 |
| Área | API / status |
| Definição | Em 32 rotas existe um caminho que lança `Error` genérico em vez de uma exceção HTTP. O filtro global responde 500, mesmo quando o problema é do pedido (ex.: dados inválidos, estado incompatível). |
| Como acontece / como reproduzir | `POST /payroll/termination/simulate` ou `/finalize` com dados inconsistentes; `POST /auth/mfa/verify|enable|disable` com estado inválido; `GET /faturas/*/invoices/:id/pdf`. |
| Evidência (arquivo:linha) | [REL] 01a (lista de 11 rotas) e 01b #13 (32 rotas); [CONF] ex. `asaas-webhook.processor.ts:120-121,137` (`throw new Error('Devolução sem fatura vinculada...')`, `'Serviço de devoluções indisponível.'`, `'Cobrança não corresponde à fatura reservada.'`; no Mercado Pago o mesmo padrão existia em `mercadopago-webhook.controller.ts:82` antes das edições em curso) |
| O que a documentação oficial diz (regra + URL + marcador) | RFC 9110 §15.5 (4xx = erro do cliente) e §15.6.1 (500 = condição inesperada): https://www.rfc-editor.org/rfc/rfc9110 (NAO VERIFICADO online; conhecimento prévio) |
| Impacto | Cliente: mensagem genérica e `requestId` em vez de motivo; alertas de 500 poluídos. |
| Correção | 1) Rodar o extrator `docs/auditoria/scripts/extrair-rotas-b.mjs` para listar as 32 rotas e os `throw new Error` alcançáveis. 2) Trocar por `BadRequestException` (dado inválido), `ConflictException` (estado incompatível), `UnprocessableEntityException` (regra de negócio) ou `ServiceUnavailableException`. 3) **Exceção deliberada**: nos webhooks, 5xx faz o provedor reenviar; manter 5xx apenas nas falhas transitórias e responder 2xx + log para eventos que nunca vão processar. |
| Critério de aceite | `http-status-contract.spec.ts` por módulo: cada rota listada devolve o 4xx esperado. Meta: zero `throw new Error` em controllers/serviços chamados por rota, fora das exceções documentadas (lint `no-restricted-syntax`). |
| Esforço | 12 h |
| Risco da correção | Baixo-médio (clientes que tratavam 500 como retry). |
| Depende de | - |

### DEP-02 — Remover `jimp` (não usado; ~27 avisos altos)

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 |
| Área | Dependências |
| Definição | `jimp` está declarado na raiz mas nenhum arquivo do repositório o importa. Ele e seus 26 subpacotes respondem por 27 dos 44 avisos de produção. |
| Como acontece / como reproduzir | `grep -rn jimp --include=*.ts --include=*.tsx --include=*.js --include=*.cjs --include=*.mjs . \| grep -v node_modules` retorna só o `package.json`. |
| Evidência (arquivo:linha) | [CONF] `package.json:75` (`"jimp": "1.6.1"`), única ocorrência fora de `node_modules`; [REL] 03 §1 (27 de 44) |
| O que a documentação oficial diz (regra + URL + marcador) | n/a (`npm audit`, VERIFICADO em 03) |
| Impacto | Segurança: ruído e superfície sem uso; imagem maior. |
| Correção | Conferir `scripts/`, `tools/`, docs e Dockerfiles (`grep -rn jimp`); `npm uninstall jimp`; rodar `npm run quality:gate`. |
| Critério de aceite | `npm audit --omit=dev` cai de 44 para ~17; typecheck e testes verdes. |
| Esforço | 1 h |
| Risco da correção | Baixo. |
| Depende de | - |

### INF-03 — Redis fora do ar desliga lock de cron e limites (fail-open)

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 |
| Área | Infra / agendadores |
| Definição | Quando o Redis cai, o lock de cron devolve "pode executar" para todas as instâncias e o contador de limite devolve 0 (nunca bloqueia). Com uma única instância (situação atual) isso não duplica jobs, mas com 2+ instâncias os jobs de cobrança, cancelamento e estorno podem rodar em dobro. O Redis do compose também não tem `maxmemory`. |
| Como acontece / como reproduzir | Parar o Redis com 2 instâncias da API: cada uma executa `billing.applyScheduledCancellations`. |
| Evidência (arquivo:linha) | [CONF] `common/redis/redis.service.ts:72` (`if (!this.isConnected) return true`), `:77` (catch -> `true`), `:125-130` (`incr` -> 0); `common/redis/cron-lock.decorator.ts:34-39`; [REL] `docker-compose.prod.yml` Redis 384m sem `maxmemory` |
| O que a documentação oficial diz (regra + URL + marcador) | Locks distribuídos exigem falhar fechado para jobs não idempotentes; Redis `maxmemory` e eviction: https://redis.io/docs/latest/ (NAO VERIFICADO, bloqueado) |
| Impacto | Dinheiro: cobrança, cancelamento ou estorno duplicados em escala horizontal. |
| Correção | 1) `@CronLock(..., { failClosed: true })` para os crons classificados "alto" em 02 §2.2 (`applyScheduledSeatReductions`, `applyScheduledPlanChanges`, `applyScheduledCancellations`, `createTrialConversionProposals`, `checkOverdueInvoices`, `finance.reconcileRefunds`); sem Redis, não executa e alerta. 2) Alternativa mais robusta: lock por `pg_advisory_lock` no Postgres. 3) Rate limit sem Redis cai para memória (ver SEG-05). 4) Redis: `--maxmemory 300mb --maxmemory-policy noeviction` (filas Bull não podem ser evictadas) e alerta de uso. 5) Documentar: **não subir 2 instâncias** antes disso. |
| Critério de aceite | `cron-lock-failclosed.spec.ts`: "sem Redis, job crítico não executa", "com Redis, executa uma vez". Manual: `docker compose stop redis` e conferir logs. |
| Esforço | 6 h |
| Risco da correção | Baixo-médio (job crítico pode pular uma execução durante queda do Redis; precisa de alerta). |
| Depende de | - |

### INF-04 — Chamadas externas sem timeout em caminho do usuário

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 |
| Área | Infra / integrações |
| Definição | Quatro chamadas HTTP não têm tempo máximo: Mercado Pago (checkout/webhook), ReceitaWS (consulta de CNPJ no painel DEV), geocodificação Nominatim no cadastro da empresa e feriados BrasilAPI. Um provedor lento prende a requisição. (A batida de ponto já tem 2,5 s e **não** entra: `punch.service.ts:55`.) |
| Como acontece / como reproduzir | Bloquear a saída para o host (ou usar um servidor que não responde) e chamar `POST /companies` ou a consulta de CNPJ: a requisição fica pendurada até o timeout do proxy. |
| Evidência (arquivo:linha) | [CONF] `finance/mercadopago.service.ts:78`; `platform/platform.service.ts:314`; `companies/geocoding.service.ts:13`; `holidays/holidays.service.ts:28` (sem `signal`). OpenAI: moderação sem timeout explícito [REL 02] |
| O que a documentação oficial diz (regra + URL + marcador) | `fetch` com `AbortSignal.timeout(ms)` (padrão do Node): https://nodejs.org/api/globals.html#fetch (NAO VERIFICADO) |
| Impacto | Cliente: telas travadas; esgota pool de conexões. |
| Correção | `signal: AbortSignal.timeout(ms)`: MP 10 s (checkout) e 8 s (consultas); ReceitaWS 8 s; Nominatim 4 s com `try/catch` retornando `null`; feriados 8 s (ou remover, ver INF-16). Mapear `TimeoutError` para 503/504 amigável. Para ReceitaWS erro de rede deve virar 502/503, não 409 (hoje `ConflictException`). |
| Critério de aceite | `external-timeouts.spec.ts` com servidor falso lento: "cada chamada aborta no limite". |
| Esforço | 5 h |
| Risco da correção | Baixo. |
| Depende de | - |

### INF-06 — Imagens `node:20-alpine` (fim de vida) em `infra/`

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 |
| Área | Infra / dependências |
| Definição | Os Dockerfiles de `infra/` usam Node 20, cujo suporte acabou em 2026-04-30. O projeto exige Node 24. |
| Como acontece / como reproduzir | `grep -rn "node:20" infra` |
| Evidência (arquivo:linha) | [CONF] `infra/Dockerfile.api:1,15,25`; `infra/Dockerfile.web:1,15` (5 linhas `FROM node:20-alpine`). EOL: [REL] 03 §5 (espelho de endoflife.date; site bloqueado) |
| O que a documentação oficial diz (regra + URL + marcador) | Ciclo de vida do Node: https://nodejs.org/en/about/previous-releases (NAO VERIFICADO; 03 usou espelho) |
| Impacto | Segurança: sem patches; build incompatível com `engines`. |
| Correção | Trocar as 5 linhas por `node:24-alpine`; revisar `nginx:1.27-alpine` (tag não verificada) e decidir se `infra/Dockerfile.*` ainda é usado (se não, apagar: INF-09). |
| Critério de aceite | Teste de CI `tests/contract/dockerfiles.test.ts`: "nenhum Dockerfile usa node < 24". Manual: `grep -rn "node:20" infra` vazio. |
| Esforço | 1 h |
| Risco da correção | Baixo. |
| Depende de | - |

### INF-07 — Imagem da API roda como root, sem multi-stage nem HEALTHCHECK

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 |
| Área | Infra / containers |
| Definição | O Dockerfile da API instala tudo (inclusive devDependencies), compila e roda no mesmo estágio, como root, sem `HEALTHCHECK` próprio. Imagem maior e com mais superfície. A tag padrão `latest` dificulta rollback. |
| Como acontece / como reproduzir | `docker run --rm <imagem> id` mostra uid 0. |
| Evidência (arquivo:linha) | [CONF] `apps/api/Dockerfile:1-11` (`FROM node:24-alpine`, `RUN npm ci`, sem `USER`, sem multi-stage); `docker-compose.prod.yml` `image: ...:${IMAGE_TAG:-latest}` |
| O que a documentação oficial diz (regra + URL + marcador) | Boas práticas Docker (usuário não-root, multi-stage): https://docs.docker.com/build/building/best-practices/ (NAO VERIFICADO) |
| Impacto | Segurança: comprometimento da API vira root no container. |
| Correção | 1) Multi-stage: `deps` (npm ci), `build` (compila e `prisma generate`), `runtime` (`npm ci --omit=dev` + `dist` + `prisma` client). 2) `USER node` e volume `api_data` com dono `node`. 3) `HEALTHCHECK` com `wget /health/live`. 4) `IMAGE_TAG` obrigatório no compose de produção (`${IMAGE_TAG:?}`) e deploy por SHA. 5) Mesmo tratamento para `apps/web/Dockerfile`. |
| Critério de aceite | `docker run --rm <img> id -u` != 0; `docker compose ps` mostra healthy; imagem menor (comparar `docker image ls`). Teste `dockerfile-user.test.ts`. |
| Esforço | 6 h |
| Risco da correção | Médio (permissões do volume `api_data` e do Prisma engine). |
| Depende de | - |

### INF-08 — ClamAV sem healthcheck/ordem de subida; web sem espera pela API

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 |
| Área | Infra / containers |
| Definição | O ClamAV demora minutos para baixar assinaturas na primeira subida e não tem healthcheck; a API não espera por ele. Como o upload falha fechado em produção, currículos e anexos retornam 503 nesse período. O `web` depende da API sem `condition`. |
| Como acontece / como reproduzir | `docker compose up -d` do zero e enviar currículo nos primeiros minutos: 503. |
| Evidência (arquivo:linha) | [REL] 02 §1.1 e §3 (#13); `docker-compose.prod.yml` serviço `clamav` sem `healthcheck`, API sem `depends_on` dele |
| O que a documentação oficial diz (regra + URL + marcador) | Healthcheck do ClamAV (`clamdcheck.sh`) na imagem oficial: NAO VERIFICADO. |
| Impacto | Cliente: upload indisponível após cada reinício do ClamAV. |
| Correção | 1) `healthcheck` no clamav (`CMD clamdcheck.sh` ou `echo PING \| nc localhost 3310`), `start_period: 180s`. 2) `depends_on: clamav: condition: service_healthy` (ou aviso na tela quando o scanner estiver indisponível). 3) `web` com `depends_on: api: condition: service_healthy`. |
| Critério de aceite | Manual: `docker compose up -d` e verificar `docker compose ps` mostrando clamav healthy antes da API; teste de contrato do compose. |
| Esforço | 3 h |
| Risco da correção | Baixo. |
| Depende de | - |

### INF-09 — Compose e arquivos de infra legados/inseguros no repositório

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 |
| Área | Infra |
| Definição | Existem arquivos que, se usados por engano em produção, abrem portas ou atualizam imagens sem aprovação: `docker-compose.yml` da raiz (Redis sem senha, ClamAV e web em `0.0.0.0`), `infra/docker-compose.yml` (watchtower com `docker.sock`, cAdvisor privilegiado, `latest`, variáveis que o código não lê) e `render.yaml` (roda `db:seed` a cada start). A API recusa subir com os dois primeiros em `NODE_ENV=production`, mas isso não impede a exposição. |
| Como acontece / como reproduzir | `docker compose -f docker-compose.yml config` e verificar as portas. |
| Evidência (arquivo:linha) | [REL] 02 §1.2 e §1.3; `infra/Dockerfile.*` e `infra/nginx-web.conf` provavelmente legados (nginx servindo SPA estática, enquanto o web é Next em Node) |
| O que a documentação oficial diz (regra + URL + marcador) | n/a |
| Impacto | Segurança: erro humano expõe Redis/ClamAV; atualização automática sem `deploy.yml`. |
| Correção | 1) Decidir o que é produção (`docker-compose.prod.yml`) e **mover os demais para `docs/legado/` ou apagar**. 2) Se mantiver `infra/docker-compose.yml`: remover watchtower e `privileged`, fixar versões, ligar portas a `127.0.0.1`, corrigir nomes de variáveis. 3) Remover `db:seed` do `render.yaml`. 4) Prometheus aponta para serviços que não existem no compose: corrigir ou remover. |
| Critério de aceite | `tests/contract/compose-ports.test.ts`: "nenhum compose de produção publica Redis/ClamAV/DB em 0.0.0.0"; manual: `ss -ltn` na VPS só mostra 80/443/22. |
| Esforço | 6 h |
| Risco da correção | Baixo. |
| Depende de | - |

### INF-10 — nginx: sem TLS endurecido, timeouts, limite de requisições e host fixo (o nginx real não foi verificado)

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 |
| Área | Infra / proxy |
| Definição | O exemplo de nginx do repositório tem hostname fixo (`vps8369.panel.icontainer.net`), não define protocolos/cifras TLS, HSTS, `server_tokens off`, `limit_req` para `/api/auth/*`, timeouts de leitura/envio, e usa `client_max_body_size` de 50M (outro exemplo usa 25m) enquanto a API aceita 1 MiB/14 MiB. `/api/metrics` e `/api/health` completo ficam acessíveis de fora (só `METRICS_TOKEN` protege). O nginx real do host não foi visto. |
| Como acontece / como reproduzir | `curl -sI https://<dominio>/api/metrics` e `curl https://<dominio>/api/health`; `nginx -T` na VPS. |
| Evidência (arquivo:linha) | [CONF] `infra/nginx-lb.conf:11` (50M), `:24,31` (hostname fixo); `infra/nginx-host-performance.conf:44` (25m comentado); [REL] 05 §9 |
| O que a documentação oficial diz (regra + URL + marcador) | NAO VERIFICADO (nginx.org/Mozilla SSL config não consultados). |
| Impacto | Segurança e disponibilidade: força bruta sem limite no proxy; métricas expostas; upload de 50M ocupando workers. |
| Correção | 1) Rodar `nginx -T` na VPS e comparar com o repositório; versionar o arquivo real em `infra/`. 2) `ssl_protocols TLSv1.2 TLSv1.3`, HSTS, `server_tokens off`. 3) `limit_req_zone` para `location /api/auth/` (ex.: 10r/m por IP) e `/api/public/`. 4) `deny all` ou allowlist para `/api/metrics`, `/api/health` (manter `/api/health/live` interno). 5) `client_max_body_size 15m` global e valores maiores só nas rotas de upload; `proxy_read_timeout 60s`, `client_body_timeout 30s`. 6) Parametrizar hostname (`$host`/template). |
| Critério de aceite | Manual: `curl -sI` mostra HSTS; 429 após rajada em `/api/auth/login`; `/api/metrics` de fora -> 403/404; teste de configuração `nginx -t`. Teste de contrato do arquivo versionado. |
| Esforço | 6 h |
| Risco da correção | Médio (config de proxy em produção; usar `nginx -t` e reload, não restart). |
| Depende de | INF-09 |

### INF-11 — GitHub Actions por tag móvel, desatualizadas; imagens `claude/**` no mesmo repositório que a produção

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 |
| Área | Infra / supply chain |
| Definição | Nenhuma action está fixada por SHA. Oito de nove estão 1 a 3 majors atrás. A action de SSH recebe a chave de produção. O workflow de imagens também publica builds de branches `claude/**` no mesmo namespace do qual a produção puxa. |
| Como acontece / como reproduzir | `grep -rn "uses:" .github/workflows` |
| Evidência (arquivo:linha) | [CONF] `.github/workflows/deploy.yml:30,46` (`appleboy/ssh-action@v1.2.0`); `.github/workflows/images.yml:7` (`branches: [main, 'claude/**']`). [REL] versões mais recentes em 03 §6 (`git ls-remote`) |
| O que a documentação oficial diz (regra + URL + marcador) | Fixar actions por SHA completo: https://docs.github.com/actions/security-guides/security-hardening-for-github-actions (NAO VERIFICADO, bloqueado) |
| Impacto | Segurança: comprometimento de uma action de terceiros vaza a chave SSH de produção. |
| Correção | 1) Atualizar: `actions/checkout@v7`, `setup-node@v7`, `upload-artifact@v7`, `docker/build-push-action@v7`, `login-action@v4`, `setup-buildx-action@v4`, `codeql-action@v4`, `softprops/action-gh-release@v3`, `appleboy/ssh-action@v1.2.5` (testar numa branch). 2) Fixar as de terceiros por SHA com comentário de versão (`git ls-remote https://github.com/appleboy/ssh-action refs/tags/v1.2.5`). 3) `images.yml`: tag `latest`/SHA só para `main`; branches `claude/**` com sufixo/namespace próprio ou remover. 4) Confirmar se o `dependabot.yml` está gerando PRs e se estão sendo ignorados. |
| Critério de aceite | Teste de CI `tests/contract/workflows.test.ts`: "toda action de terceiros usa SHA de 40 hex". Manual: workflow `ci` verde na branch. |
| Esforço | 4 h |
| Risco da correção | Baixo-médio (majors novos podem exigir ajuste). |
| Depende de | - |

### INF-12 — Migrações: dois mecanismos e drift de produção não medido

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 |
| Área | Infra / banco |
| Definição | Em produção as migrations são aplicadas por script `psql` que registra em `_manual_migrations` (e não em `_prisma_migrations`). Um banco novo nasce idêntico ao `schema.prisma` (provado), mas não há prova de que o banco real esteja igual. Há também dois arquivos com o mesmo timestamp e `CREATE INDEX` sem `CONCURRENTLY` dentro de transação. |
| Como acontece / como reproduzir | Na VPS (somente leitura): `prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel apps/api/prisma/schema.prisma --script`; a saída deve ser vazia. |
| Evidência (arquivo:linha) | [REL] `scripts/deploy/apply-migrations.sh` (`MIGRATIONS_FROM=20261006100001`, `_manual_migrations`); migrations `20261012170000_jobs_lifecycle_internal` e `20261012170000_timesheet_ack`; `20261022190000_performance_indexes`. Drift no repositório: zero (medido, 05 §4) |
| O que a documentação oficial diz (regra + URL + marcador) | `migrate deploy` não detecta drift; baselining com `migrate resolve --applied`: https://www.prisma.io/docs/orm/prisma-migrate/workflows/production-troubleshooting e /baselining (VIA BUSCA, rel. 05) |
| Impacto | Dinheiro/operação: migration futura falha ou diverge em produção. |
| Correção | 1) Rodar o `migrate diff` acima contra produção (read-only) e anexar o resultado. 2) Incluir o diff no deploy (falhar se não vazio). 3) Planejar baseline e migrar para `migrate deploy` (junto de DEP-06). 4) Nomear migrations futuras sem timestamp duplicado; usar `CONCURRENTLY` fora de transação para índices em tabelas grandes. 5) Mover `schema.diff.sql`, `schema.old.prisma`, `migrations_legacy/` para fora de `prisma/`. |
| Critério de aceite | Script `scripts/deploy/check-drift.sh` retorna 0 em staging e produção; CI falha com timestamps duplicados (`tests/contract/migrations.test.ts`). |
| Esforço | 6 h |
| Risco da correção | Baixo (leitura); Médio no baseline. |
| Depende de | - |

### PAG-07 — Eventos Asaas não tratados e fila de webhook pausada sem monitoramento

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 |
| Área | Pagamentos |
| Definição | Vários eventos do Asaas (análise de risco reprovada, captura recusada, estorno negado, reversão de chargeback) caem em "ignorado". Além disso, o Asaas pausa a fila após 15 falhas seguidas e o sistema não percebe. |
| Como acontece / como reproduzir | `PAYMENT_REPROVED_BY_RISK_ANALYSIS` -> `IGNORED`, fatura continua aberta sem aviso. Webhook fora do ar por muito tempo -> fila interrompida, eventos guardados 14 dias. |
| Evidência (arquivo:linha) | [CONF] `asaas-webhook.processor.ts:274-280` (`statusFromEvent` só conhece RECEIVED/CONFIRMED/OVERDUE/DELETED/REFUNDED/CHARGEBACK/CREATED/UPDATED/RESTORED). [REL] `billing-cron.service.ts:103` |
| O que a documentação oficial diz (regra + URL + marcador) | Lista de eventos: https://docs.asaas.com/docs/webhook-para-cobrancas ; fila pausada após 15 falhas, 14 dias de retenção: https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook (VIA BUSCA; **lista integral NAO VERIFICADA**, rel. 04) |
| Impacto | Dinheiro/operação: cliente com cartão recusado não é avisado; pagamento perdido se a fila ficar pausada. |
| Correção | 1) Ler a página de eventos e fechar a lista oficial. 2) Tratar `PAYMENT_REFUND_DENIED` chamando `refunds.reconcile`; `PAYMENT_AWAITING_CHARGEBACK_REVERSAL`/reversão revertendo a suspensão; risco reprovado/captura recusada gerando notificação ao cliente. 3) Cron horário: `GET /webhooks` do Asaas, alertar (e, se `interrupted`, reativar com `interrupted:false`). |
| Critério de aceite | `asaas-webhook-extra-events.spec.ts`: um teste por evento novo; `asaas-webhook-queue-monitor.spec.ts`: "fila interrompida gera alerta". |
| Esforço | 8 h |
| Risco da correção | Baixo-médio. |
| Depende de | - |

### PAG-08 — Datas de vencimento e régua de inadimplência em UTC

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 |
| Área | Pagamentos / agendadores |
| Definição | Vencimento "amanhã" e dias de atraso são calculados em UTC, mas o negócio e o Asaas funcionam em horário de Brasília. Entre 21h e 23h59 o vencimento sai um dia depois, e a régua de bloqueio pode errar por até 1 dia. Os lembretes saem de madrugada (09:00 UTC = 06:00 em Brasília). |
| Como acontece / como reproduzir | Criar fatura às 22:00 em Brasília: `dueDate` fica dois dias à frente. Cron `checkOverdueInvoices` roda às 08:00 UTC. |
| Evidência (arquivo:linha) | [REL] `platform-finance.service.ts:126-127,181-187,285-293`; `billing-cron.service.ts:389-391`. [CONF] `billing-cron.service.ts` lembrete às 09:00 UTC (02 §2.2); fuso só em analytics/promotions (02). Existe `saoPauloDayNumber` em `pricing.ts` |
| O que a documentação oficial diz (regra + URL + marcador) | Fuso do vencimento: NAO VERIFICADO na doc do Asaas (rel. 04). |
| Impacto | Cliente/dinheiro: cobrança vence um dia depois; lembrete às 6h. |
| Correção | 1) Criar helper `saoPauloDate()` (reaproveitar `saoPauloDayNumber`) e usá-lo em geração de vencimento e régua. 2) Declarar `timeZone: 'America/Sao_Paulo'` nos `@Cron` de `billing-cron.service.ts` e ajustar horários para 08:00/09:00 locais. |
| Critério de aceite | `billing-dates.spec.ts` com relógio simulado: "22:30 BRT gera vencimento de amanhã (BRT)", "atraso conta dias em BRT". |
| Esforço | 5 h |
| Risco da correção | Baixo-médio (muda dias de corte da régua; comunicar). |
| Depende de | - |

### PAG-09 — Webhook duplicado do Mercado Pago conta o cupom duas vezes

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 (Onda 0 se D6=B) |
| Área | Pagamentos |
| Definição | O webhook do MP não tem tabela de eventos; a única proteção é ler o status antes. Duas entregas simultâneas leem "aberta", ambas atualizam, ambas decrementam o ciclo de cupom e notificam duas vezes. |
| Como acontece / como reproduzir | Enviar o mesmo webhook MP duas vezes em paralelo (`ab`/`xargs -P2`): `couponCyclesLeft` cai 2. |
| Evidência (arquivo:linha) | [CONF] `mercadopago-webhook.controller.ts:86-87` (checagem), `:94-115` (update e `decrement`) |
| O que a documentação oficial diz (regra + URL + marcador) | MP pode reenviar notificações (at least once): https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks (VIA BUSCA) |
| Impacto | Dinheiro: cliente perde desconto contratado mais cedo; e-mail duplicado. |
| Correção | Trocar o `update` por `updateMany({ where: { id, status: { not: 'PAID' } }, data })` e executar cupom e notificação só se `count === 1`. Mesma garantia na função extraída em PAG-03. |
| Critério de aceite | `mercadopago-webhook-concurrency.spec.ts`: "duas entregas simultâneas decrementam o cupom uma vez". |
| Esforço | 3 h |
| Risco da correção | Baixo. |
| Depende de | D6 |

### PAG-10 — Reembolso de boleto chama o endpoint errado do Asaas

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 |
| Área | Pagamentos |
| Definição | Reembolso de boleto no Asaas usa um endpoint próprio que devolve um link para o pagador informar a conta. O sistema chama sempre o endpoint de cartão/PIX, e o Asaas deve recusar. O pedido de reembolso de boleto nunca funciona. |
| Como acontece / como reproduzir | Pedir reembolso de fatura paga por boleto no sandbox: 400 -> `AsaasRejectedException` -> o cliente vê "falhou". |
| Evidência (arquivo:linha) | [CONF] `asaas.service.ts:183-188` (`/payments/{id}/refund` fixo), `payment-refund.service.ts` (sem verificação de `billingType`, só nos trechos lidos). Comportamento do Asaas com boleto: NAO VERIFICADO no sandbox. |
| O que a documentação oficial diz (regra + URL + marcador) | Boleto: `POST /v3/payments/{id}/bankSlip/refund` https://docs.asaas.com/reference/estornar-boleto ; cartão/PIX: https://docs.asaas.com/reference/estornar-cobranca (VIA BUSCA, rel. 04) |
| Impacto | Cliente/dinheiro: reembolso de boleto trava; suporte faz manualmente. |
| Correção | 1) Validar no sandbox. 2) `refundPayment`: se `billingType === 'BOLETO'`, chamar `/bankSlip/refund` e guardar o link devolvido para exibir ao cliente. 3) Parcelamento de cartão: endpoint próprio. 4) Texto de tela conforme D11. |
| Critério de aceite | `asaas-refund-boleto.spec.ts`: "boleto usa bankSlip/refund", "PIX e cartão usam refund". Manual: sandbox. |
| Esforço | 6 h |
| Risco da correção | Médio (depende de comportamento externo). |
| Depende de | D11 |

### SEG-05 — Limite de requisições em memória e sem IP; rotas sensíveis só com o limite global

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 |
| Área | Segurança / rate limit |
| Definição | O limitador usa memória (zera a cada reinício, não é compartilhado entre instâncias) e a chave é o e-mail ou CPF do corpo, nunca o IP. Quem troca o e-mail a cada tentativa nunca atinge o limite. Dez rotas sensíveis (checkout, reset de senha, reset de MFA, aceite de termo) usam só o limite global de 300/min. Os webhooks usam `@SkipThrottle`. |
| Como acontece / como reproduzir | `POST /auth/login` com um e-mail diferente a cada requisição: o balde é sempre novo. Variar CPF em `/public/internal-jobs/:jobId/apply` e e-mail em `/public/candidate-requests`. Reiniciar a API zera todos os contadores. |
| Evidência (arquivo:linha) | [CONF] `app.module.ts:88` (`ThrottlerModule.forRoot` sem `storage`); `common/guards/user-throttler.guard.ts:11-25` (retorna `email:`/`doc:` antes de qualquer IP). [REL] 01a "Rotas sensíveis sem throttling próprio (10)"; 01b #3 |
| O que a documentação oficial diz (regra + URL + marcador) | Armazenamento compartilhado (Redis) com várias instâncias e rastreio do IP real: https://docs.nestjs.com/security/rate-limiting (VIA BUSCA); limitar por conta **e** por IP: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html (VIA BUSCA, rel. 05) |
| Impacto | Segurança: password spraying e enumeração em massa; DoS por bloqueio de conta alheia. |
| Correção | 1) Instalar `@nest-lab/throttler-storage-redis` (ou storage próprio com `RedisService`) e configurar `storage` no `ThrottlerModule`. 2) Segundo throttler nomeado `ip` (chave `ip:<req.ip>`) além do por identidade, nas rotas de `auth`, `public/*`, `candidate-portal/*`, `support/public/*`. 3) Adicionar `@Throttle` às 10 rotas sensíveis (ex.: checkout 10/min, reset-password 5/min, mfa reset 5/min) e um limite por IP generoso nos dois webhooks (ex.: 600/min) em vez de `@SkipThrottle`. 4) Se o Redis cair, cair para memória (não para "sem limite"): ver INF-03. |
| Critério de aceite | `throttler-ip.spec.ts`: "mesmo IP com e-mails diferentes é bloqueado na 6ª tentativa", "limite sobrevive a reinício (storage Redis)". Manual: 6 logins com e-mails distintos do mesmo IP -> 429. |
| Esforço | 12 h |
| Risco da correção | Médio: IP compartilhado (NAT de empresa) pode bloquear usuários legítimos; calibrar limites e conferir `TRUST_PROXY`. |
| Depende de | INF-01 (`TRUST_PROXY`), INF-03 |

### SEG-06 — `RateLimitGuard` (ponto) confia em cabeçalhos do cliente

> Status no repositório: correção em andamento, não commitada (`client-ip.ts`).

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 |
| Área | Segurança / rate limit |
| Definição | O guard do ponto monta o IP a partir de `cf-connecting-ip`, `x-real-ip` e `x-forwarded-for` enviados pelo cliente, antes de usar o IP real do Fastify. Trocar o cabeçalho gera uma chave nova a cada pedido. |
| Como acontece / como reproduzir | Chamar a rota de batida com `X-Forwarded-For: 1.2.3.<n>` variando `n`: nunca limita. |
| Evidência (arquivo:linha) | [CONF] `common/guards/rate-limit.guard.ts:73-86`; usado em `time-track.controller.ts` e `punch.controller.ts` [REL] |
| O que a documentação oficial diz (regra + URL + marcador) | `X-Forwarded-*` só vale pelos saltos confiáveis (`trustProxy`): https://fastify.dev/docs/latest/Reference/Server/#trustproxy (VIA BUSCA, rel. 05) |
| Impacto | Segurança: força bruta/abuso do ponto eletrônico. |
| Correção | `extractRequestIp` deve retornar apenas `request.ip` (Fastify já resolve com `trustProxy`). Remover leitura direta de cabeçalhos. |
| Critério de aceite | `rate-limit-guard-ip.spec.ts`: "X-Forwarded-For forjado não muda a chave". |
| Esforço | 2 h |
| Risco da correção | Baixo (exige `TRUST_PROXY` correto atrás do nginx). |
| Depende de | INF-01 |

### SEG-07 — Páginas do web sem cabeçalhos de segurança (CSP, frame, nosniff, HSTS)

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 |
| Área | Segurança / web |
| Definição | As páginas HTML do Next só recebem cabeçalhos de cache. O helmet protege apenas as respostas JSON da API. Faltam CSP, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, HSTS e `Permissions-Policy`. |
| Como acontece / como reproduzir | `curl -sI https://<dominio>/ \| grep -i "content-security\|x-frame\|strict-transport"` não retorna nada. |
| Evidência (arquivo:linha) | [CONF] `apps/web/next.config.js:70-82` (`headers()` só com `Cache-Control`); sem `middleware.ts` em `apps/web`; [REL] `infra/nginx-*.conf` sem cabeçalhos; nginx real não verificado |
| O que a documentação oficial diz (regra + URL + marcador) | CSP com nonce e cabeçalhos em `headers()`: https://nextjs.org/docs/app/guides/content-security-policy e https://nextjs.org/docs/app/api-reference/config/next-config-js/headers (VIA BUSCA, rel. 05) |
| Impacto | Segurança: clickjacking e XSS sem camada de contenção; token do candidato em `localStorage` fica mais exposto (SEG-11). |
| Correção | 1) `headers()` em `next.config.js` com `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` (e `frame-ancestors 'none'`), `Permissions-Policy` mínimo, `Strict-Transport-Security: max-age=31536000; includeSubDomains` (somente quando HTTPS estiver estável). 2) CSP em **Report-Only** primeiro (`Content-Security-Policy-Report-Only`), com nonce por requisição (scripts inline do `layout.tsx`); promover a enforcement após 1-2 semanas sem violações. 3) Repetir HSTS e `server_tokens off` no nginx (INF-10). Fazer junto com DEP-01 (middleware muda no Next 16). |
| Critério de aceite | Teste Playwright `tests-e2e/security-headers.spec.ts`: "resposta de / contém nosniff, frame-ancestors e HSTS". Manual: `curl -sI`. |
| Esforço | 8 h |
| Risco da correção | Médio: CSP pode quebrar scripts inline/terceiros (Turnstile, face-api); por isso começa em Report-Only. |
| Depende de | DEP-01 (recomendado) |

### SEG-08 — Código de recuperação de senha fraco e em texto puro

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 |
| Área | Segurança / autenticação |
| Definição | O código de reset tem 6 caracteres hexadecimais (24 bits), é guardado sem hash no banco e também fica dentro da notificação enviada ao RH. Quem lê o banco ou as notificações consegue redefinir a senha de usuários com código pendente. |
| Como acontece / como reproduzir | Gerar um reset de funcionário e inspecionar `User.resetPasswordCode` e `Notification.extraJson.resetCode`. |
| Evidência (arquivo:linha) | [CONF] `auth/auth.service.ts:453` (`randomBytes(4).toString('hex').slice(0, 6)`), `:456` (`setResetCode`), `:489` (`extraJson: { resetCode: code }`). Mitigações: 5 tentativas, validade 2 h, CPF parcial + matrícula (`:501-528`) |
| O que a documentação oficial diz (regra + URL + marcador) | Tokens de reset: alta entropia, uso único, expiração curta, armazenados com hash: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html (VIA BUSCA, rel. 05) |
| Impacto | Segurança/LGPD: tomada de conta por vazamento de leitura. |
| Correção | 1) Guardar `sha256(code)` em `resetPasswordCode` e comparar o hash em `validateResetCode` (tempo constante). 2) Remover `resetCode` de `Notification.extraJson`; mostrar o código uma única vez ao RH na resposta da própria operação. 3) Subir para 8 caracteres alfanuméricos (`randomInt`). 4) Limpar códigos antigos em texto puro (migração: zerar `resetPasswordCode` pendentes). |
| Critério de aceite | `password-reset-code.spec.ts`: "código não é persistido em claro", "notificação não contém o código", "código com hash valida". |
| Esforço | 6 h |
| Risco da correção | Baixo (invalida resets pendentes). |
| Depende de | - |

### SEG-09 — Guards opt-in: esquecer `@Roles` ou `JwtAuthGuard` deixa a rota aberta ou ampla

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 |
| Área | Segurança / autorização |
| Definição | `JwtAuthGuard` e `RolesGuard` não são globais: cada controller precisa declará-los. E o `RolesGuard` libera qualquer usuário logado quando não há `@Roles`. Um decorator esquecido numa rota nova vira rota aberta ou ampla. Hoje a conferência manual não achou rota aberta por engano (só `POST /ai/support/classify`, módulo congelado). |
| Como acontece / como reproduzir | Criar rota com `@UseGuards(JwtAuthGuard, RolesGuard)` sem `@Roles`: qualquer papel acessa. |
| Evidência (arquivo:linha) | [CONF] `common/guards/roles.guard.ts:17` (`if (!roles?.length) return true`); `app.module.ts:134-140` (guards globais não incluem JWT/Roles). [REL] 01a: JwtAuthGuard e RolesGuard não globais; 0 rotas com `@Roles` sem `RolesGuard` |
| O que a documentação oficial diz (regra + URL + marcador) | Guards globais com `APP_GUARD` e decorator `@Public()`: https://docs.nestjs.com/security/authentication (NAO VERIFICADO; padrão documentado) |
| Impacto | Segurança: regressão futura vira vazamento de dados. |
| Correção | Duas camadas. 1) **Já**: teste de inventário `tests/security/route-access-inventory.test.ts` que carrega o app, lista todas as rotas e falha se (a) não for pública declarada e (b) não tiver `@Roles` ou lista explícita de exceções ("só logado"). 2) **Depois**: tornar `JwtAuthGuard` global com decorator `@Public()` e `RolesGuard` fail-closed (sem `@Roles` e sem `@AnyAuthenticated()` => 403). Migrar controller por controller. |
| Critério de aceite | O teste de inventário passa com a lista atual (19 + 22 públicas conhecidas, 21 "só logado") e falha ao adicionar uma rota sem decorators. |
| Esforço | 8 h (camada 1: 3 h) |
| Risco da correção | Baixo (camada 1); Médio (camada 2, muitos controllers). |
| Depende de | SEG-02 |

### SEG-10 — Turnstile opcional e fail-open

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 1 |
| Área | Segurança / anti-bot |
| Definição | O captcha só é ativado se a chave existir, e mesmo ativado deixa passar quando a Cloudflare responde erro, demora ou a chave está errada. Cadastro, login e reset de senha dependem disso e do limite por IP (SEG-05). |
| Como acontece / como reproduzir | Sem `TURNSTILE_SECRET_KEY` o guard não valida. Com chave errada, os logs dizem "seguindo sem validar". |
| Evidência (arquivo:linha) | [CONF] `common/turnstile/turnstile.service.ts:36-45,56` (fail-open em HTTP != 200, timeout e erro de configuração). [REL] 01a: "Turnstile só se TURNSTILE_SECRET_KEY existir"; 01b: `TurnstileGuard` em edição por outro agente |
| O que a documentação oficial diz (regra + URL + marcador) | Validação de token no servidor (siteverify): https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ (NAO VERIFICADO) |
| Impacto | Segurança: cadastro/login automatizados. |
| Correção | 1) D7=B: em produção, falhar o boot se `TURNSTILE_SECRET_KEY` ausente. 2) Erro de configuração (`CONFIG_ERRORS`) deve **lançar** no boot/health, não seguir. 3) Na queda da Cloudflare, seguir **somente** se o IP estiver abaixo de um limite apertado (ex.: 3/min) via SEG-05. 4) Alerta (Sentry/log) em cada fail-open. 5) Rota pública de suporte (`/support/public/*`) também precisa de Turnstile (hoje só honeypot). |
| Critério de aceite | `turnstile-policy.spec.ts`: "produção sem chave não sobe", "chave inválida lança", "Cloudflare fora aplica limite apertado". |
| Esforço | 4 h |
| Risco da correção | Médio (login pode falhar se a chave/site key estiverem trocadas; testar em staging). |
| Depende de | D7, INF-01, SEG-05 |

### DEP-04 — Ferramentas de desenvolvimento com avisos (vitest, vite e transitivos)

| Campo | Conteúdo |
|---|---|
| Gravidade | Baixa |
| Onda | 1 |
| Área | Dependências / CI |
| Definição | `vitest` 4.1.10 e `vite` 8.0-8.1.5 têm avisos moderados/altos que só afetam o ambiente de desenvolvimento e de CI. Correção sem mudar de major. |
| Como acontece / como reproduzir | `npm audit` (completo). |
| Evidência (arquivo:linha) | [REL] 03 §3.2 (GHSA-82fw-gwwq-j7x9, -qxg6-89mg-rqv8; vite GHSA-rq7h-c2jc-7f22 etc.) |
| O que a documentação oficial diz (regra + URL + marcador) | `npm audit` (VERIFICADO, rel. 03) |
| Impacto | Segurança do ambiente de build/teste. |
| Correção | `npm install -D vitest@4.1.12 @vitest/coverage-v8@4.1.12 && npm update vite browserslist baseline-browser-mapping brace-expansion postcss-selector-parser`. |
| Critério de aceite | `npm audit` sem esses itens; `npx vitest run` verde. |
| Esforço | 1 h |
| Risco da correção | Baixo. |
| Depende de | - |

### DEP-05 — CI sem verificação de vulnerabilidades

| Campo | Conteúdo |
|---|---|
| Gravidade | Baixa |
| Onda | 1 |
| Área | CI |
| Definição | O CI roda gitleaks, CodeQL e testes, mas não roda `npm audit`; vulnerabilidades novas passam despercebidas. |
| Como acontece / como reproduzir | Ler `.github/workflows/ci.yml`. |
| Evidência (arquivo:linha) | [REL] 03 §6 e §7 (P2-8) |
| O que a documentação oficial diz (regra + URL + marcador) | `npm audit --audit-level` (npm docs; NAO VERIFICADO) |
| Impacto | Segurança: regressões de dependência. |
| Correção | Passo `npm audit --omit=dev --audit-level=high` no `ci.yml` (após DEP-01..03 deixar o baseline limpo; antes disso, `continue-on-error` com relatório). |
| Critério de aceite | CI falha ao introduzir pacote com aviso alto. |
| Esforço | 1 h |
| Risco da correção | Baixo. |
| Depende de | DEP-01, DEP-02, DEP-03 |


### SEG-14 — Exposição de superfície desnecessária (baixos de rede e roteamento)

| Campo | Conteúdo |
|---|---|
| Gravidade | Baixa |
| Onda | 1 |
| Área | Segurança |
| Definição | Conjunto de itens pequenos de exposição: `/health` completo público (uptime, memória), CSP da API com `unsafe-inline`, `GET /public/jobs*` e `/health*` sem limite próprio, namespace WebSocket sem autenticação. Nenhum é explorável hoje. |
| Como acontece / como reproduzir | `curl https://<dominio>/api/health` retorna uptime e memória sem autenticação. |
| Evidência (arquivo:linha) | [CONF] `health/health.controller.ts:30-44`; `communication.gateway.ts` registra o namespace sem autenticação [REL 01b #6, 05 B11]; `main.ts:63-79` (CSP) [REL] |
| O que a documentação oficial diz (regra + URL + marcador) | n/a |
| Impacto | Segurança: informação de operação para atacante; risco futuro se alguém adicionar `join` sem auth. |
| Correção | 1) Bloquear `/api/health` e `/api/metrics` no nginx externo (manter `/health/live` e `/health/ready` internos). 2) Remover `uptime`/`memory` do `/health` público. 3) `@Throttle` em `/public/jobs*`. 4) Gateway: registrar só se `FEATURE_COMMUNICATION` ligada e exigir JWT no handshake. 5) Retirar `unsafe-inline` do `scriptSrc` da API. |
| Critério de aceite | `health-exposure.spec.ts`: "/health não devolve memória/uptime"; manual: `curl -sI https://<dominio>/api/metrics` -> 401/403/404 de fora. |
| Esforço | 4 h |
| Risco da correção | Baixo. |
| Depende de | INF-10 |


## Catálogo - Onda 2 - depois

### LGPD-02 — Dados pessoais e sensíveis sem criptografia em repouso

| Campo | Conteúdo |
|---|---|
| Gravidade | Alta |
| Onda | 2 |
| Área | LGPD / banco |
| Definição | CPF, RG, dados de saúde (ASO), foto/PDF do consentimento em base64 e CPF do representante ficam em texto puro no Postgres. O serviço de criptografia existe (`CryptoService`, AES-256-GCM) mas nada o usa; a `KMS_MASTER_KEY` só protege o segredo do MFA e a senha provisória. |
| Como acontece / como reproduzir | `SELECT cpf FROM "Employee" LIMIT 1` mostra o CPF legível. |
| Evidência (arquivo:linha) | [CONF] só `common/crypto/crypto.service.ts` e `crypto.module.ts` mencionam `CryptoService` (nenhum consumidor); [REL] `schema.prisma:582` (`Employee.cpf String? @unique`), `:335`, `:1215-1216`; `FaceEnrollment` não verificado |
| O que a documentação oficial diz (regra + URL + marcador) | LGPD art. 46 (medidas de segurança) e art. 11 (dado sensível): https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm ; guia ANPD: https://www.gov.br/anpd/pt-br (VIA BUSCA, rel. 05) |
| Impacto | LGPD: vazamento de backup ou de leitura do banco expõe CPF/RG/saúde de todos os funcionários; agravante regulatório. |
| Correção | 1) Mínimo imediato (Onda 1, 4 h, sem código): confirmar criptografia de disco da VPS e do bucket de backup (INF-05). 2) Criptografia por campo (CPF, RG, saúde, biometria) com `CryptoService` e `kid` para rotação. 3) Coluna `cpfHash` (HMAC-SHA256 com chave separada) para busca e `@unique`. 4) Migração em lotes com dupla leitura e feature flag; reindexar buscas por CPF. 5) Backfill + remoção do texto puro após validação. 6) Rotação de chave documentada. |
| Critério de aceite | `crypto-at-rest.spec.ts`: "CPF gravado não é legível", "busca por CPF usa hash", "rotação de chave relê dados antigos". Manual: `SELECT cpf` retorna base64/cifra. |
| Esforço | 40 h |
| Risco da correção | Alto (unicidade, buscas, relatórios, importação de funcionários, backups). |
| Depende de | INF-01, INF-05 |

### LGPD-03 — Cascatas e exclusão: 118 `onDelete: Cascade` e filtro manual de `deletedAt`

| Campo | Conteúdo |
|---|---|
| Gravidade | Alta |
| Onda | 2 |
| Área | LGPD / banco |
| Definição | Apagar uma empresa ou funcionário apaga em cascata, no próprio banco, todo o histórico de ponto, folha, férias, saúde e auditoria. Apenas 4 relações usam `Restrict`. `deletedAt` existe em cerca de 10 modelos, mas cada consulta precisa lembrar de filtrar. |
| Como acontece / como reproduzir | Contar `onDelete: Cascade` no `schema.prisma`. |
| Evidência (arquivo:linha) | [REL] 02 §7 (118 Cascade, 40 outras) e 05 M7; cadeia `Company -> Employee -> ...`; `AuditLog -> Company` com Cascade (`schema.prisma` ~1226) |
| O que a documentação oficial diz (regra + URL + marcador) | LGPD art. 16, I (VIA BUSCA) ; Prisma referential actions: https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/referential-actions (NAO VERIFICADO) |
| Impacto | Lei/LGPD: uma exclusão acidental destrói prova trabalhista e fiscal. |
| Correção | 1) Trocar para `Restrict`/`NoAction` as relações de ponto, folha, férias, saúde, auditoria e fiscais; manter Cascade para dado derivado. 2) Extensão Prisma que filtra `deletedAt: null` por padrão nos modelos com soft delete. 3) Rotina de anonimização/arquivamento (reaproveitar `privacy/data-subject.service.ts`). 4) Migration revisada com plano de rollback e contagem de linhas antes/depois. |
| Critério de aceite | `schema-delete-policy.test.ts`: "relações de dados com retenção legal não são Cascade"; `soft-delete-extension.spec.ts`: "consulta padrão não retorna `deletedAt`". |
| Esforço | 24 h |
| Risco da correção | Alto (exclusões legítimas passam a exigir arquivar/anonimizar). |
| Depende de | D2, LGPD-01 |

### API-02 — Corpos sem validação de tipo (propostas, promoções, DTOs com só `@IsOptional`, queries soltas)

| Campo | Conteúdo |
|---|---|
| Gravidade | Média (módulos congelados) / Baixa (demais) |
| Onda | 2 (**antes de ligar a flag** de propostas/promoções: Onda 0 para o módulo) |
| Área | API / validação |
| Definição | `POST /proposals`, `POST /proposals/:id/accept-terms` e `POST /promotions` recebem `interface` ou `import type` como corpo, que o `ValidationPipe` não valida (preço, limite de usuários, salário chegam crus). Outros DTOs têm só `@IsOptional()` e aceitam qualquer tipo (`DeductionRuleDto.value/maxAmount`, `PlanPayloadDto` money, `UpdatePlatformCompanyDto.activeModules`). 14 rotas leem `@Query('x')`/`@Body('x')` soltos sem DTO. Os módulos de propostas e promoções estão congelados (404 por flag). |
| Como acontece / como reproduzir | Ligar `FEATURE_PROPOSALS` e enviar `monthlyPrice: "abc"` ou negativo. `PATCH /platform/companies/:id` com `activeModules: "x"`. |
| Evidência (arquivo:linha) | [CONF] `proposals/proposals.service.ts:9,22` (`export interface`), `proposals.controller.ts:7-8` (`@RequiresFeature('proposals')`); `payroll/dto/deduction-rule.dto.ts:8,12`; `platform/dto/update-platform-company.dto.ts:36-37`; [REL] 01a (14 queries sem DTO), 01b #2 e #10 (`promotions.service.ts:13`) |
| O que a documentação oficial diz (regra + URL + marcador) | `ValidationPipe` só valida classes com decorators: https://docs.nestjs.com/techniques/validation (VIA BUSCA, rel. 05) |
| Impacto | Dinheiro (se ligar propostas): valores inválidos em cobrança. Hoje: baixo. |
| Correção | Transformar `CreateProposalDto`, `AcceptTermsDto`, `PromotionDto` em classes com `class-validator` (`@IsNumber @Min(0)`, `@IsInt`, `@IsUUID`...); adicionar `@IsArray @IsString({each:true})` em `activeModules`; `@IsNumberString`/`@IsNumber` nos campos `value`/`maxAmount` (mantendo o `Transform`); criar `QueryDto` para as 14 rotas. |
| Critério de aceite | `dto-validation.spec.ts`: "valor negativo/texto devolve 400 em propostas, promoções, planos e regras de dedução". |
| Esforço | 10 h |
| Risco da correção | Baixo-médio (clientes que mandam formatos livres; verificar o front). |
| Depende de | D9 |

### API-03 — Módulo de IA: 200 em vez de 404 e rota "só logado" que gasta crédito

| Campo | Conteúdo |
|---|---|
| Gravidade | Média (módulo congelado) |
| Onda | 2 (**antes de ligar `FEATURE_AI`**) |
| Área | API / custo |
| Definição | `POST /ai/support/ticket/:id/summarize` e `/suggest-reply` devolvem 200 com o texto "Ticket não encontrado". `POST /ai/support/classify` é a única rota do sistema com JWT e sem `@Roles`: qualquer usuário de qualquer empresa aciona o provedor de IA e gera custo. |
| Como acontece / como reproduzir | Ligar a flag; chamar `classify` com token de `FUNCIONARIO`. |
| Evidência (arquivo:linha) | [CONF] `ai/ai.controller.ts:96` (`@Post('support/classify')`; `@Roles` apenas nos blocos de `:27-28,34-35,61-62,82-83`); [REL] `ai.controller.ts:102-107,117-122` |
| O que a documentação oficial diz (regra + URL + marcador) | RFC 9110 §15.5.5: recurso inexistente = 404 (NAO VERIFICADO online) |
| Impacto | Dinheiro: uso indevido do crédito de IA; cliente: erro mascarado como sucesso. |
| Correção | `NotFoundException` nos dois casos; `@Roles('DEV','SUPORTE')` (ou o papel desejado) e `@Throttle` em `classify`; confirmar orçamento por tenant (`OPENAI_MONTHLY_BUDGET`). |
| Critério de aceite | `ai-controller-contract.spec.ts`: "ticket inexistente devolve 404", "FUNCIONARIO recebe 403 em classify". |
| Esforço | 2 h |
| Risco da correção | Baixo. |
| Depende de | D9 |

### DEP-06 — Prisma 6 para 7

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 2 |
| Área | Dependências / banco |
| Definição | O CLI do Prisma 6.19.3 depende de um pacote com aviso alto (`deepmerge-ts`, só em desenvolvimento), sem correção na linha 6. A 7.10.1 é estável; **não usar Prisma 8 (só RC)**. A migração exige adaptador de driver, `prisma.config.ts` e mudanças em 4 seeds e no `PrismaService`. |
| Como acontece / como reproduzir | `npm audit` (completo). |
| Evidência (arquivo:linha) | [REL] 03 §3.2 e §4 (48 arquivos importam `@prisma/client`; 21 usos de `$queryRaw/$executeRaw`) |
| O que a documentação oficial diz (regra + URL + marcador) | Guia oficial do Prisma 7: **NAO VERIFICADO** (prisma.io bloqueado; baseado em conhecimento prévio e `engines` do npm). |
| Impacto | Segurança (dev) e manutenção futura. |
| Correção | Branch própria; `@prisma/adapter-pg` + `pg`; `prisma.config.ts` com a URL; `generator` novo com `output`; carregar `.env` explicitamente nos Dockerfiles/CI; revisar seeds, `migrate-vps-db.js` e `$queryRaw`; regressão completa; alinhar com INF-12 (baseline `migrate deploy`). |
| Critério de aceite | `npm run test:integration` e `npm run test:unit` verdes; `prisma migrate diff` vazio; smoke de todos os fluxos de cobrança em staging. |
| Esforço | 32 h |
| Risco da correção | Alto. |
| Depende de | INF-12 |

### DEP-07 — NestJS 11 para 12 (com TypeScript 6)

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 2 |
| Área | Dependências / API |
| Definição | O Nest 12 vira ESM-only, muda a ordem de hooks de ciclo de vida, o mapeamento de erros do adaptador HTTP e exige `keyv>=5` e `cache-manager>=6` (o repositório usa `cache-manager-ioredis-yet`, depreciado). O CLI exige TypeScript 6. |
| Como acontece / como reproduzir | `npm outdated`. |
| Evidência (arquivo:linha) | [CONF] guia de migração do Nest lido em 03 (VERIFICADO via raw.githubusercontent); [REL] `app.module.ts:55,76` (cache store) |
| O que a documentação oficial diz (regra + URL + marcador) | https://docs.nestjs.com/migration-guide (VERIFICADO em 03 via espelho `content/migration.md`) |
| Impacto | Manutenção; avisos transitivos (js-yaml via swagger). |
| Correção | Antes: migrar o cache para `@keyv/redis` (DEP-08). Depois: `nest upgrade --dry-run` e `nest upgrade`, TS 6, revisar hooks (8 arquivos), `@Optional()` (8 arquivos), rodar testes de contrato e segurança. |
| Critério de aceite | `npm run quality:gate`, `npm run test:security`, `npm run test:contract` verdes; boot em staging. |
| Esforço | 24 h |
| Risco da correção | Médio. |
| Depende de | DEP-08, DEP-03 |

### INF-13 — WhatsApp (Baileys não oficial): sessão fora de volume, fila com dados em claro e `require` inexistente

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 2 (mitigação mínima na Onda 1: desligar notificações por WhatsApp) |
| Área | Infra / integrações |
| Definição | O WhatsApp usa uma biblioteca não oficial (risco de banimento), guarda a sessão em `./storage/whatsapp` fora de volume (perdida a cada deploy), mantém sessões por empresa em memória do processo (não escala para 2 instâncias) e coloca telefone, mensagem e mídia em base64 em claro na fila Redis. As flags só protegem rotas HTTP: o worker de envio e as notificações de cobrança seguem ativos com `FEATURE_COMMUNICATION=false`. O adaptador Omnius faz `require` de arquivos que não existem. |
| Como acontece / como reproduzir | Reiniciar o container: sessão perdida. `ls WHATSAPP/services/omnius-core` não existe. |
| Evidência (arquivo:linha) | [REL] 02 §3 #14 e §6: `whatsapp.provider.ts:48-111`, `omnius-adapter.service.ts:170-178`, `finance-notification.service.ts:280`, `whatsapp-send.worker.ts:19`; [CONF] `docker-compose.prod.yml` não define `WHATSAPP_SESSION_PATH` |
| O que a documentação oficial diz (regra + URL + marcador) | Termos de uso do WhatsApp (uso não oficial): NAO VERIFICADO. |
| Impacto | Cliente: notificações perdidas; LGPD: dado pessoal em claro no Redis; banimento do número. |
| Correção | 1) D10=B: `FINANCE_WHATSAPP_NOTIFICATIONS_ENABLED=false` no lançamento e não subir o worker com a flag desligada. 2) Se mantiver: volume para `WHATSAPP_SESSION_PATH`, mídia fora da fila (guardar referência), TTL curto no job. 3) Remover ou corrigir o `require` do Omnius. 4) Migração para API oficial (Cloud API) como projeto à parte. |
| Critério de aceite | `whatsapp-feature-gate.spec.ts`: "com FEATURE_COMMUNICATION off o worker não consome nem o produtor enfileira". Manual: sessão sobrevive a `docker compose restart api`. |
| Esforço | 16 h |
| Risco da correção | Médio. |
| Depende de | D9, D10 |

### SEG-11 — Token do candidato em `localStorage`

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 2 |
| Área | Segurança / web |
| Definição | O token de sessão do candidato fica em `localStorage` (chave `ir_candidate_token`), legível por qualquer script injetado. O login da empresa já usa cookie `httpOnly`. |
| Como acontece / como reproduzir | Logar no portal do candidato e inspecionar o `localStorage`. |
| Evidência (arquivo:linha) | [CONF] `apps/web/app/carreiras/_lib/candidate-api.ts:4-10` |
| O que a documentação oficial diz (regra + URL + marcador) | Armazenamento seguro de token no navegador (OWASP HTML5/Session Management; NAO VERIFICADO). |
| Impacto | Segurança/LGPD: XSS roubaria a sessão de candidato (dados pessoais e currículo). |
| Correção | 1) Backend: `candidate-account` emite cookie `httpOnly; Secure; SameSite=Lax` e aceita o cookie além do Bearer. 2) Front: parar de gravar o token; chamar com `credentials: 'include'`. 3) Manter Bearer por compatibilidade por uma versão e depois remover. 4) Depende de CSP (SEG-07) como segunda camada. |
| Critério de aceite | `candidate-session-cookie.spec.ts`: "login define cookie httpOnly", e teste Playwright: "localStorage não contém token". |
| Esforço | 10 h |
| Risco da correção | Médio (CORS/credenciais no portal público). |
| Depende de | SEG-07 |

### SEG-12 — Tokens de link sem expiração e guardados em texto puro

| Campo | Conteúdo |
|---|---|
| Gravidade | Média |
| Onda | 2 |
| Área | Segurança / LGPD |
| Definição | O link de entrevista (`responseToken`) não tem validade própria e o de acompanhamento da candidatura (`trackingToken`) não expira; ambos ficam em texto puro no banco. Adivinhar é inviável (160-192 bits); o risco é governança e vazamento de leitura do banco. Propostas, testes e horários já têm prazo; documentos admissionais já guardam só o hash. |
| Como acontece / como reproduzir | Ler `JobInterview.responseToken` e `recruitmentApplication.trackingToken` no banco: valem enquanto o processo existir. |
| Evidência (arquivo:linha) | [REL] 01b §3.1: `recruitment-tokens.ts:4`, `interview-followup.service.ts:54-62,88-91`, `recruitment-privacy.service.ts:47`; referência correta: `recruitment-documents.service.ts:49,176-184` |
| O que a documentação oficial diz (regra + URL + marcador) | OWASP Forgot Password / tokens: armazenar com hash e expirar (VIA BUSCA, rel. 05) |
| Impacto | LGPD: link antigo continua dando acesso a dado pessoal do candidato. |
| Correção | 1) D8. 2) Adicionar `expiresAt` à entrevista e `retentionUntil` ao acompanhamento (migration). 3) Guardar `sha256(token)`; migrar tokens existentes (invalidar e reemitir os pendentes). 4) Responder 410 após expirar (padrão de `offer`). |
| Critério de aceite | `recruitment-link-tokens.spec.ts`: "link expirado devolve 410", "banco não contém token em claro", "tracking some após anonimização". |
| Esforço | 10 h |
| Risco da correção | Médio (links já enviados deixam de funcionar; comunicar). |
| Depende de | D8 |

### API-04 — POST de consulta/ação respondendo 201 (e DELETE com 200)

| Campo | Conteúdo |
|---|---|
| Gravidade | Baixa |
| Onda | 2 |
| Área | API / status |
| Definição | Dezoito POSTs de consulta ou prévia (login, cotação, simulação, prévia, validação) e 25 POSTs de ação (cancelar, aprovar, enviar, decidir, fechar, reabrir, contratar...) devolvem 201 "criado" sem criar recurso novo. Todos os 21 DELETE devolvem 200 com corpo, coerente entre si. |
| Como acontece / como reproduzir | `POST /auth/login` retorna 201. |
| Evidência (arquivo:linha) | [REL] 01a (lista de 18) e 01b #7 (lista de 25 e 7 prévias); [CONF] padrão do framework (POST sem `@HttpCode` = 201) |
| O que a documentação oficial diz (regra + URL + marcador) | RFC 9110 §15.3.2 (201 quando um recurso é criado) e §15.3.1 (200): https://www.rfc-editor.org/rfc/rfc9110 (NAO VERIFICADO online) |
| Impacto | Cliente: baixo; contrato inconsistente para integrações. |
| Correção | `@HttpCode(200)` nas consultas e ações (lista nos relatórios) **depois** de confirmar que o front e `tests-e2e` não dependem do 201. Manter 200 nos DELETE (decisão: o envelope `{success,data}` exige corpo, portanto não migrar para 204). |
| Critério de aceite | `http-status-contract.spec.ts`: tabela de rotas x status esperado (200 nas consultas). |
| Esforço | 6 h |
| Risco da correção | Baixo-médio (clientes que checam `=== 201`). |
| Depende de | API-01 |

### API-05 — GET que grava no banco, GET sem 404 e 400 usado como 404

| Campo | Conteúdo |
|---|---|
| Gravidade | Baixa |
| Onda | 2 |
| Área | API / status |
| Definição | O extrator marcou 24 GET cujo caminho faz create/update/delete (muitos legítimos: geram PDF e gravam auditoria), 6 GET com `:param` que podem devolver 200 vazio em vez de 404, e `DELETE /platform/plans/:id` que depende só do filtro global. Foram vistos também 400 no lugar de 404/403 (download de anexo de suporte, PDF de documento). |
| Como acontece / como reproduzir | `GET /legal/terms/download/:userId` inexistente; baixar anexo de outro ticket. |
| Evidência (arquivo:linha) | [REL] 01a (listas); [CONF] `support/support-attachment.service.ts:126-131` (`BadRequestException('Anexo não encontrado.')`); [REL] `document.service.ts:80-90` |
| O que a documentação oficial diz (regra + URL + marcador) | RFC 9110 §9.2.1 (GET seguro) e §15.5.5 (404): https://www.rfc-editor.org/rfc/rfc9110 (NAO VERIFICADO online) |
| Impacto | Cliente: respostas enganosas; cache/prefetch de GET com efeito colateral. |
| Correção | Revisar caso a caso (heurística): manter GET que só audita; mover para POST os que alteram estado de negócio; adicionar `NotFoundException`/`ForbiddenException` nos 6 GET e nos downloads. |
| Critério de aceite | `http-status-contract.spec.ts`: "GET de id inexistente devolve 404" para as 6 rotas e para o download de anexo. |
| Esforço | 8 h |
| Risco da correção | Baixo-médio. |
| Depende de | - |

### API-06 — Rotas sobrepostas e granularidade de acesso

| Campo | Conteúdo |
|---|---|
| Gravidade | Baixa |
| Onda | 2 |
| Área | API |
| Definição | `/schedules/*` e `/escalas/*` expõem funções parecidas (prévia de atribuição, exceções). Dois GET dão a GESTOR/CEO/CONTABIL mais visibilidade que o necessário dentro da mesma empresa. Nenhum atravessa empresa. |
| Como acontece / como reproduzir | Comparar `schedule.controller.ts` e `schedule-hub`. |
| Evidência (arquivo:linha) | [REL] 01b #12 e #8 |
| O que a documentação oficial diz (regra + URL + marcador) | n/a |
| Impacto | Manutenção; privilégio excessivo interno. |
| Correção | Escolher um módulo canônico e deprecar o outro; aplicar `JobScopeService` e escopo de equipe nos dois GET. |
| Critério de aceite | Testes de escopo por papel nos dois endpoints. |
| Esforço | 4 h |
| Risco da correção | Baixo. |
| Depende de | - |

### DEP-08 — Pacotes depreciados

| Campo | Conteúdo |
|---|---|
| Gravidade | Baixa |
| Onda | 2 |
| Área | Dependências |
| Definição | Quatro pacotes estão marcados como depreciados: `cache-manager-ioredis-yet`, `@types/bull`, `prom-client` (substituído) e `@ip-location-db/dbip-city-mmdb` (base DB-IP com licença CC-BY-4.0 e sem manutenção). |
| Como acontece / como reproduzir | `npm view <pacote> deprecated`. |
| Evidência (arquivo:linha) | [REL] 03 §1 e §7 P1-5 |
| O que a documentação oficial diz (regra + URL + marcador) | Registro npm (VERIFICADO em 03) |
| Impacto | Manutenção; atribuição de licença DB-IP. |
| Correção | `npm uninstall @types/bull -w apps/api`; `@keyv/redis` no `CacheModule` (`app.module.ts:55,76`); manter `prom-client` até haver sucessor estável; avaliar GeoLite2 com `maxmind`; garantir a atribuição CC-BY-4.0 enquanto usar DB-IP. |
| Critério de aceite | `npm run typecheck:api` verde; cache funcionando (hit/miss em teste de integração). |
| Esforço | 8 h |
| Risco da correção | Médio (cache). |
| Depende de | - |

### DEP-09 — Bibliotecas visuais e de ferramentas (majors opcionais)

| Campo | Conteúdo |
|---|---|
| Gravidade | Baixa |
| Onda | 2 |
| Área | Dependências / web |
| Definição | `framer-motion` 11 -> 14, `lucide-react` 0.330 -> 1.x (ícones renomeados em 185 arquivos), `tailwind-merge` 2 -> 3 e `tailwindcss` 3 -> 4 (migração de configuração), `typescript` 5.9 -> 7, ESLint 9/10 (parte já em DEP-01), `ioredis` 6, `openai` 7, `pdfkit` 0.20, `class-validator` 0.15, `nest-winston` 2, `baileys` rc14, Playwright 1.64. |
| Como acontece / como reproduzir | `npm outdated`. |
| Evidência (arquivo:linha) | [REL] 03 §2, §4 e §7 P2 |
| O que a documentação oficial diz (regra + URL + marcador) | Guias: NAO VERIFICADO (ioredis 6, openai 7). |
| Impacto | Manutenção. |
| Correção | PRs isolados, um por pacote, depois de DEP-01; para `pdfkit` rodar `npm run check:official-pdfs`. |
| Critério de aceite | Quality gate e testes de PDF verdes por PR. |
| Esforço | 24 h |
| Risco da correção | Baixo-médio por PR. |
| Depende de | DEP-01 |

### DEP-10 — Postgres e Redis: majors futuros

| Campo | Conteúdo |
|---|---|
| Gravidade | Baixa |
| Onda | 2 |
| Área | Infra |
| Definição | Postgres 16.15 (suporte até 2028-11) e Redis 7.4.12 estão suportados. Planejar PG 17/18 e Redis 8 (ou Valkey, por mudança de licença do Redis). Node 24, ClamAV 1.5.4 e as tags usadas estão corretos. |
| Como acontece / como reproduzir | n/a |
| Evidência (arquivo:linha) | [REL] 03 §5 (espelho endoflife.date; site bloqueado) |
| O que a documentação oficial diz (regra + URL + marcador) | NAO VERIFICADO (redis.io e postgresql.org bloqueados). |
| Impacto | Nenhum urgente. |
| Correção | Janela planejada com `pg_upgrade` ou dump/restore e `scripts/backup/restore-test.sh`. |
| Critério de aceite | Restore testado na versão nova antes da troca. |
| Esforço | 8 h |
| Risco da correção | Médio. |
| Depende de | INF-05 |

### DEP-11 — Avisos sem correção disponível (aceitar e registrar)

| Campo | Conteúdo |
|---|---|
| Gravidade | Baixa |
| Onda | 2 |
| Área | Dependências |
| Definição | `uuid` (via `exceljs` e `bull`, sem release) e `js-yaml` (via swagger; só afeta parse de YAML não confiável, o que o sistema não faz) não têm correção direta. Risco real baixo. |
| Como acontece / como reproduzir | `npm audit --omit=dev`. |
| Evidência (arquivo:linha) | [REL] 03 §3.1 |
| O que a documentação oficial diz (regra + URL + marcador) | `npm audit` (VERIFICADO, rel. 03) |
| Impacto | Baixo. |
| Correção | Aceitar formalmente (registrar aqui) ou `overrides` (`"js-yaml": ">=4.3.2"`, testar o Swagger); ao migrar para Nest 12 o js-yaml some. Excluir da regra de CI de DEP-05 por lista de exceções. |
| Critério de aceite | CI de `npm audit` com lista de exceções documentada. |
| Esforço | 1 h |
| Risco da correção | Baixo. |
| Depende de | DEP-05 |

### INF-14 — Filas e dependências mortas

| Campo | Conteúdo |
|---|---|
| Gravidade | Baixa |
| Onda | 2 |
| Área | Infra / código morto |
| Definição | As filas `email-send` e `pdf-generation` não têm produtor (workers só descartam). O `MailService` envia direto, sem fila. `bullmq` está declarado e não é importado; `@nestjs/bull`, `bull` e `bullmq` são redundantes. Falha de e-mail (reset de senha, convite) se perde sem reenfileirar. |
| Como acontece / como reproduzir | `grep -rn "from 'bullmq'" apps` vazio; `grep -rn "email-send" apps/api/src`. |
| Evidência (arquivo:linha) | [CONF] `apps/api/package.json:50` (`bullmq`), nenhum import; [REL] 02 §2.1 |
| O que a documentação oficial diz (regra + URL + marcador) | n/a |
| Impacto | Manutenção; e-mail crítico sem retentativa. |
| Correção | 1) `npm uninstall bullmq -w apps/api`. 2) Decidir: remover `email-send`/`pdf-generation` ou usar `email-send` para e-mails críticos com retry. 3) Se mantiver, `MailService.send` falho deve reenfileirar. |
| Critério de aceite | `grep` vazio; teste `mail-retry.spec.ts` se implementar retry. |
| Esforço | 4 h |
| Risco da correção | Baixo. |
| Depende de | - |

### INF-15 — Baixos de infra e observabilidade (agrupados)

| Campo | Conteúdo |
|---|---|
| Gravidade | Baixa |
| Onda | 2 |
| Área | Infra |
| Definição | (a) logger Fastify (pino) duplicando o winston; (b) `PrismaService.onModuleInit` engole falha de `$connect`; (c) shutdown sem `stop_grace_period`/`forceCloseConnections`; (d) sem `connection_limit`/`pool_timeout` na `DATABASE_URL`; (e) imagens `latest` de prometheus/grafana/loki/watchtower/uptime-kuma/freescout e nenhuma por digest; (f) `nginx:1.27-alpine` não verificado; (g) Sentry sem scrubbing explícito de PII; (h) `Redis maxmemory` (ver INF-03); (i) `ecosystem.config.cjs` e `nginx-web.conf` provavelmente legados; (j) compose com Zammad/FreeScout/Keycloak não usados pelo código. |
| Como acontece / como reproduzir | Ver evidência. |
| Evidência (arquivo:linha) | [CONF] `main.ts:47` (`logger: true`); [REL] 05 B2-B4, B9; 02 §1.2-1.3; 03 §5 |
| O que a documentação oficial diz (regra + URL + marcador) | NAO VERIFICADO |
| Impacto | Operação; custo; ruído de logs. |
| Correção | (a) `logger: false` e usar winston; (b) falhar o boot se `$connect` falhar em produção; (c) `stop_grace_period: 30s`; (d) `?connection_limit=10&pool_timeout=20`; (e) fixar versões/digests; (g) `beforeSend` para redigir e-mail/CPF; (i)(j) mover para `docs/legado/`. |
| Critério de aceite | Manual por item; `docker compose config` sem `latest`. |
| Esforço | 6 h |
| Risco da correção | Baixo. |
| Depende de | - |

### INF-16 — Código morto e variáveis mortas (limpeza)

| Campo | Conteúdo |
|---|---|
| Gravidade | Baixa |
| Onda | 2 |
| Área | Manutenção |
| Definição | `HolidaysService` (consulta BrasilAPI) não tem chamador fora de testes; `people-management` é uma pasta vazia; `AI_SERVICE_URL` aponta para serviço que ninguém consome; dezenas de variáveis em `.env.example` sem uso; `omnius-adapter` com `require` inexistente; ramos de eventos `PAYMENT_REFUNDED` possivelmente inalcançáveis. |
| Como acontece / como reproduzir | `grep -rn HolidaysService apps/api/src \| grep -v spec`. |
| Evidência (arquivo:linha) | [CONF] nenhuma referência externa a `HolidaysService` (grep sem resultado fora da pasta `holidays/`); [REL] 02 §2 e §5.4 |
| O que a documentação oficial diz (regra + URL + marcador) | n/a |
| Impacto | Manutenção; chamadas externas sem timeout em código que nunca roda. |
| Correção | Remover os itens após confirmar com `grep` e testes; manter lista de remoções no PR. |
| Critério de aceite | `npm run quality:gate` verde após as remoções; menos variáveis no exemplo (ligado a INF-01). |
| Esforço | 6 h |
| Risco da correção | Baixo. |
| Depende de | INF-01 |

### LGPD-04 — Baixos de LGPD (agrupados)

| Campo | Conteúdo |
|---|---|
| Gravidade | Baixa |
| Onda | 2 |
| Área | LGPD |
| Definição | (a) fila WhatsApp com telefone, mensagem e mídia em claro no Redis (ver INF-13); (b) PII em logs (e-mail do destinatário no worker de e-mail) e no `AuditLog.metadata`; (c) retenção de `AuditLog` e de `RefreshSession.ip` não definida; (d) `photoBase64`/`pdfBase64` do consentimento no banco; (e) Sentry sem scrubbing; (f) termo LGPD sem assinatura RSA se `PRIVACY_RSA_PRIVATE_KEY` não chegar ao container (INF-01); (g) `AI`/`Sentry` e subprocessadores sem registro formal (não verificado). |
| Como acontece / como reproduzir | Ver evidência. |
| Evidência (arquivo:linha) | [REL] 05 B13-B14, 02 §2.1 e §3; `queue/workers/email-send.worker.ts:11` |
| O que a documentação oficial diz (regra + URL + marcador) | LGPD art. 6 (minimização) e art. 37 (registro de operações): planalto.gov.br (VIA BUSCA) |
| Impacto | LGPD: baixo-médio, depende de auditoria. |
| Correção | Mascarar e-mail em logs; política escrita de retenção (90 dias de IP, 5 anos de auditoria fiscal sugerido; validar com jurídico); mover fotos/PDFs para armazenamento cifrado; `beforeSend` no Sentry. |
| Critério de aceite | `pii-logging.spec.ts`: "logs de e-mail não contêm endereço completo". |
| Esforço | 8 h |
| Risco da correção | Baixo. |
| Depende de | INF-01, LGPD-02 |

### PAG-11 — Baixos de pagamentos (agrupados)

| Campo | Conteúdo |
|---|---|
| Gravidade | Baixa |
| Onda | 2 |
| Área | Pagamentos |
| Definição | Oito itens pequenos de robustez: (a) id sintético `evento:paymentId` quando o webhook não traz `id` pode colapsar eventos distintos; (b) corpo do webhook Asaas sem DTO; (c) token do webhook não pode ser igual à `ASAAS_API_KEY` (o tamanho mínimo de 32 **já** é exigido no boot); (d) `expiration_date_to` do MP em formato `Z`; (e) `data.id` do corpo usado quando falta na query (corpo não é assinado); (f) 429 do Asaas tratado como indisponibilidade, sem esperar `RateLimit-Reset`; (g) `getPaymentsBySubscription` sem `limit`/paginação; (h) cartão: assinatura não é pausada ao suspender (só cancela no dia 30; apenas registrado). Também: criação no Asaas sem header de idempotência (deduplica por `externalReference`). |
| Como acontece / como reproduzir | Itens (a)-(g): ver arquivo:linha. |
| Evidência (arquivo:linha) | [REL] 04 B1-B9: `asaas-webhook.controller.ts:36,42,103-108`; `mercadopago.service.ts:117,184`; `mercadopago-webhook.controller.ts:51`; `asaas.service.ts:102-103,195-197`. [CONF] `mercadopago-webhook.controller.ts:50-53` usa `queryDataId ?? body?.data?.id`; `env.validation.ts:56-58` (token ≥ 32) |
| O que a documentação oficial diz (regra + URL + marcador) | Cota de 25.000 req/12 h e cabeçalhos `RateLimit-*`: https://docs.asaas.com/docs/duvidas-frequentes-limites-da-api ; token 32-255 caracteres e diferente da API key: https://docs.asaas.com/docs/criar-novo-webhook-pela-api ; idempotência: https://docs.asaas.com/docs/como-implementar-idempotencia-em-webhooks (todos VIA BUSCA, rel. 04). Formato de data do MP: NAO VERIFICADO. |
| Impacto | Dinheiro/operação: baixo. |
| Correção | (a) usar hash do corpo no id de fallback; (b) DTO/zod do corpo; (c) falhar no boot se igual à API key; (d) enviar com offset `-03:00` após validar no sandbox; (e) exigir `data.id` da query; (f) respeitar `RateLimit-Reset` e limitar concorrência na conciliação; (g) `limit=100` e seguir `hasMore`; (h) manter. |
| Critério de aceite | Um teste por item em `payments-hardening.spec.ts` (ex.: "id de fallback inclui hash do corpo"). |
| Esforço | 10 h |
| Risco da correção | Baixo. |
| Depende de | - |

### SEG-13 — Baixos de segurança (agrupados)

| Campo | Conteúdo |
|---|---|
| Gravidade | Baixa |
| Onda | 2 |
| Área | Segurança |
| Definição | Itens pequenos sem exploração conhecida: (a) algoritmo JWT não fixado (`HS256`); (b) default de `JWT_EXPIRES_IN` de 7 dias fora do compose (`config/app.config.ts:4`, `.env.example:27`); (c) bloqueio de conta como vetor de DoS (5 falhas); (d) bcryptjs (JS puro, mais lento) e senha sem `@MaxLength` (bcrypt trunca em 72 bytes); migrar para Argon2id com rehash no login; (e) chave de `temporary-password.ts` com fallback silencioso; (f) PII em logs (`email-send.worker.ts:11`) e `AuditLog.metadata` com e-mail; (g) ~25 `update/delete({where:{id}})` dependem de checagem prévia de `companyId`; (h) `local-support-storage` sem checar que o caminho resolvido fica dentro da base; MIME de download vindo do cliente; magic bytes duplicados; (i) SSRF cego no logo do PDF (hostname que resolve para IP privado não é checado); (j) `GET /job-workflow/jobs/:id/approvals` e `GET /schedules/:id` sem escopo de equipe para GESTOR; (k) `scriptSrc 'unsafe-inline'` na API. |
| Como acontece / como reproduzir | Ver evidência de cada item. |
| Evidência (arquivo:linha) | [REL] 05 B5-B8, B10, B12-B14; 01b #8; 02 §3 #18: `jwt-auth.guard.ts:35`, `auth.module.ts:21-25`, `payroll.service.ts:297-327`, `accounting-office.service.ts:303,340`, `time-closing.service.ts:540,818`, `document-templates.controller.ts:47`, `work-schedule-rules.service.ts:30,35`, `common/pdf/pdf-report.ts:122`, `job-workflow.controller.ts:33`, `schedule.controller.ts:126`. [CONF] `main.ts` CSP e `support-attachment.service.ts:100-109` (MIME declarado) |
| O que a documentação oficial diz (regra + URL + marcador) | RFC 8725 §3.1 (fixar algoritmo JWT, VIA BUSCA); Argon2id primeira opção: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html (VIA BUSCA, rel. 05) |
| Impacto | Segurança: defesa em profundidade. |
| Correção | (a) `signOptions.algorithm` e `verify({algorithms:['HS256']})`; (b) default `15m` em `app.config.ts` e exemplos; (c) manter e-mail de alerta; (d) `@MaxLength(72)` nos DTOs de senha agora, Argon2id depois; (e) lançar erro em vez de derivar de `JWT_SECRET`; (f) mascarar e-mail em logs e definir retenção de `AuditLog`/`RefreshSession.ip`; (g) `updateMany/deleteMany({where:{id,companyId}})` e checar `count`; (h) validar `startsWith(base)` e usar o MIME detectado; (i) resolver DNS e bloquear IP privado/loopback/link-local antes do `fetch`; (j) aplicar escopo de equipe; (k) remover `unsafe-inline`. |
| Critério de aceite | Um teste por item em `security-hardening.spec.ts` (ex.: "token com alg none é rejeitado", "storage rejeita `../`"). |
| Esforço | 14 h |
| Risco da correção | Baixo. |
| Depende de | - |

---

## 6. Matriz rastreável

Total de IDs: 62. Horas somam o esforço base (sem as variantes opcionais). Os 'Críticos' são 0: nenhum achado se confirmou como explorável hoje por qualquer pessoa sem credencial; o mais grave ligado ao Next 14 foi rebaixado com justificativa em DEP-01.

| ID | Título | Gravidade | Onda | Esforço (h) | Arquivo principal | Estado |
|---|---|---|---|---:|---|---|
| INF-01 | Variáveis do compose de produção que não chegam à API; exemplos de `.env` incompletos | Alta | 0 | 4 | `docker-compose.prod.yml` | parcial |
| LGPD-01 | Exclusão definitiva apaga dados com retenção legal (`purgeCompany`, `deleteWithHistory`) | Alta | 0 | 8 | `apps/api/src/modules/platform/platform.repository.ts` | aberto |
| PAG-01 | Pagamento reativa qualquer empresa, mesmo cancelada ou suspensa | Alta | 0 | 6 | `apps/api/src/modules/finance/asaas-webhook.processor.ts` | em edição |
| PAG-02 | `PAYMENT_UPDATED` e `PAYMENT_RESTORED` sobrescrevem estado e `deletedAt` | Alta | 0 | 5 | `apps/api/src/modules/finance/asaas-webhook.processor.ts` | em edição |
| PAG-03 | Mercado Pago sem conciliação periódica e com janela anti-replay de 5 minutos | Alta | 0 | 10 | `apps/api/src/modules/finance/payment-reconciliation.service.ts` | parcial |
| PAG-04 | Asaas sem chave devolve `{}` em silêncio | Alta | 0 | 3 | `apps/api/src/modules/finance/asaas.service.ts` | aberto |
| SEG-01 | API do Express usada sob Fastify: upload e download respondem 500 | Alta | 0 | 12 | `apps/api/src/modules/support/support.controller.ts` | parcial |
| SEG-02 | Perfis de leitura (CONSULTA, GESTOR) gravam e apagam ASO | Alta | 0 | 3 | `apps/api/src/modules/management/aso.controller.ts` | corrigido (commit) |
| SEG-03 | Tabelas globais de regras de folha editáveis por CONTABIL | Alta | 0 | 4 | `apps/api/src/modules/accounting/accounting.controller.ts` | corrigido (commit) |
| SEG-04 | Scan de anexos de suporte é assíncrono e fail-open | Alta | 0 | 5 | `apps/api/src/modules/support/support-attachment.service.ts` | aberto |
| INF-02 | Robô de QA flutuante ligado por padrão no build de produção | Média | 0 | 1 | `apps/web/Dockerfile` | aberto |
| PAG-05 | Estorno total não altera a fatura nem o acesso | Média | 0 | 4 | `apps/api/src/modules/finance/payment-refund.service.ts` | aberto |
| PAG-06 | Cartão CONFIRMED conta como pago (nota fiscal sai antes do saldo) | Média | 0 | 2 | `apps/api/src/modules/finance/asaas-webhook.processor.ts` | aberto |
| DEP-01 | Next 14.2.35 sem patches: vulnerabilidades críticas/altas | Alta | 1 | 40 | `apps/web/package.json` | aberto |
| DEP-03 | Correções do mesmo major (fastify, multer, nodemailer, zod, class-validator, body-parser) | Alta | 1 | 4 | `apps/api/package.json` | aberto |
| INF-05 | Backup: cópia remota opcional e rotina interna inoperante | Alta | 1 | 8 | `apps/api/src/database/backup.service.ts` | aberto |
| API-01 | `throw new Error` vira 500 (32 rotas) | Média | 1 | 12 | `apps/api/src/common/filters/http-exception.filter.ts` | aberto |
| DEP-02 | Remover `jimp` (não usado; ~27 avisos altos) | Média | 1 | 1 | `package.json` | aberto |
| INF-03 | Redis fora do ar desliga lock de cron e limites (fail-open) | Média | 1 | 6 | `apps/api/src/common/redis/redis.service.ts` | aberto |
| INF-04 | Chamadas externas sem timeout em caminho do usuário | Média | 1 | 5 | `apps/api/src/modules/finance/mercadopago.service.ts` | aberto |
| INF-06 | Imagens `node:20-alpine` (fim de vida) em `infra/` | Média | 1 | 1 | `infra/Dockerfile.api` | aberto |
| INF-07 | Imagem da API roda como root, sem multi-stage nem HEALTHCHECK | Média | 1 | 6 | `apps/api/Dockerfile` | aberto |
| INF-08 | ClamAV sem healthcheck/ordem de subida; web sem espera pela API | Média | 1 | 3 | `docker-compose.prod.yml` | aberto |
| INF-09 | Compose e arquivos de infra legados/inseguros no repositório | Média | 1 | 6 | `docker-compose.yml` | aberto |
| INF-10 | nginx: sem TLS endurecido, timeouts, limite de requisições e host fixo (o nginx real não foi verificado) | Média | 1 | 6 | `infra/nginx-lb.conf` | aberto |
| INF-11 | GitHub Actions por tag móvel, desatualizadas; imagens `claude/**` no mesmo repositório que a produção | Média | 1 | 4 | `.github/workflows/deploy.yml` | aberto |
| INF-12 | Migrações: dois mecanismos e drift de produção não medido | Média | 1 | 6 | `scripts/deploy/apply-migrations.sh` | aberto |
| PAG-07 | Eventos Asaas não tratados e fila de webhook pausada sem monitoramento | Média | 1 | 8 | `apps/api/src/modules/finance/asaas-webhook.processor.ts` | aberto |
| PAG-08 | Datas de vencimento e régua de inadimplência em UTC | Média | 1 | 5 | `apps/api/src/modules/finance/billing-cron.service.ts` | aberto |
| PAG-09 | Webhook duplicado do Mercado Pago conta o cupom duas vezes | Média | 1 | 3 | `apps/api/src/modules/finance/mercadopago-webhook.controller.ts` | aberto |
| PAG-10 | Reembolso de boleto chama o endpoint errado do Asaas | Média | 1 | 6 | `apps/api/src/modules/finance/asaas.service.ts` | aberto |
| SEG-05 | Limite de requisições em memória e sem IP; rotas sensíveis só com o limite global | Média | 1 | 12 | `apps/api/src/app.module.ts` | aberto |
| SEG-06 | `RateLimitGuard` (ponto) confia em cabeçalhos do cliente | Média | 1 | 2 | `apps/api/src/common/guards/rate-limit.guard.ts` | em edição |
| SEG-07 | Páginas do web sem cabeçalhos de segurança (CSP, frame, nosniff, HSTS) | Média | 1 | 8 | `apps/web/next.config.js` | aberto |
| SEG-08 | Código de recuperação de senha fraco e em texto puro | Média | 1 | 6 | `apps/api/src/modules/auth/auth.service.ts` | aberto |
| SEG-09 | Guards opt-in: esquecer `@Roles` ou `JwtAuthGuard` deixa a rota aberta ou ampla | Média | 1 | 8 | `apps/api/src/common/guards/roles.guard.ts` | aberto |
| SEG-10 | Turnstile opcional e fail-open | Média | 1 | 4 | `apps/api/src/common/turnstile/turnstile.service.ts` | aberto |
| DEP-04 | Ferramentas de desenvolvimento com avisos (vitest, vite e transitivos) | Baixa | 1 | 1 | `package.json` | aberto |
| DEP-05 | CI sem verificação de vulnerabilidades | Baixa | 1 | 1 | `.github/workflows/ci.yml` | aberto |
| SEG-14 | Exposição de superfície desnecessária (baixos de rede e roteamento) | Baixa | 1 | 4 | `apps/api/src/health/health.controller.ts` | aberto |
| LGPD-02 | Dados pessoais e sensíveis sem criptografia em repouso | Alta | 2 | 40 | `apps/api/src/common/crypto/crypto.service.ts` | aberto |
| LGPD-03 | Cascatas e exclusão: 118 `onDelete: Cascade` e filtro manual de `deletedAt` | Alta | 2 | 24 | `apps/api/prisma/schema.prisma` | aberto |
| API-02 | Corpos sem validação de tipo (propostas, promoções, DTOs com só `@IsOptional`, queries soltas) | Média | 2 | 10 | `apps/api/src/modules/proposals/proposals.service.ts` | aberto |
| API-03 | Módulo de IA: 200 em vez de 404 e rota "só logado" que gasta crédito | Média | 2 | 2 | `apps/api/src/modules/ai/ai.controller.ts` | aberto |
| DEP-06 | Prisma 6 para 7 | Média | 2 | 32 | `apps/api/prisma/schema.prisma` | aberto |
| DEP-07 | NestJS 11 para 12 (com TypeScript 6) | Média | 2 | 24 | `apps/api/package.json` | aberto |
| INF-13 | WhatsApp (Baileys não oficial): sessão fora de volume, fila com dados em claro e `require` inexistente | Média | 2 | 16 | `apps/api/src/modules/communication/whatsapp/whatsapp.provider.ts` | aberto |
| SEG-11 | Token do candidato em `localStorage` | Média | 2 | 10 | `apps/web/app/carreiras/_lib/candidate-api.ts` | aberto |
| SEG-12 | Tokens de link sem expiração e guardados em texto puro | Média | 2 | 10 | `apps/api/src/modules/jobs/interview-followup.service.ts` | aberto |
| API-04 | POST de consulta/ação respondendo 201 (e DELETE com 200) | Baixa | 2 | 6 | `apps/api/src/modules/auth/auth.controller.ts` | aberto |
| API-05 | GET que grava no banco, GET sem 404 e 400 usado como 404 | Baixa | 2 | 8 | `apps/api/src/modules/support/support-attachment.service.ts` | aberto |
| API-06 | Rotas sobrepostas e granularidade de acesso | Baixa | 2 | 4 | `apps/api/src/modules/schedule/schedule.controller.ts` | aberto |
| DEP-08 | Pacotes depreciados | Baixa | 2 | 8 | `apps/api/package.json` | aberto |
| DEP-09 | Bibliotecas visuais e de ferramentas (majors opcionais) | Baixa | 2 | 24 | `apps/web/package.json` | aberto |
| DEP-10 | Postgres e Redis: majors futuros | Baixa | 2 | 8 | `docker-compose.prod.yml` | aberto |
| DEP-11 | Avisos sem correção disponível (aceitar e registrar) | Baixa | 2 | 1 | `package.json` | aberto |
| INF-14 | Filas e dependências mortas | Baixa | 2 | 4 | `apps/api/package.json` | aberto |
| INF-15 | Baixos de infra e observabilidade (agrupados) | Baixa | 2 | 6 | `apps/api/src/main.ts` | aberto |
| INF-16 | Código morto e variáveis mortas (limpeza) | Baixa | 2 | 6 | `apps/api/src/modules/holidays/holidays.service.ts` | aberto |
| LGPD-04 | Baixos de LGPD (agrupados) | Baixa | 2 | 8 | `apps/api/src/queue/workers/email-send.worker.ts` | aberto |
| PAG-11 | Baixos de pagamentos (agrupados) | Baixa | 2 | 10 | `apps/api/src/modules/finance/asaas-webhook.controller.ts` | aberto |
| SEG-13 | Baixos de segurança (agrupados) | Baixa | 2 | 14 | `apps/api/src/common/guards/jwt-auth.guard.ts` | aberto |


---

## 7. Plano de verificação final (definition of done)

Convenções: `API=https://<dominio>/api` (ou `http://127.0.0.1:3333` na VPS), `TK_*` = tokens de teste de cada papel (guardados em variável de shell; **nunca imprimir**). Verificação de variável sem imprimir o valor: `docker compose -f docker-compose.prod.yml exec api printenv NOME | wc -c` devolve **0 ou 1** se ausente/vazia e **> 1** se definida.

### 7.1 Dia do deploy da Onda 0

Pré-requisitos: D1 a D7 e D12 respondidas; staging com sandbox Asaas (e MP se D6=B).

- [ ] `npm ci` em Node 24/npm 11; `npm run typecheck:api && npm run typecheck:web`.
- [ ] `npx vitest run` verde (inclui os testes novos: `company-reactivation.spec.ts`, `asaas-webhook-updated-event.spec.ts`, `asaas-service-unconfigured.spec.ts`, `aso.controller.spec.ts`, `accounting-rules.controller.spec.ts`, `support-attachment-scan.spec.ts`, `platform-purge-guards.spec.ts`, `tests/contract/env-parity.test.ts`).
- [ ] `apps/api/test/fastify-binary-responses.e2e-spec.ts` verde com `FastifyAdapter` real.
- [ ] Variáveis no container (nenhum valor impresso). Cada comando deve devolver > 1:
  `for v in JWT_SECRET KMS_MASTER_KEY ALLOWED_ORIGINS METRICS_TOKEN ASAAS_API_KEY ASAAS_WEBHOOK_TOKEN MERCADOPAGO_WEBHOOK_SECRET TURNSTILE_SECRET_KEY PRIVACY_RSA_PRIVATE_KEY TRIAL_DOCUMENT_HASH_SECRET ANALYTICS_SALT TRUST_PROXY; do echo -n "$v: "; docker compose -f docker-compose.prod.yml exec -T api printenv $v | wc -c; done`
- [ ] Testes de rota por curl (códigos esperados):

| Chamada | Esperado |
|---|---|
| `POST $API/management/aso` com `TK_CONSULTA` | 403 |
| `PATCH $API/management/aso/<id>` com `TK_GESTOR` | 403 |
| `DELETE $API/management/aso/<id>` com `TK_CONSULTA` | 403 |
| `POST $API/accounting/rules` com `TK_CONTABIL` | 403 |
| `DELETE $API/accounting/rules/<id>` com `TK_CONTABIL` | 403 |
| `GET $API/accounting/rules` com `TK_CONTABIL` | 200 |
| `POST $API/support/tickets/<id>/attachments` (`-F file=@teste.pdf`) com `TK_SUPORTE` | 201 |
| `GET $API/support/tickets/<id>/attachments/<aid>/download` (anexo QUARANTINED) | 409 ou 423 (bloqueado) |
| `GET $API/escalas/punch/receipt/<r>/pdf` | 200 `application/pdf` |
| `GET $API/finance/platform/reports/monthly.csv?month=2026-09` com `TK_DEV` | 200 `text/csv` |
| `POST $API/finance/webhook/asaas` sem `asaas-access-token` | 403 |
| `POST $API/finance/webhook/mercadopago` sem `x-signature` | 403 |
| `DELETE $API/platform/companies/<id>/purge` em empresa com fatura paga | 409 |
| `GET $API/metrics` sem Bearer | 401 |

- [ ] Webhook Asaas (sandbox): `PAYMENT_RECEIVED` em empresa `CANCELED` não a reativa; `PAYMENT_UPDATED` em fatura `OVERDUE` mantém `OVERDUE`; evento duplicado devolve 200 sem reprocessar.
- [ ] `docker compose -f docker-compose.prod.yml ps` com todos `healthy`; `curl -s -o /dev/null -w "%{http_code}\n" $API/health/ready` = 200.
- [ ] Site sem robô de QA (INF-02); backup manual executado e restauração testada em outro lugar (se ainda não feita: antecipar INF-05).
- [ ] Rollback ensaiado: `IMAGE_TAG=<sha anterior>` e `scripts/deploy/rollback.sh`.

### 7.2 Dia do deploy da Onda 1

- [ ] `npx vitest run`, `npm run typecheck:api`, `npm run typecheck:web`, `npm run test:security`, `npm run test:contract`, `npm run test:integration`, `npm run test:e2e` (Playwright) verdes.
- [ ] `npm audit --omit=dev --audit-level=high` sem avisos (exceções documentadas em DEP-11).
- [ ] Segurança de borda:
  `curl -sI https://<dominio>/ | grep -iE "strict-transport|x-content-type|x-frame|content-security"` mostra os 4 cabeçalhos.
  Rajada de 10 logins com e-mails diferentes do mesmo IP: a partir da 6ª, **429**.
  `curl -s -o /dev/null -w "%{http_code}\n" https://<dominio>/api/metrics` (de fora) = 401/403/404; `/api/health` de fora não devolve `memory`.
- [ ] Redis: `docker compose -f docker-compose.prod.yml stop redis`; confirmar que cron crítico **não** roda e que há alerta; `start redis`.
- [ ] Timeouts: simular host lento (ex.: bloquear `nominatim.openstreetmap.org`) e conferir resposta em < 5 s.
- [ ] Backup remoto: `scripts/backup/verify-remote.sh` = 0 e `restore-test.sh` concluído.
- [ ] Imagens: `docker run --rm <api> id -u` != 0; `grep -rn "node:20" infra` vazio; todas as Actions de terceiros por SHA.
- [ ] Next 16 em staging: smoke de login, dashboard, ponto, carreiras, checkout; sem erro no console.
- [ ] `check-drift.sh` retorna 0 em produção.
- [ ] Reset de senha: `resetPasswordCode` no banco não é texto puro.

### 7.3 Dia do deploy da Onda 2

- [ ] Para cada módulo congelado que será ligado: API-02 e API-03 aplicados e `FEATURE_*` repassada (verificar com `printenv | wc -c`).
- [ ] Criptografia em repouso: `SELECT cpf FROM "Employee" LIMIT 1` não é legível; busca por CPF funciona; restauração de backup lê os dados cifrados.
- [ ] Prisma 7: `npx prisma migrate diff` vazio; `npm run test:integration` verde; cobrança de ponta a ponta em staging.
- [ ] Nest 12: `npm run quality:gate`, boot limpo, shutdown limpo (`docker compose stop api` sem erros), hooks de ciclo de vida conferidos.
- [ ] Links: link de entrevista expirado devolve **410**; banco não contém token em claro.
- [ ] `grep -rn "bullmq\|jimp" package.json apps/*/package.json` vazio; código morto removido.
- [ ] Contrato de status: `http-status-contract.spec.ts` verde (nenhum 500 por `throw new Error` conhecido).

---

## 8. Apêndice: códigos de status HTTP (RFC 9110) e desvios encontrados

Fonte das regras: RFC 9110 (https://www.rfc-editor.org/rfc/rfc9110) e RFC 6585 (429). **NAO VERIFICADO online** (hosts não consultados); baseado em conhecimento prévio. Formato de sucesso do sistema: `{ success: true, data }`; de erro: `{ success:false, statusCode, path, timestamp, error:{ message, code } }` (01a). Mapeamento do filtro global: P2002 -> 409, P2025 -> 404, P2003 -> 409, P2034 -> 409, P2000/P2023 -> 400, banco fora -> 503, 429 -> `TOO_MANY_ATTEMPTS`, qualquer outra exceção -> 500.

| Código | Quando usar (RFC 9110) | Uso no sistema | Desvios encontrados |
|---|---|---|---|
| 200 | Sucesso com representação (§15.3.1) | Padrão de GET/PUT/PATCH/DELETE e de POST com `@HttpCode(200)`; todos os 21 DELETE devolvem 200 com corpo | `POST /ai/support/ticket/:id/summarize|suggest-reply` devolvem 200 com texto "Ticket não encontrado" (API-03); POST de consulta/ação sem `@HttpCode` devolve 201 (API-04); 24 GET gravam no banco (API-05, heurística) |
| 201 | Recurso criado; idealmente com `Location` (§15.3.2) | Padrão de POST sem `@HttpCode` (105 + stream em 01b) | 18 consultas/prévias e 25 ações respondem 201 sem criar recurso (API-04). `Location` não é enviado (NAO VERIFICADO) |
| 204 | Sucesso sem corpo (§15.3.5) | **Não usado** (decisão: envelope exige corpo, DELETE = 200) | Sem desvio; documentar a decisão |
| 400 | Pedido malformado ou inválido (§15.5.1) | `ValidationPipe`, Prisma P2000/P2023/validação, JSON inválido, Turnstile inválido | Usado como "não encontrado" no download de anexo de suporte e no PDF de documento (`support-attachment.service.ts:126-131`, `document.service.ts:80-90`) (API-05); campos sem DTO não são validados (API-02) |
| 401 | Credencial ausente/inválida; deve enviar `WWW-Authenticate` (§15.5.2) | `JwtAuthGuard`, `/metrics` sem token, refresh inválido | Envio de `WWW-Authenticate` não verificado (NAO VERIFICADO) |
| 402 | Reservado para uso futuro (§15.5.3) | `SubscriptionActiveGuard` (fatura vencida) | Uso não padrão; manter, mas documentar o contrato para o front (campo `code`) |
| 403 | Autenticado, sem permissão (§15.5.4) | `RolesGuard`, `TenantGuard` (empresa suspensa), webhooks com token/assinatura inválidos | Webhooks com credencial inválida respondem 403 (RFC sugere 401); aceitável se combinado com os provedores; ASO e regras globais deixavam passar quem deveria receber 403 (SEG-02, SEG-03) |
| 404 | Recurso inexistente ou oculto (§15.5.5) | `FeatureFlagGuard` (módulo congelado), Prisma P2025, `NotFoundException` | 6 GET com `:param` sem 404 explícito (heurística) e 200 no lugar de 404 em `ai` (API-03, API-05) |
| 409 | Conflito com o estado atual (§15.5.10) | P2002 (duplicado), P2003, P2034, regras de estado | `ReceitaWS` com falha de rede vira 409 (`platform.service.ts:314`): deveria ser 502/503 (INF-04); anexo em quarentena sugerido como 409/423 (SEG-04) |
| 410 | Recurso removido de forma permanente (§15.5.11) | Links expirados de proposta, horários e teste | Link de entrevista e de acompanhamento nunca expiram (SEG-12) |
| 422 | Sintaxe correta, conteúdo semanticamente inválido (§15.5.21) | Não usado pela API (aparece só em respostas do Asaas) | Validação de negócio sai como 400/409; recomendação: manter 400 para DTO e usar 422 apenas para regra de negócio nas rotas novas (API-01) |
| 429 | Excesso de requisições; recomendar `Retry-After` (RFC 6585) | `ThrottlerGuard` global (300/60 s) e `@Throttle` por rota | Contador em memória e sem IP (SEG-05); webhooks sem limite (`@SkipThrottle`); `Retry-After` não verificado |
| 500 | Falha inesperada no servidor (§15.6.1) | Qualquer exceção não mapeada | `throw new Error` em 32 rotas vira 500 para erros do pedido (API-01); webhook com 500 intencional para forçar retentativa do provedor (manter apenas para falha transitória) |
| 503 | Servidor temporariamente indisponível (§15.6.4) | Banco fora (`DB_UNAVAILABLE`), ClamAV fora (falha fechada), Asaas/MP indisponíveis, Redis para Bull | Falhas de provedor externo seriam mais exatas como 502/504 (§15.6.3, §15.6.5); manter 503 se acompanhado de `Retry-After` |
| Extra 202 | Aceito para processamento (§15.3.3) | `POST /public/visits` | Correto |

---

## 9. Itens sem cobertura / relatórios incompletos

- **01a-endpoints.md** estava completo na leitura (278 linhas, 281 rotas, 33 controllers) e **01b** também (340 rotas); a soma 621 menos as 3 rotas de `health` duplicadas = 618, igual ao total do código. Cobertura aparente completa.
- Sem cobertura em nenhum relatório: `FaceEnrollment` (biometria) em repouso; `platform-revenue-report.ts` (receita com estorno); o corpo de `faturas-acoes.service`/`finalizeCancellation` (cancelamento de assinatura, 04 §3); `TurnstileGuard` (01b: "em edição por outro agente"); `AuditInterceptor` na prática; conteúdo de `scripts/deploy/vps-update.sh` e `rollback.sh`; testes de carga; nginx e banco reais de produção.
- Os CSV (`01a-endpoints.csv`, `01b-endpoints.csv`) não foram abertos; o texto dos `.md` já os resume.
- Nove afirmações dos relatórios foram descartadas ou reduzidas (seção 2.4); uma ocorrência adicional do mesmo defeito de SEG-01 foi anotada (seção 2.5).
