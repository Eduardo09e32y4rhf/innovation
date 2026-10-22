# Innovation: correções e preparação para Sites — 07/10/2026

Base: 5e8cdab5af2c052f5bc23d05f92376f9899ad68e. Esta entrega é uma primeira etapa do plano anexado; não declara o sistema pronto para vender.

## Alterações

- Node 24/npm 11 definidos no pacote, .nvmrc, CI e Docker. Docker usa npm ci. Removidos os overrides opcionais SWC 14.2.35 do frontend: Next 14.2.35 declara SWC 14.2.33. O lockfile usa agora a árvore publicada pelo Next.
- Comparação de migrations usa o caminho correto do schema. Defaults UUID de três tabelas de recrutamento refletem o gen_random_uuid() já existente nas migrations, sem alteração do banco.
- Workspace verifica os workflows atuais. ci-ok rejeita todo resultado diferente de success. Browser E2E entra no gate obrigatório e não usa bypass de lockfile. CI define URL local para validação do schema; jobs de banco têm URL própria.
- JWT de acesso tem finalidade explícita. Guards não utilizam JWT de MFA, recuperação ou confirmação como identidade de acesso. Tokens antigos devem ser renovados pelo cookie ou exigir novo login.
- Access token vinculado à família de sessão ativa; logout/revogação bloqueiam access tokens dessa família. Versão da senha usa o timestamp persistido em milissegundos, evitando comparação com iat truncado.
- Refresh consome condicionalmente a sessão e cria um sucessor na mesma transação. Falha na criação reverte o consumo. O cliente compartilha uma promessa por aba e usa Web Locks quando disponíveis para serializar abas.
- Troca de senha devolve novo access token, preserva somente a família atual válida do próprio usuário e revoga as demais. Cliente atualiza o token imediatamente.
- Logout aguarda /auth/logout; falha é exibida e não provoca redirecionamento que afirme sucesso. Permissões de Faturas são limpas ao encerrar a sessão.
- Corrigida rota GET /faturas/empresa/seats/quote.
- Falhas no cancelamento Mercado Pago interrompem a operação e preservam o vínculo. Assinatura vinculada sem configuração não é tratada como cancelada. Rotina de inadimplência cancela o MP antes de marcar empresa como cancelada, permitindo retentativa.
- Cancelamento Asaas de assinatura vinculada exige integração configurada.
- Robô de QA restrito a desenvolvimento; produção remove credenciais e estado antigos do navegador, mesmo com a flag ligada.
- Formulário de cobrança avulsa permite registro local sem envio ao Asaas.
- Corrigida deduplicação de dispositivos, que usava uma chave constante e exibia apenas um aparelho.

## Validação local

- npm ci: aprovado em Linux com Node 24.19.0 e npm 11.9.0.
- npm run validate: aprovado com DATABASE_URL local de teste (validação do schema, sem conexão ao banco).
- npm run test:unit: 96 arquivos, 539 testes aprovados, incluindo rejeição de JWT restrito, família encerrada e versão de senha, além de cancelamento MP.
- Builds finais API/Web: aprovados, incluindo a atualização de sessão.
- CI remoto: validação, unitários/cobertura e build passaram. Migrations foram aplicadas em banco vazio; a verificação inicial de drift revelou caminho incorreto e depois defaults UUID divergentes. Ambos foram corrigidos. Comparação de migrations, os cinco testes de integração com PostgreSQL real, tipos, unitários/cobertura e build passaram no run 37676566122. Browser E2E ainda em execução; resultados da revisão posterior devem ser conferidos no PR 660.
- Adicionados testes de integração em PostgreSQL real para consumo concorrente de refresh e invalidação do access token após logout.
- Não executados localmente: integração/migrations com PostgreSQL/Redis, E2E com browser, sandbox financeiro e piloto. Não houve acesso a banco ou dados de clientes.
- A disponibilidade HTTP 200 da API no domínio existente não confirma que esta branch foi implantada na VPS.

## Sites

Versão 2 salva, sem publicação. Projeto privado preparado: appgprj_6ac68bcf06ec81919b9cdb907cff64cc. A interface existente foi adaptada ao Vinext/Worker com build e TypeScript aprovados. API e banco permanecem na VPS. O proxy encaminha /api/ para https://innovationia.com.br e não repassa credenciais do ChatGPT. QA visual e login completo ainda não foram executados.

## Pendências do plano

Permissões canônicas e migração dos dados antigos; RH_RS e alcance por empresa; unificação da navegação da Plataforma e abas dinâmicas de Faturas; estados financeiros e reconciliação/outbox; idempotência de estorno e cobrança; cadastro/vínculo usuário-funcionário e proteções completas por perfil; validação de ambientes, backup, rollback e piloto. Atualizar este registro conforme cada etapa for implementada e testada.

Não fazer merge/deploy de produção, cobrança real ou operações com clientes automaticamente: o plano anexado exige autorização específica para publicação e operação. O PR inicial 658 foi integrado no GitHub durante a validação por uma ação externa a esta execução. Correções posteriores estão no PR 660 para revisão; nenhuma publicação Sites ou alteração de VPS foi executada por esta entrega.
