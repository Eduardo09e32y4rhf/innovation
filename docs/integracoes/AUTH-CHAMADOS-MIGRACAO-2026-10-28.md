# Innovation — autenticação e chamados especializados

Avaliação de 28/10/2026, incorporada à execução de APIs e serviços separados. Nenhum IdP ou helpdesk externo foi ativado. O login e os chamados atuais continuam sendo a implementação ativa até o piloto ser aprovado. WhatsApp permanece fora do escopo.

## Escolha para o piloto

| Opção | Situação confirmada | Decisão |
| --- | --- | --- |
| Supabase Auth | Free com 50.000 usuários ativos/mês, até dois projetos ativos e pausa após uma semana de inatividade; envio padrão de autenticação é para testes, com destinatários restritos e limite muito baixo | Primeiro candidato para validar integração rápida de identidade. Usar SMTP próprio, MFA e vínculo explícito com o usuário local. Free não é a aprovação de disponibilidade para produção crítica |
| Keycloak | Projeto aberto sob Apache-2.0; produção exige banco, TLS, hostname e operação apropriada; disponibilidade com réplicas precisa ser implantada | Alternativa preferida se o requisito principal for ausência de assinatura de autenticação, com capacidade operacional para manter a infraestrutura |
| Jira Service Management Free | Até três agentes, clientes sem cobrança de licença; 2 GB no Free. Segurança por item/chamado não é configurável no plano gratuito | Primeiro candidato ao piloto hospedado, condicionado à prova de isolamento e configuração do portal; não presumir que três agentes resolvam o atendimento de 300 empresas |
| Zammad autogerenciado | Sem taxa de licença para uso comercial conforme AGPLv3; API REST e organizações com opções de compartilhamento | Alternativa sem licença por agente, com infraestrutura e operação próprias. Configurar compartilhamento e vínculo de organizações de forma explícita |

Supabase Auth + Jira Free é uma hipótese de piloto para reduzir administração inicial. Keycloak + Zammad é a hipótese para reduzir assinaturas de software. A escolha de produção depende de disponibilidade, volume e capacidade operacional; licença gratuita não elimina hospedagem, backup, atualização ou suporte.

Exemplo de dimensionamento: 300 empresas com 100 usuários ativos no mês somam 30.000 MAU; com 500 ativos por empresa, somam 150.000 MAU, ultrapassando 50.000. Usar apenas Auth não exige transferir o banco de negócio da Innovation para o Supabase. O número de projetos gratuitos não permite criar um projeto independente para cada uma das 300 empresas.

## Pontos que mudam a avaliação inicial

1. A documentação do Supabase informa que tokens de acesso podem permanecer válidos após logout até a expiração. A Innovation já consulta usuário e sessão locais por requisição; a migração precisa preservar o bloqueio imediato exigido pelo produto. Não trocar esse controle por validação isolada da assinatura do JWT.
2. O SMTP padrão do Supabase é destinado a testes e não ao envio de autenticação a todos os clientes. SMTP próprio possui ainda seus próprios limites e a cota do projeto deve ser configurada. O worker Resend da Innovation e o SMTP do Supabase são caminhos diferentes; o primeiro não configura automaticamente o segundo.
3. Jira Service Management Free não permite configurar segurança por chamado. Isso não prova que o portal seja incapaz de isolar clientes, mas impede assumir equivalência com todas as regras da Innovation. Testar organizações, participantes, compartilhamento, pesquisas, comentários e anexos, inclusive diretamente no portal externo.
4. Em Zammad, organização compartilhada altera a visibilidade dos chamados. Para o primeiro ensaio, começar com `shared=false` e `domain_assignment=false`, e conceder visibilidade ampliada apenas quando a política exigir e o teste comprovar.
5. Nenhuma das quatro ferramentas elimina autorização por empresa/campo na API Innovation. Tokens, organizações ou e-mails enviados pelo navegador não concedem privilégios locais.

## Fronteira de identidade a implementar

- Provedor: login, senha, recuperação, MFA e sessão externa conforme capacidades contratadas.
- Innovation: usuário interno estável, vínculo com empresa, bloqueio, papel, hierarquia, acesso ao recurso, auditoria e licença contratada.
- Vínculo externo: chave única de emissor confiável + identificador estável do provedor, ligada ao ID interno por procedimento autorizado. Não associar contas automaticamente apenas porque o e-mail coincide.
- Validação: emissor e destinatário configurados, assinatura, validade e tipo de token; chave pública obtida do endereço confiável configurado, nunca de um endereço escolhido no token.
- Ativação por grupo de piloto, com sessão e revogação testadas. Não aceitar autenticação antiga automaticamente quando o provedor falhar para usuários já migrados.
- Preservar os IDs locais, histórico e proteção do dono da plataforma. Segredos MFA e senhas não serão exportados em relatórios ou enviados por chat; avaliar migração suportada ou recuperação/reinscrição controlada.

