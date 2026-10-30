# PAG-04 - Asaas sem chave devolvia {} em silencio

- Problema: `AsaasService.request` retornava `{}` quando `ASAAS_API_KEY` vazia (asaas.service.ts ~75).
- Documentacao: n/a (regra interna: falhar alto). Marcador: n/a.
- Correcao: sem chave, em producao lanca 503 "Provedor de pagamento nao configurado" + log de erro (ALLOW_MOCK_PAYMENTS e ignorado em producao). Fora de producao so devolve `{}` com `ALLOW_MOCK_PAYMENTS=true`; senao lanca 503.
- Arquivos: apps/api/src/modules/finance/asaas.service.ts, asaas-service-unconfigured.spec.ts.
- Testes: `npx vitest run apps/api/src/modules/finance` -> 37 arquivos, 305 testes passando (3 novos). Obs: o teste novo foi escrito junto da correcao (nao vi a falha previa isolada).
- Sobra: item 4 do catalogo (exigir ASAAS_API_KEY no boot em env.validation.ts) fica fora do meu escopo (arquivo de outro grupo); chamadores que dependiam de `{}` em dev agora precisam de ALLOW_MOCK_PAYMENTS=true.
