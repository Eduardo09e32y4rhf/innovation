# RS-R-03 — recrutador é avisado de nova candidatura

**Problema (P0):** `JobsService.apply` registrava a candidatura sem avisar ninguém; o RH só descobria abrindo a vaga.

**Correção:** após registrar (e gravar consentimento/prova), `notifyNewApplication` chama `RecruiterNotifierService.notify` com kind `APPLICATION_RECEIVED`: e-mail aos responsáveis da vaga (`JobRecruiter`) e sino para RH/ADMIN, prioridade baixa. Não avisa quando a candidatura foi reprovada automaticamente por pergunta eliminatória. Falha no aviso nunca derruba a candidatura.

**Testes:** `new-application-notice.spec.ts` (3). api+tests: 144 arquivos verdes; tsc limpo.
**Decisão pendente do produto:** hoje é um aviso por candidatura; resumo diário configurável fica como melhoria se o volume incomodar.
