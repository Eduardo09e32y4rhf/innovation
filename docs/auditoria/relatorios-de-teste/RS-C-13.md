# RS-C-13 — proposta aceita para contratar e e-mail com retentativa

**Problema:** a contratação não olhava o estado da proposta e o e-mail de boas-vindas era disparado com `void`, sem nova tentativa.

**Correção:** `JobsService.hire` consulta os estados das propostas da candidatura (`repository.offerStatuses`): havendo proposta e nenhuma ACEITA, responde 400; exceção com `skipOfferCheck` + justificativa (≥10 caracteres) grava `HIRE_OFFER_OVERRIDE` na auditoria. Sem nenhuma proposta registrada a contratação segue livre (módulo de propostas é opcional — decisão de produto, reversível). O e-mail de boas-vindas passa por até 3 tentativas com espera crescente; a falha final continua registrada no histórico (`HIRED_EMAIL`). A tela de contratação usa uma única caixa de exceção (documentos/proposta).

**Testes:** `hire-documents-gate.spec.ts` (6, incluindo retentativa). jobs + contract: 84 arquivos, todos verdes; tsc API e web limpos.
