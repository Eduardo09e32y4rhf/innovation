# API-02: corpos sem validacao de tipo (Onda 1, grupo G2)

## Problema (confirmado no codigo)
- `proposals.service.ts` exportava `interface CreateProposalDto/AcceptTermsDto` e `promotions.service.ts` uma `class PromotionDto` SEM decorators: o ValidationPipe nao valida interface; e uma classe sem decorators com `forbidNonWhitelisted` rejeitaria todos os campos.
- `DeductionRuleDto.value/maxAmount`, `PlanPayloadDto` (dinheiro, transform que apenas descartava tipos estranhos) e `UpdatePlatformCompanyDto.activeModules` so tinham `@IsOptional`.
- `platform-support.controller.ts` `@Body('priority')` cru; `commercial-sales` `@Body('paymentReference')`, `@Param('status')` sem validacao. O DTO `UpdateSupportPriorityDto` existente aceitava `MEDIUM`, que nao existe no enum Prisma (viraria erro do banco).
- 159 `@Param` de UUID sem `ParseUUIDPipe` (28 controllers; ids sao todos `uuid()`/`gen_random_uuid()` no schema, exceto 3 modelos cuid internos que nao sao parametro de rota).

## Documentacao
https://docs.nestjs.com/techniques/validation : NAO VERIFICADO online (docs.nestjs.com bloqueado, ENOTFOUND). Regra confirmada no codigo/comportamento: `apps/api/src/main.ts:95` usa `ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true, exceptionFactory: friendlyValidationFactory })` (VERIFICADO); o teste reproduz essa configuracao e prova que corpo tipado como interface nao e validado e que a classe com decorators e (`design:paramtypes` no teste de controllers). `ParseUUIDPipe({ optional })` e `ParseEnumPipe({ optional })` VERIFICADOS em `node_modules/@nestjs/common/pipes/*.d.ts`.

## Correcao
- Novos: `proposals/dto/proposal.dto.ts`, `promotions/dto/promotion.dto.ts`, `commercial-sales/dto/commission-transition.dto.ts`, `common/validators/money-like.ts` (`@IsMoneyLike`: numero >= 0 ou texto monetario BR; rejeita negativo, NaN, objeto, booleano).
- Aplicado em DeductionRuleDto (value, maxAmount), PlanPayloadDto, PromotionDto; `activeModules` com `@IsArray @IsString({each})`; prioridade com os 4 valores do enum Prisma.
- `ParseUUIDPipe` em todos os `@Param` de id/companyId/employeeId/userId/jobId/taskId/interviewId/ceoUserId (exceto `finance/` e `auth/`, de outros grupos) e em queries UUID opcionais (accounting, manual-contracts, schedule, hub, recruitment-metrics); `ParseEnumPipe` em `status` de time-closing e na transicao de comissao.
- Corrigido bug adjacente em `promotions.service.ts`: `newSalary` numerico (ex. 5500.5) era lido como 55005 por remover pontos; agora numero e usado direto e texto remove so separador de milhar.
- `schedule-hub/hub-attachments.http.spec.ts` passou a usar UUID valido na URL (antes `a1`).
- `tests/security/inline-body.spec.ts` continua passando.

## Whitelist / forbidNonWhitelisted (documentado)
Globais e ligados em `main.ts`: propriedades sem decorator sao removidas e as extras geram 400 (`campo nao reconhecido`). Webhooks (Asaas/MP) usam interface por design (allowlist no inline-body.spec).

## Testes
`tests/contract/dto-validation.spec.ts`: 8 testes (propostas, promocoes, deducao, planos, activeModules, prioridade/comissao, controllers recebem classe, scan de `@Param` sem pipe). Suite completa `npx vitest run tests apps/api/src`: 268 arquivos, 2971 passaram, 155 expected fail preexistentes, 0 falhas. `npx tsc --noEmit -p apps/api`: sem erros.

## Nao feito / riscos
- As ~50 `@Query('x')` restantes (strings de filtro, `month`, `page`, `status` livres) NAO viraram QueryDto: o Prisma/servicos ja devolvem 400 por `PrismaClientValidationError`/validacao propria. Recomendo QueryDto por modulo numa proxima rodada (month AAAA-MM, page/limit inteiros, status enum).
- Controllers de `finance/` e `auth/` nao tocados (outros grupos): `@Param` deles seguem sem pipe.
- Clientes que enviavam valor monetario negativo/lixo ou ids nao-UUID agora recebem 400; front verificado para promocoes (envia numero ou null).
