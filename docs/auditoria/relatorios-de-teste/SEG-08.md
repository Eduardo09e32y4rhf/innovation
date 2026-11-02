# SEG-08 — Codigo de recuperacao de senha

## Problema
Codigo de 6 hex (24 bits) em texto puro em `User.resetPasswordCode` e copiado em `Notification.extraJson.resetCode`.
Antes: `apps/api/src/modules/auth/password-reset-code.spec.ts` com 6 de 6 testes falhando (notificacao continha `resetCode`).

## Documentacao
- https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html — VIA BUSCA (host bloqueado): token/codigo gerado com fonte criptograficamente segura, longo o bastante contra forca bruta, armazenado de forma segura, uso unico e com expiracao. Numeros exatos (tamanho, minutos): NAO VERIFICADO (a regra de hash no banco veio de fonte secundaria, nao da OWASP).

## Correcao
- `auth.service.ts`: codigo de 8 caracteres (alfabeto de 32 simbolos, 40 bits) via `crypto.randomInt`; banco guarda apenas HMAC-SHA256(`userId:codigo`) com `PASSWORD_RESET_CODE_SECRET` (ou `JWT_SECRET`); comparacao em tempo constante; validade 30 min apos emitido; 5 tentativas (ja existente) e uso unico.
- O pedido publico so abre janela de 2 h (sem codigo). Novo `POST /auth/password-reset/issue-code` (JwtAuthGuard + Roles ADMIN/RH, mesma empresa, perfil acima de quem pediu, so com pedido pendente) devolve o codigo UMA vez. `Notification.extraJson` agora so tem `resetRequestUserId`.
- `auth.repository.ts`: `setResetCode` aceita hash/null; removido `findByResetCode` (buscava texto puro). DTO `Length(8,8)`; `dto/issue-reset-code.dto.ts`.
- Web: `esqueci-senha/page.tsx` e `reset-password/page.tsx` (8 caracteres, 30 min). Candidato (`carreiras/conta`) nao muda: o fluxo dele ja usa codigo de 6 digitos com hash, tentativas e 10 min (jobs, fora do meu escopo).
- Codigos antigos em claro nunca validam (o valor guardado nao e um HMAC). Limpeza do banco: `UPDATE "User" SET "resetPasswordCode"=NULL WHERE "resetPasswordCode" IS NOT NULL;` (migracao nao feita: fora do meu escopo).

## Testes
`npx vitest run apps/api/src/modules/auth apps/api/src/modules/notifications`: 7 arquivos, 57 testes passando (6 novos). `npx tsc --noEmit -p apps/api` e `npm run typecheck:web`: sem erros.

## Riscos / decisao do usuario
REGRESSAO DE UX ATE A TELA DO RH EXISTIR: sem codigo na notificacao, `[tenant]/dashboard/_components/notification-bell.tsx` e `pending-notifications-gate.tsx` (fora do meu escopo) ainda procuram `extraJson.resetCode`; precisam de um botao "Gerar codigo" que chame `POST /auth/password-reset/issue-code` com `extraJson.resetRequestUserId` e mostre o codigo uma vez. Com e-mail configurado o fluxo por link nao muda.
