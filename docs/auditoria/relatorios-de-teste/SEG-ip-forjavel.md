# SEG-ip-forjavel: IP do cliente vindo de cabeçalhos forjáveis

**Gravidade:** média. **Onda:** 1 (adiantada). **Origem:** `docs/auditoria/01a-endpoints.md`, item 2.

## Problema
Quatro lugares liam `x-forwarded-for`, `x-real-ip` e `cf-connecting-ip` direto do cliente antes de usar `request.ip`:
- `modules/privacy/privacy.controller.ts` (IP do aceite dos termos: prova de consentimento LGPD)
- `modules/users/users.controller.ts` (IP nas ações sobre usuários)
- `common/interceptors/audit.interceptor.ts` (IP na trilha de auditoria)
- `common/guards/rate-limit.guard.ts` (chave do limite de tentativas)

Um cliente podia mandar `cf-connecting-ip: 1.2.3.4` e aparecer com esse IP na auditoria e no consentimento, e escapar do limite de tentativas trocando o cabeçalho.

## Documentação
- Fastify, `Request.ip` (instalado, v5.12.5, `node_modules/fastify/docs/Reference/Request.md`): "`ip` ... é tirado de `socket.remoteAddress` (ou de `X-Forwarded-For` quando `trustProxy` está ligado)". **VERIFICADO** (arquivo local da versão em uso).
- Fastify, `trustProxy` (`.../Reference/Server.md`): com `trustProxy` ligado o Fastify confia em `X-Forwarded-*` apenas dos IPs/CIDR da lista; "do contrário podem ser facilmente forjados". **VERIFICADO**.
- URL oficial equivalente: https://fastify.dev/docs/latest/Reference/Request/ (página na internet bloqueada neste ambiente; conteúdo conferido na cópia instalada).
- Configuração do projeto: `main.ts` já usa `trustProxy: process.env.TRUST_PROXY ?? 'loopback,uniquelocal'`.

## Correção
- Novo `common/http/client-ip.ts` com `clientIp(request)`, que devolve somente `request.ip`.
- Os quatro lugares passam a usar o helper; a leitura dos cabeçalhos foi removida.
- Teste de contrato impede voltar: nenhum arquivo de `apps/api/src` pode citar esses três cabeçalhos, exceto o helper, o `main.ts` e o teste de autenticação que prova que eles são ignorados.

## Testes (saída real)
- **Antes da correção:** `npx vitest run apps/api/src/common/http/client-ip.spec.ts` → 1 falhou, 3 passaram. O teste de contrato listou os 4 arquivos.
- **Depois:** `npx vitest run apps/api/src/common/http apps/api/src/common/guards apps/api/src/common/interceptors apps/api/src/modules/privacy apps/api/src/modules/users apps/api/src/modules/auth` → 15 arquivos, 105 testes passaram.
- `npx tsc --noEmit -p apps/api` → sem erros.
- Comportamento (Fastify real com `inject`): `cf-connecting-ip` e `x-real-ip` forjados são ignorados; `x-forwarded-for` vindo de origem não confiável é ignorado; vindo do proxy da lista (`127.0.0.1`) vale.

## Validação / o que sobra
- **Na VPS:** o nginx precisa enviar `X-Forwarded-For $proxy_add_x_forwarded_for;` (padrão). Sem isso o IP registrado será o do proxy. Conferir com um login e olhar o IP na auditoria.
- `tests/security/pdf-endpoint-authorization.spec.ts` falhou durante a execução conjunta por causa da reescrita do PDF de ponto feita por outro trabalho em andamento (confere o texto `response.setHeader`); não tem relação com este ajuste.
- O limite de tentativas continua por conta/e-mail nas rotas públicas e em memória: tratado em outro item (SEG rate limit).
