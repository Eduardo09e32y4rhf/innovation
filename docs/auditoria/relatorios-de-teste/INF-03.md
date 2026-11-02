# INF-03 — Redis fora do ar: fallback em memoria (nao mais fail-open)

## Problema
Sem Redis, `acquireLock` devolvia `true` (todas as instancias rodam o cron) e `incr` devolvia `0` (o limite nunca bloqueia).
Teste que falhava antes: `apps/api/src/common/redis/redis.service.spec.ts` (3 falhas: incr=0, segundo acquireLock=true, contador nao expira).

## Documentacao
- https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/ — VIA BUSCA (host bloqueado para fetch). Regra: lock = `SET key valor NX PX ttl`; o padrao de instancia unica so e seguro enquanto o no existir; correcao critica exige outro mecanismo.
- Regra de maxmemory/noeviction do compose: NAO VERIFICADO (redis.io bloqueado); `docker-compose.prod.yml` nao e do meu grupo, nao alterado.

## Correcao
`common/redis/redis.service.ts`: lock e contador em memoria (Map com expiracao; `expire()` ajusta o contador) quando desconectado ou quando o comando falha; alerta `[Redis] ALERTA ...` no maximo 1x/min; `incr` nunca devolve 0. `cron-lock.decorator.ts`: comentario atualizado (comportamento vem do RedisService).
Decisao: seguro para UMA instancia (situacao atual). Com 2+ instancias e Redis fora, cada uma tem seu lock (documentado; nao subir 2 instancias sem Redis). `failClosed`/`pg_advisory_lock` do catalogo nao implementado (a regra do grupo pediu fallback de instancia unica).

## Testes
- `npx vitest run apps/api/src/common/redis`: 2 arquivos, 15 testes passando (antes: 3 falhas).
- `npx tsc --noEmit -p apps/api`: sem erros.

## Riscos que sobram
Multi-instancia com Redis fora ainda duplica crons; Redis `maxmemory 300mb noeviction` no compose pendente (arquivo de outro grupo).
