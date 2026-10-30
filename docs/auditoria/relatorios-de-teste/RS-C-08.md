# RS-C-08 — vencimento e lembrete de prazos do candidato

**Problema:** proposta, teste e horários vencidos continuavam `SENT`/`PENDING` no banco (o EXPIRED era só calculado na leitura) e o candidato nunca era lembrado antes do fim do prazo.

**Correção:** `CandidateDeadlinesService` + cron de hora em hora (CronLock). `expireOverdue` grava `EXPIRED` em `JobOffer` (SENT), `AssessmentInvite` (SENT/STARTED) e `InterviewSlotOffer` (PENDING) vencidos. `remindExpiring` envia um único e-mail nas últimas 48 h (link da proposta, do teste ou da escolha de horário), ignora candidaturas anonimizadas/encerradas e só marca `reminderSentAt` se o e-mail realmente saiu. Migração `20261102010000_rs_c08_deadline_reminders` (3 colunas, idempotente).

**Testes:** `candidate-deadlines.service.spec.ts` (3). Migrações aplicadas em PG16 limpo: sem drift. Suíte completa: 312 arquivos / 3247 testes; tsc limpo.
