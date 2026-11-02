# RS-C-09: verificacao de e-mail no cadastro da conta do candidato

## Problema
`register` criava a conta e iniciava sessao sem confirmar o e-mail; `verifiedAt` so era preenchido no `resetPassword`. O pre-preenchimento da admissao (`jobs.repository.ts` hire) exige `verifiedAt`, e agora a prova de posse do e-mail (RS-C-12) tambem.

## Documentacao
OWASP Authentication Cheat Sheet / Email verification: codigo de uso unico, expiracao curta, limite de tentativas e de reenvio. VIA BUSCA (nao fetch); segue o mesmo padrao do reset de senha do projeto (6 digitos, 10 min, 5 tentativas, hash).

## O que mudou
- `register` envia codigo de 6 digitos (`CandidateLoginCode.purpose='VERIFY'`, so hash; e-mail `candidateEmailVerificationEmail`). Conta nasce sem `verifiedAt`.
- `POST /candidate-portal/auth/verify-email` (10/min): valida codigo (10 min, 5 tentativas) e grava `verifiedAt`.
- `POST /candidate-portal/auth/resend-verification` (5/min): intervalo minimo de 60 s e no maximo 3 codigos por 10 min (429); novo codigo invalida o anterior.
- `GET /me` devolve `emailVerified`. `applyWithProfile` exige e-mail verificado (400 com mensagem). `resetPassword` continua marcando verificado (prova de posse tambem).
- Web: `VerifyEmailBanner` no topo de toda a Area do candidato (campo do codigo, confirmar, reenviar).
- Sem migration (reaproveita `CandidateLoginCode.purpose` livre).

## Testes
`candidate-email-verification.spec.ts` (8 testes), ajuste de 1 fixture em `candidate-account.service.spec.ts`. Jobs: 31 arquivos / 248 testes; contract 246; `tsc` api e web limpos; lint web 0 erros.

## Riscos
Contas antigas sem `verifiedAt` passam a ver o aviso e a nao poder "reutilizar perfil" ate confirmar (por design). Nao ha verificacao por link (so codigo).
