# Plano de Fechamento da Plataforma

Baseline atual validado: `52d6183d`

Este plano adapta o fechamento ao estado atual do codigo. O objetivo e transformar a aba Plataforma em um console simples, confiavel e auditavel.

## Fase 1 - Congelar e estabilizar

1. Fixar o baseline atual.
2. Evitar novas telas enquanto existirem fluxos quebrados.
3. Validar que builds e migrações seguem verdes.
4. Registrar o inventario funcional da Plataforma.

Entregavel:
- backlog consolidado;
- mapa de botoes e acoes;
- matriz de risco por pagina.

## Fase 2 - Fechar Financeiro

Prioridade:
1. valor faturado, recebido, aberto e em atraso;
2. criacao, edicao, cancelamento e sincronizacao de faturas;
3. reembolso e estorno;
4. conciliacao com Asaas;
5. PDF de extrato backend-only;
6. auditoria e historico.

Critério de saida:
- nenhum numero critico pode ser aproximado;
- todo PDF precisa vir do backend;
- cada acao sensivel precisa deixar trilha.

## Fase 3 - Fechar Contratos

Prioridade:
1. rascunho e revisao;
2. ativacao e vinculo financeiro;
3. PDF contratual;
4. aditivos e revisoes;
5. encerramento e renovacao;
6. historico e auditoria.

Critério de saida:
- contrato ativo nao pode ser alterado silenciosamente;
- revisao deve gerar nova versao;
- acao de linha precisa ser real.

## Fase 4 - Fechar Configuracao

Prioridade:
1. separar configuracoes de negocio, permissao e integracao;
2. salvar perfis e acessos de fato;
3. testar conexoes externas;
4. esconder segredos;
5. auditar antes/depois.

Critério de saida:
- nenhuma configuracao sensivel pode ficar solta em tela unica;
- a alteracao precisa refletir no backend;
- o usuario precisa entender o impacto antes de salvar.

## Fase 5 - Organizar a experiencia da plataforma

1. reduzir redundancia visual.
2. agrupar a navegacao em tres blocos:
   - Financeiro
   - Contratos
   - Configuracao
3. remover botoes decorativos.
4. padronizar nomes, estados e feedback.
5. tornar as mensagens mais objetivas.

## Fase 6 - Fechar o que depende da plataforma

Somente depois dos tres blocos principais:
- dashboard da plataforma;
- usuarios e permissoes;
- suporte interno;
- notificacoes de gestao;
- portal de vagas;
- portal de carreiras;
- PDFs e documentos finais.

## Fase 7 - QA final

Validar:
- desktop e mobile;
- DEV, ADMIN, RH, GESTOR e COMERCIAL;
- bloqueio e permissao negada;
- falha de Asaas;
- timeout de integracao;
- reprocessamento;
- rebuild e deploy na VPS;
- pagina sem overflow e sem botao falso.

## Definition of Done

A Plataforma so esta fechada quando:
- a navegacao ficou simples;
- cada bloco entrega fluxo completo;
- cada acao altera estado real;
- cada dado importante vem do backend;
- cada mudanca sensivel gera auditoria;
- nada critico depende de estimativa local;
- a experiencia no celular nao quebra.

