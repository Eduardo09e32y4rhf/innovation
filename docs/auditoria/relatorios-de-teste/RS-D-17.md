# RS-D-17: codigo por e-mail antes do upload no link do candidato

## Problema
Quem tinha o link (encaminhado, em print, no historico do navegador) enviava e via status dos documentos sem nenhuma verificacao de que e o candidato. Antes: nao existiam `sendVerificationCode`/`verifyCode` e o upload nao exigia nada alem do token.

## Documentacao
- Boas praticas OWASP para OTP por e-mail (6 digitos, expiracao curta, limite de tentativas, comparacao em tempo constante, rate limit): VIA BUSCA / conhecimento geral; nao ha norma brasileira especifica. `crypto.randomInt` (CSPRNG) e `timingSafeEqual`: VERIFICADO na documentacao do Node.
- LGPD art. 46 (seguranca): VIA BUSCA; adequacao final do usuario/DPO.

## Implementacao
- `POST /public/candidate-documents/:token/code` (200, 3/min) envia 6 digitos ao e-mail da candidatura; valido 10 min; intervalo de 60 s entre pedidos; 503 se o e-mail nao saiu.
- `POST /public/candidate-documents/:token/verify` (200, 10/min) com `{code}` (6 digitos). Max. 5 tentativas por codigo (contadas antes de comparar, condicional no banco), depois e preciso pedir outro. Sucesso grava `verifiedAt` e apaga o hash.
- Banco: so `codeHash` = SHA-256(`id do link:codigo`); o codigo nunca e gravado.
- `publicUpload` recusa com 403 `CODE_REQUIRED` enquanto o link nao foi confirmado. Sem e-mail cadastrado nada ha a verificar e vale so o link (documentado como limitacao).
- Link reenviado pelo proprio sistema ao mesmo e-mail (lembrete D-3/D-1 e devolucao) herda a confirmacao; link gerado ou reemitido pelo RH exige nova confirmacao.
- `publicView` informa `verification {required, verified, emailHint}` com e-mail mascarado (`a***@dominio`).
- Tela `/carreiras/documentos/[token]`: bloco "Confirme que e voce" (pedir codigo, digitar, confirmar), campos de arquivo desabilitados ate confirmar; mensagens em portugues; campo numerico com `autocomplete=one-time-code`.
- Contrato: duas rotas publicas novas registradas em `tests/contract/controllers-guards.spec.ts`.

## Testes e saida real
`recruitment-documents-code.spec.ts` (7) e `tests/unit/web/candidate-documents-code.spec.ts` (2).
```
npx vitest run apps/api/src/modules/jobs tests/contract -> verde (ver pacote); tests/contract: 31 arquivos / 246 testes passando
npx tsc --noEmit -p apps/api ; npm run typecheck:web -> sem erros ; lint:web -> 0 errors
```

## Riscos
- Depende do provedor de e-mail configurado; sem ele o candidato com e-mail nao consegue enviar (mensagem clara + 503). O RH pode, nesse caso, remover o e-mail da candidatura ou resolver o provedor.
