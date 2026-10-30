# RS-C-04 — candidato pede outro horário pelo link

**Problema:** pelo link da entrevista o candidato só confirmava ou dizia que não podia; não havia pedido de remarcação distinto.

**Correção:** nova resposta `RESCHEDULE` em `POST /public/recruitment/interview/:token`. Fica gravada como "não pode" (agenda e painel do RH continuam coerentes), com o texto de preferência, evento `INTERVIEW_RESCHEDULE_REQUESTED` no histórico e aviso de prioridade alta ao RH ("pediu outro horário… ofereça novos horários pela ficha"). Página do candidato: botões "Pedir outro horário" e "Não vou conseguir ir".

**Testes:** novo caso em `recruitment-end-to-end.spec.ts`; api+tests: 143 arquivos verdes; tsc API e web limpos.
**Pendente (RS-R-08):** estado NO_SHOW e reagendar em um passo no painel do RH.