O `JwtAuthGuard` atual exige propósito de acesso, usuário ativo, empresa permitida, versão de senha e família de sessão válida. JWTs externos não passam a ser aceitos nesta entrega. A próxima implementação de identidade deve demonstrar esses invariantes com um projeto/realm e credenciais autorizadas.

## Fronteira de chamados a implementar

Manter o contrato do portal Innovation e usar um adaptador por fornecedor. Guardar empresa, chamado local, provedor, organização/projeto e identificador externo. Selecionar conta/organização pelo vínculo local autorizado; nunca encaminhar livremente o ID externo recebido do cliente.

Cada leitura, resposta, nota, pesquisa, anexo e webhook deve verificar o vínculo. Notas internas permanecem internas. A sincronização precisa ser durável, idempotente e auditável; expor `pendente de sincronização` enquanto o fornecedor não confirmar o resultado. Uma chave técnica com alcance amplo no fornecedor não concede alcance amplo ao cliente da Innovation.

Primeiro sincronizar chamados sintéticos e leitura de resultados; depois habilitar criação e respostas. Desligar o motor de chamados próprio apenas após exportação e reconciliação de histórico, participantes, comentários, anexos, estados e política de acesso.

## Correção já aplicada antes da troca

A revisão encontrou que o cadastro de chamados validava referências de usuário/funcionário para ADMIN e RH, mas não para CEO e CONTABIL. O serviço agora verifica também esses perfis contra a empresa do ator antes de gerar número, gravar chamado ou evento. A consulta de equipe do GESTOR também inclui empresa na decisão de leitura.

Novos testes unitários verificam recusa de referências externas, preservação das referências da própria empresa e ausência de efeitos quando há recusa. Uma suíte adicional de PostgreSQL real verifica que CEO/CONTABIL não gravam chamados de A referenciando usuário/funcionário de B. Essa correção trata a autorização local; não equivale à implementação dos conectores externos.

## Etapas de execução

| Ordem | Ação | Critério |
| --- | --- | --- |
| 1 | Concluir segurança local e testes do PR #702 | Sem regressões de autorização; CI requerido e testes de banco revisados |
| 2 | Disponibilizar um projeto Supabase ou realm Keycloak de homologação e um helpdesk de teste | URL de emissor, aplicação/callbacks, e-mail e permissões da integração configurados pelo titular; nenhum segredo no frontend ou no repositório |
| 3 | Implementar vínculo explícito e login federado para um grupo autorizado | Login, convite, MFA, recuperação, bloqueio, logout, mudança de perfil e revogação passam; falha do provedor não libera acesso |
| 4 | Implementar adaptador do helpdesk e piloto de duas empresas sintéticas | A não lê, lista, altera, pesquisa ou baixa anexos de B; nota interna não vaza; replay não duplica |
| 5 | Piloto controlado e medição | Cotas, latência, disponibilidade e retorno operacional aprovados |
| 6 | Migração por lotes | Histórico preservado; um executor oficial por domínio e grupo; plano de retorno ensaiado |

A preparação e a correção local avançam sem essas contas. A ativação externa depende de o titular disponibilizar os ambientes e autorizações, e permanece pendente. Não foram criadas contas, aceitos termos, contratados planos pagos nem alterado o login produtivo.

## Fontes oficiais

- Supabase, cotas e pausa: https://supabase.com/pricing
- Supabase, SMTP: https://supabase.com/docs/guides/auth/auth-smtp
- Supabase, produção: https://supabase.com/docs/guides/deployment/going-into-prod
- Supabase, sessões e logout: https://supabase.com/docs/guides/auth/sessions
- Keycloak, licença: https://github.com/keycloak/keycloak
- Keycloak, produção: https://www.keycloak.org/server/configuration-production
- Jira Service Management, plano: https://www.atlassian.com/collections/service/pricing
- Atlassian, segurança no Free: https://support.atlassian.com/jira-cloud-administration/docs/what-is-the-free-jira-cloud-plan/
- Zammad, licença: https://support.zammad.com/help/en-us/59-lizenz/35-gibt-es-eine-lizenzgebuhr-fur-die-nutzung-von-zammad
- Zammad, API: https://docs.zammad.org/en/latest/api/intro.html
- Zammad, organizações: https://docs.zammad.org/en/latest/api/organization.html
