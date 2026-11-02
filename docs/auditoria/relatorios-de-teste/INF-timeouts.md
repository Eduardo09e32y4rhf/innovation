# INF timeouts (Onda 1)

## Problema
Chamadas HTTP externas sem limite de tempo travavam a requisicao do cliente: mercadopago.service.ts, platform.service.ts (CNPJ/ReceitaWS), geocoding.service.ts, holidays.service.ts e time-track.service.ts (Nominatim) usavam `fetch` cru.

## Documentacao
- MDN `AbortSignal.timeout()` (developer.mozilla.org): NAO VERIFICADO, dominio bloqueado na sessao (ENOTFOUND). Comportamento confirmado empiricamente no Node v22.22.0: o teste com servidor `http.createServer` que nunca responde rejeita perto do limite. `AbortSignal.any` (usado para combinar com o signal do chamador) existe no Node 20.3+; o teste "respeita o signal do chamador" cobre.

## Correcao
- Novo helper `apps/api/src/common/http/outbound.ts`: `outboundFetch(url, init, {timeoutMs})`, `OutboundTimeoutError`, constantes 5000 ms (consulta publica) e 15000 ms (gateway de pagamento).
- Migrados todos os 12 `fetch(` de apps/api/src: mercadopago (15 s, ja virava 503), asaas (era 12 s, agora 15 s), platform CNPJ (5 s; timeout vira 503 em portugues), geocoding (5 s; falha devolve null, cadastro segue), holidays (5 s; falha loga e devolve [], mantem o que ja esta no banco), time-track (5 s), punch (2,5 s mantido), mail (10 s), turnstile, lookup (6 s), pdf-report (5 s).
- Contrato `tests/contract/outbound-timeouts.spec.ts`: falha se houver `fetch(`/axios/undici fora de `common/http/outbound.ts` (unica excecao, o proprio helper).

## Comandos e resultados
- Antes: `npx vitest run apps/api/src/common/http/outbound.spec.ts tests/contract/outbound-timeouts.spec.ts` -> 2 arquivos falhando (helper inexistente; 12 ocorrencias de `fetch(` listadas).
- Depois: mesmos testes passam; `npx tsc --noEmit -p apps/api` sem erros; suite `npx vitest run apps/api tests/security tests/contract`: 202 arquivos, 1708 testes passando (3 expected fail preexistentes). Uma rodada anterior teve 1 falha intermitente em accounting-hub (fechamento 21/09-20/10) que passou isolada e na rodada seguinte.

## Riscos
- Asaas passa de 12 s para 15 s (alinhado a regra de gateways).
- `syncNationalHolidays` nao propaga mais erro (retorna []); nenhum chamador no codigo.
- Timeout nao cancela efeito remoto: em pagamentos a chamada pode ter sido concluida no gateway; idempotencia por chave (Mercado Pago) mitiga.
