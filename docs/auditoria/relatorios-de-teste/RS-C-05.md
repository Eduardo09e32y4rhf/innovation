# RS-C-05: lembrete ao candidato e reemissao de link de documentos

Parte documental do item, entregue junto com RS-D-07. Relatorio completo: `RS-D-07.md`.

- Lembrete D-3/D-1 ao candidato (so pendencias) e aviso ao RH: `sendLinkReminders`.
- Reemissao sem perder historico: `POST /jobs/document-requests/:requestId/reissue` (RH, RH_RS, ADMIN, DEV; resposta 200), link novo com `reissuedFromId`, antigo revogado, documentos preservados; botao na tela de documentos do candidato (RH).
- Testes: `recruitment-documents-lifecycle.spec.ts` ("lembretes de link D-3 e D-1", "reemitir link sem perder o historico").
