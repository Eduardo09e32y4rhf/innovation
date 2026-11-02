# RS-D-11: vencimento na conferencia e alerta ao RH

## Problema
Documento com validade (CNH, certidoes, vacina, ASO) era aprovado sem data e ninguem era avisado ao vencer.

## Documentacao
- CLT art. 168 e NR-7 (ASO periodico/admissional): NAO VERIFICADO online (planalto.gov.br bloqueado); validade padrao do ASO (12 meses) e certidoes (3 a 6 meses) sao apenas sugestao em `suggestedValidityMonths`, o RH informa a data real. **Validacao do usuario/advogado.**

## Implementacao
- `RecruitmentDocument.expiresAt/expiryAlertedAt` (migration `20261101020000_rs_documents_foundation`).
- `review` aceita `expiresAt` (ISO); `validateApproval` exige a data para CNH, ASO, antecedentes e certidoes e recusa data ja vencida.
- `alertExpiringDocuments` (cron diario `recruitment.documents-daily`): aprovados com vencimento em ate 30 dias ou vencidos, uma unica vez (`expiryAlertedAt`; reconferir zera), aviso ao RH (sino + e-mail do conferente) com prioridade ALTA se vencido. Nao registra nome de arquivo nem URL.
- Web: campo de data ao aprovar tipos com validade e exibicao "Vence em".
- Testes: `recruitment-doc-types.spec.ts` (validateApproval) e `recruitment-documents-lifecycle.spec.ts` ("vencimento na conferencia"). Execucao: 60 arquivos / 486 testes verdes (ver RS-D-07).
