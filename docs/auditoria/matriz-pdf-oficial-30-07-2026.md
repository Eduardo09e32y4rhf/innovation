# Matriz de PDFs Oficiais - 30/07/2026

## Backend-only validado por contrato

- Financeiro da Plataforma: `GET /finance/platform/statements/pdf`
- Contratos manuais da Plataforma: `GET /manual-contracts/:id/pdf`
- Fechamento de ponto coletivo: `GET /time-closing/collective/pdf`
- Fechamento de ponto individual: `GET /time-closing/:id/pdf-stream`
- Ferias: `GET /vacations/:id/receipt.pdf`
- Funcionarios:
  - `GET /employees/:id/documents/point-sheet.pdf`
  - `GET /employees/:id/documents/occurrences.pdf`
  - `GET /employees/:id/documents/record.pdf`
- Gestao:
  - encaminhamento de ASO
  - documento disciplinar
  - fechamento operacional
- Documentos persistidos com hash via modulo `documents`

## Barreira de frontend

- As paginas oficiais de Gestao, Ferias, Ponto, Funcionarios e Plataforma nao importam nem chamam `printPdf`.
- Nenhum arquivo TypeScript/TSX fora de `apps/web/app/lib/pdf-utils.ts` consome `printPdf`, `buildPdfShell` ou `pdf-utils`.
- O utilitario legado ainda existe, mas esta sem consumidores e protegido por teste contra reintroducao.

## Evidencias

- `tests/security/official-pdf-boundary.spec.ts`
- `tests/security/pdf-endpoint-authorization.spec.ts`
- `npm run test:security`: 35 testes aprovados em 30/07/2026

## Ainda nao validado

- download manual dos documentos na VPS
- segunda via apos deploy
- comparacao visual entre PDF, tela e snapshot persistido
- comportamento com grande volume de registros
