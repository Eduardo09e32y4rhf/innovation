# API-05: GET que grava, GET sem 404, 400 usado como 404

## Problema
Teste novo `tests/contract/http-status-get-404.spec.ts`: antes da correcao 7/7 falharam.

## Documentacao
RFC 9110 (9.2.1 metodos seguros; 15.5.5 404; 15.5.1 400; 15.5.4 403): https://www.rfc-editor.org/rfc/rfc9110.html. Host bloqueado no ambiente (403 do proxy). Pela busca so confirmei a numeracao das secoes (copia de terceiros): NAO VERIFICADO o texto; VIA BUSCA a numeracao. Nao e codigo de dinheiro/seguranca critico.

## Classificacao dos 24 GET que gravam (01a)
Mudou (estado de negocio):
- `GET /promotions`: aplicava promocoes vencidas (alterava cargo e salario do funcionario). `list()` agora so le. Aplicacao: cron diario `dailyJob` (ja existia, 06:10) ou novo `POST /promotions/apply-due` (RH/ADMIN/DEV, HttpCode 200). Mudanca de front (nao feita, apps/web): a tela de promocoes pode chamar `POST /promotions/apply-due` antes de listar; sem isso uma promocao com data de hoje criada antes aparece como agendada ate o cron do dia seguinte (criacao com data <= hoje ja aplica na hora).
Mantidos como GET (efeito idempotente/derivado/auditoria, o front depende do GET para abrir PDF/link): PDFs que gravam `generatedDocument` (employees/*.pdf, management/documents/*, vacations receipt, trct.pdf), cache do PDF do termo (`/legal/terms/download`), auditoria de export/download (`privacy/*/export`, `jobs/documents/:id/download`, `talent-pool/:id/resume`), `viewedAt` da proposta publica, criacao preguicosa do funil/agendas padrao (`/jobs/pipeline`, `/jobs/:id/applications`, `/schedules`), recalculo derivado `time-closing/collective/pdf`.
Fora do meu escopo (finance/): `GET /finance/company/status`, `/faturas/empresa/status` (polling do Asaas liquida fatura) e `/finance/platform/reports/monthly(.csv)` continuam gravando em GET; ficam para o grupo de finance (mover para webhook/job; o front le o status por GET).

## 404/400 corrigidos
- `GET /legal/job/:jobId/status` devolvia 200 `{status:'NOT_FOUND'}` -> 404 (front nao consome a rota).
- `document.service`: documento inexistente 400 -> 404; empresa diferente 400 -> 403 (`getDocumentStream`, `readBuffer`).
- Upload de anexo de suporte em chamado inexistente 400 -> 404 (o download ja devolvia 404).
- `management-events`: funcionario inexistente 400 -> 404.
- `GET /platform/receita/:cnpj` com tamanho invalido 409 -> 400.
- Ja corretos: download de termo (404), download de anexo (404). `DELETE /platform/plans/:id`: ja protegido pelo filtro global (404 Prisma P2025), sem mudanca.

## Arquivos
promotions.service/controller, privacy.service, documents/document.service, support-attachment.service, management-events.service, platform.service, tests/contract/http-status-get-404.spec.ts.

## Testes
`npx vitest run tests/contract/http-status-get-404.spec.ts apps/api/tests/unit apps/api/src/modules/{promotions,documents,privacy,support,platform,management}`: 20 arquivos, 173 testes passaram. `npx tsc --noEmit -p apps/api`: sem erros.
