# RS-C-11 — candidato desiste pela própria conta

**Problema:** o candidato não tinha como sair de um processo; só o RH podia reprovar.

**Correção:** `POST /candidate-portal/applications/:id/withdraw` (sessão do candidato, 10/min). Só vale para candidatura do próprio e-mail; recusa HIRED/REJECTED (409). Move para Reprovados com `DESISTENCIA` pelo `moveApplication` (mantém funil, histórico e métricas, que já contam desistências) e avisa os recrutadores da vaga (`APPLICATION_WITHDRAWN`). `afterRejected` não envia e-mail de reprovação para `DESISTENCIA`. Botão "Desistir desta candidatura" com confirmação na lista de candidaturas.

**Testes:** `candidate-withdraw.spec.ts` (3), `recruitment-privacy-withdraw.spec.ts` (1), rota no contrato de guards. Suíte completa: 311 arquivos / 3244 testes; tsc API e web limpos.
**Não verificado:** clique no navegador.
