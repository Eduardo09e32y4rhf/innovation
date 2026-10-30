# RS-R-02 — Vaga preenchida ao contratar

**Problema:** contratar não alterava a vaga: ela seguia aberta e os demais candidatos ficavam sem resposta.

**Correção:** `JobsRepository.fillJobAfterHire` conta contratados; ao atingir `openings`, a vaga vira `FILLED` com `closedAt`. `JobsService.hire` então rejeita as candidaturas ativas com o código `VAGA_PREENCHIDA` (usa `moveApplication`, que dispara a devolutiva por e-mail idempotente) e grava auditoria `JOB_FILLED`. Não roda se o candidato já estava contratado; falha em um candidato não desfaz a contratação.

**Testes:** `job-fill-on-hire.spec.ts` (4 casos: fecha e rejeita; mantém aberta com vagas restantes; idempotente; tolera falha). Suíte jobs + contract + security: 69 arquivos, 527 testes passando; `tsc` da API sem erros.

**Pendente:** a vaga FILLED some do portal público pela política existente (`availablePublicJob`); validar no navegador.
