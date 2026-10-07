# Innovation: correções e preparação para Sites — 07/10/2026

Base: 5e8cdab5af2c052f5bc23d05f92376f9899ad68e. Esta entrega é uma primeira etapa do plano anexado; não declara o sistema pronto para vender.

## Alterações

- Node 24/npm 11 definidos no pacote, .nvmrc, CI e Docker. Docker usa npm ci. Removidos os overrides opcionais SWC 14.2.35 do frontend: Next 14.2.35 declara SWC 14.2.33. O lockfile usa agora a árvore publicada pelo Next.
- Workspace verifica os workflows atuais. ci-ok rejeita todo resultado diferente de success. CI define URL local para validação do schema; jobs de banco têm URL própria.
- JWT de acesso tem finalidade explícita. Guards não utilizam JWT de MFA, recuperação ou confirmação como identidade de acesso. Tokens antigos devem ser renovados pelo cookie ou exigir novo login.
- Access token vinculado à família de sessão ativa; logout/revogação bloqueiam access tokens dessa família. Versão da senha usa o timestamp persistido em milissegundos, evitando comparação com iat truncado.
- Refresh consome condicionalmente a sessão e cria um sucessor na mesma transação. Falha na criação reverte o consumo. O cliente compartilha uma promessa por aba e usa Web Locks quando disponíveis para serializar abas.
- Troca de senha devolve novo access token, preserva somente a família atual válida do próprio usuário e revoga as demais. Cliente atualiza o token imediatamente.
- Logout aguarda /auth/logout; falha é exibida e não provoca redirecionamento que afirme sucesso. Permissões de Faturas são limpas ao encerrar a sessão.
- Corrigida rota GET /faturas/empresa/seats/quote.
- Falhas no cancelamento Mercado Pago interrompem a operação e preservam o vínculo. Assinatura vinculada sem configuração não é tratada como cancelada. Rotina de inadimplência cancela o MP antes de marcar empresa como cancelada, permitindo retentativa.
- Cancelamento Asaas de assinatura vinculada exige integração configurada.
- Corrigida deduplicação de dispositivos, que usava uma chave constante e exibia apenas um aparelho.

## Validação local

- npm ci: aprovado em Linux com Node 24.19.0 e npm 11.9.0.
- npm run validate: aprovado com DATABASE_URL local de teste (validação do schema, sem conexão ao banco).
- npm run test:unit: 96 arquivos, 539 testes aprovados, incluindo rejeição de JWT restrito, família encerrada e versão de senha, além de cancelamento MP.
- Build API e Web: aprovados. Build Web foi executado antes da última atualização de sessão; typecheck e validação foram repetidos depois. Rodar o build final no CI.
- Não executados: migrations em banco vazio/existente, integração com PostgreSQL/Redis, E2E com browser, sandbox dos provedores e piloto. O ambiente local não dispõe desses serviços e não recebeu credenciais de teste.
- A disponibilidade HTTP 200 da API no domínio existente não confirma que esta branch foi implantada na VPS.

## Sites

Projeto privado preparado: appgprj_6ac68bcf06ec81919b9cdb907cff64cc. A interface existente foi adaptada ao Vinext/Worker com build e TypeScript aprovados. API e banco permanecem na VPS. O proxy encaminha /api/ para https://innovationia.com.br e não repassa credenciais do ChatGPT. QA visual e login completo ainda não foram executados.

## Pendências do plano

Permissões canônicas e migração dos dados antigos; RH_RS e alcance por empresa; unificação da navegação da Plataforma e abas dinâmicas de Faturas; estados financeiros e reconciliação/outbox; idempotência de estorno e cobrança; cadastro/vínculo usuário-funcionário e proteções completas por perfil; validação de ambientes, backup, rollback e piloto. Atualizar este registro conforme cada etapa for implementada e testada.

Não fazer merge/deploy de produção, cobrança real ou operações com clientes automaticamente: o plano anexado exige autorização específica para publicação e operação. Esta branch é destinada à revisão.
