# SEG-14: superficie desnecessaria, parte do grupo G2 (WebSocket)

## Escopo deste grupo
Somente o gateway WebSocket. Health publico, CSP, `@Throttle` em `/public/jobs*` e nginx pertencem a G1/INF-10. Anotado para G1: `GET /lookup/cep|cnpj` e `/platform/receita/:cnpj` continuam SEM limite proprio (so o global); o limite fica com o grupo G1.

## Problema (confirmado)
- `CommunicationGateway` (namespace `communication`) era registrado mesmo com `FEATURE_COMMUNICATION` desligada (padrao).
- `redis-io.adapter.ts` nao autenticava ninguem: o unico middleware roda so no namespace `/` (nao no `communication`) e usava o `companyId` enviado pelo cliente (`handshake.query/auth`) como chave do limitador.
- O gateway nao tinha `handleConnection`: nenhuma sala era atribuida, entao `emitToCompany` nao chegaria a ninguem e, no dia em que alguem adicionasse `join` com dado do cliente, seria cross-tenant.

## Documentacao
https://docs.nestjs.com/websockets/gateways : NAO VERIFICADO online (docs.nestjs.com bloqueado, ENOTFOUND). Comportamento VERIFICADO no codigo instalado: `@nestjs/platform-socket.io` (`IoAdapter.create` usa `createIOServer(port).of(namespace)`), `socket.io` 4.8.3 (`new_namespace` emitido em `dist/index.js:477`; middlewares por namespace). Provado com handshake real (polling HTTP) no teste.

## Correcao
- `common/adapters/socket-auth.ts` (novo): middleware que exige JWT de ACESSO (`assertAccessToken`, mesmo criterio do `JwtAuthGuard`) em `handshake.auth.token` ou `Authorization: Bearer` (nunca na query); grava `socket.data.user` com `companyId` DO TOKEN.
- `redis-io.adapter.ts`: limitador por IP (nao mais por companyId do cliente) e autenticacao aplicados ao namespace `/` e a todo namespace novo (`new_namespace`).
- `communication.gateway.ts`: `handleConnection` entra na sala do `companyId` verificado; sem identidade, desconecta.
- `communication.module.ts`: gateway so e provider com `isFeatureEnabled('communication')`; `communication.service.ts` recebe o gateway como `@Optional()`. Sem a flag nao ha servidor socket.io.

## Testes
`tests/contract/socket-auth.spec.ts`: 6 testes. Antes da correcao: 5 falharam (sem token conectava; gateway sempre registrado). Depois: 6 passaram. Suite completa `npx vitest run tests apps/api/src`: 270 arquivos, 2984 passaram, 155 expected fail preexistentes, 0 falhas; `tsc --noEmit -p apps/api` ok.

## Riscos / pendencias
- A flag e lida na importacao do modulo (como `allowedOrigins`): em producao vem do ambiente do container; `.env` carregado so depois do import manteria o gateway desligado (falha segura).
- O JWT do handshake nao consulta banco/sessao revogada (o REST consulta); vale ate expirar o token de acesso. Registrado como melhoria se a flag for ligada.
- O front nao tem cliente socket.io hoje; quem for implementar deve enviar `auth: { token }`.
- Limite de 50 conexoes/min agora e por IP (escritorios atras de NAT compartilham).
