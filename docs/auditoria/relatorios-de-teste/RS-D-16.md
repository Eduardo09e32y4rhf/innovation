# RS-D-16: tipo de documento com regras por tipo

Implementado em conjunto com RS-D-09; relatorio completo em `RS-D-09.md`.

- Enum `DOC_TYPES` e `DOC_TYPE_RULES` (`apps/api/src/modules/jobs/recruitment-doc-types.ts`): formatos aceitos, vencimento (`tracksExpiry`/`requiresExpiry`), sensivel + base legal, obrigatoriedade.
- Diploma e escolaridade usam `ALLOW.CERTIFICATE`; foto so PNG/JPEG; demais `ALLOW.DOCUMENT`.
- `RecruitmentDocument.docType/sensitive/legalBasis` gravados no upload; mensagem de erro cita os formatos do tipo.
- Testes: `recruitment-doc-types.spec.ts` ("tipos de documento (RS-D-16)" e "upload respeita o formato do tipo").
- Documentacao: LGPD art. 11 II "a" VIA BUSCA; validacao juridica pendente do advogado.
