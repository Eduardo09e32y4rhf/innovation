# RS-C-16: tokens do candidato com hash e expiracao

## Problema
`Application.trackingToken` (40 hex) e `ApplicationInterview.responseToken` (32 base64url) ficavam em texto no banco; o de acompanhamento nunca expirava e o de entrevista so "morria" por efeito do horario. Vazamento do banco = acesso as paginas de todos os candidatos.

## Documentacao
- OWASP Session Management / Forgot Password Cheat Sheets: tokens de uso por link devem ter entropia alta, ser guardados com hash e expirar. VIA BUSCA.
- Postgres `sha256(bytea)` (built-in desde PG 11): https://www.postgresql.org/docs/16/functions-binarystring.html. VIA BUSCA.

## Desenho
- Tabela `RecruitmentAccessToken` (`kind` TRACKING|INTERVIEW, `tokenHash` unico, `expiresAt`, `lastUsedAt`), FK com cascade para candidatura/entrevista.
- Cada e-mail emite um token novo (rotacao); os anteriores seguem validos ate expirar. O valor bruto (24 bytes -> 48 hex) so existe no e-mail.
- Acompanhamento: validade configuravel por empresa (`RecruitmentSetting.trackingTokenDays`, padrao 90, limite 7 a 365; campo na tela de privacidade do RH). Expirado = 410 com orientacao para entrar na conta. Entrevista: vale ate 24 h depois do horario marcado.
- Transicao: valores brutos antigos ainda sao aceitos; ao serem usados viram hash e o bruto e apagado. A migration ja converte todos os existentes (links enviados continuam funcionando) e zera os brutos.
- Anonimizacao apaga os tokens; o cron diario remove tokens vencidos ha mais de 30 dias.
- Arquivos alterados fora do escopo estrito (necessidade do item): `interview-followup.service.ts` (2 pontos: resolver o token e emitir o token da pagina de horarios), `recruitment.service.ts` (nao grava mais `responseToken`), `recruitment-workflow.service.ts` (link de acompanhamento via emissor). Token da oferta de horarios, proposta e teste nao mudaram (fora do item).

## Prova de migration (Postgres 16 descartavel, porta 5499)
Baseline + todas as migrations >= 20261006100001, cada uma em transacao; legado semeado (1 candidatura com `trackingToken`, 1 entrevista com `responseToken`) antes das novas:
- Backfill: `tracking_hash_ok=t`, `ok90=t`, `interview_hash_ok=t`; `raw_tracking_left=0`, `raw_interview_left=0`.
- Segunda aplicacao das novas migrations: sem erro, ainda 2 tokens (idempotente).
- `prisma migrate diff --from-url ... --to-schema-datamodel prisma/schema.prisma --script` = `-- This is an empty migration.` (com as 3 migrations do pacote: 20261101010000, 20261101020000, 20261101030000).

## Testes
`recruitment-access-tokens.spec.ts` (11), `tracking-token-flow.spec.ts` (4); ajustes de mocks em `recruitment-end-to-end.spec.ts` e `recruitment-hardening.spec.ts`. Jobs + contract: 66 arquivos / 525 testes; `tsc` api e web limpos; lint web 0 erros.

## Riscos
- Links de acompanhamento antigos passam a expirar 90 dias apos a migracao.
- Lembrete de entrevista gera uma linha de token por envio (limpeza pelo cron).
