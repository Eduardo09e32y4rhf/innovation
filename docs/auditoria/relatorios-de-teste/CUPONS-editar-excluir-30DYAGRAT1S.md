# Cupons: excluir, editar e o cupom 30DYAGRAT1S

**Pedido do usuário:** criar o cupom `30DYAGRAT1S` e corrigir a impossibilidade de apagar e editar itens (cupons) em Plataforma > Financeiro > Cupons.

## Problemas confirmados no código
1. **Excluir não existia:** `coupons.controller.ts` só tinha GET, POST, PATCH `:id`, `activate` e `deactivate`; a tela só tinha Editar e Ativar/Desativar.
2. **Editar não limpava campos:** a tela omitia do envio os campos esvaziados (limite de usos, mínimo de usuários, início, fim), então o valor antigo permanecia. O código novo também nunca era enviado na edição.
3. **Limite de usos vazio dava erro:** `update()` comparava `null < redemptionCount` (null vira 0) e recusava.

## Documentação / regras consultadas
- class-validator: `@IsOptional()` "ignora todos os validadores quando o valor é `null` ou `undefined`" (README local em `node_modules/class-validator`). **VERIFICADO.** Logo `null` é aceito para limpar um campo.
- class-transformer: `@Type(() => Number)` mantém `null` (testado com `plainToInstance`). **VERIFICADO.**
- Prisma schema do projeto: `CouponRedemption.coupon` é `onDelete: Restrict`; cupom usado não pode ser apagado no banco. Os usos guardam o hash do CPF/CNPJ que já consumiu o teste grátis, por isso a exclusão só vale antes do primeiro uso. **VERIFICADO no schema.**

## Correção
- API: `DELETE /coupons/:id` (somente DEV e CEO, auditado como `COUPON_DELETED`); recusa com 409 cupom já usado (orienta a desativar) e 404 se não existe. `update` aceita `null` em `maxRedemptions`, `minSeats`, `startsAt`, `expiresAt`. Repositório: `delete` e `countRedemptions`.
- Tela: botão **Excluir** (só em cupom sem usos) com confirmação; ao editar envia `null` nos campos esvaziados e envia o código quando ele muda (cupom não usado).
- Cupom `30DYAGRAT1S`: migration `20261030100000_coupon_30dyagrat1s`, tipo `TRIAL_DAYS`, 30 dias, ativo, sem desconto, `ON CONFLICT ("code") DO NOTHING`. Respeita a regra do produto: teste grátis não gera desconto.

## Testes (saída real)
- Antes: `coupons.service.spec.ts` + `tests/contract/coupon-admin.spec.ts` → **9 falharam, 4 passaram**.
- Depois: `npx vitest run apps/api/src/modules/coupons tests/contract/coupon-admin.spec.ts` → **23 passaram**.
- `npx tsc --noEmit -p apps/api` e `npm run typecheck:web`: sem erros. Lint da tela: sem erros.
- Banco (Postgres 16 descartável): 43 migrations aplicadas em sequência; o cupom aparece como `30DYAGRAT1S|TRIAL_DAYS|30|ativo|0 usos|{}`; reaplicar a migration não duplica (1 linha); `prisma migrate diff` contra o schema = vazio.

## Sobra
- O cupom só passa a existir em produção **depois do deploy** (a migration é aplicada pelo `apply-migrations.sh`). Para conferir: Plataforma > Financeiro > Cupons.
- Não testado no navegador (a tela não foi aberta).
- A exclusão é para DEV e CEO. Contador (CONTABIL) continua podendo criar e editar, não excluir.
