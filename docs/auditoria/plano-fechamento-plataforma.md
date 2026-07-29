# Plano de Fechamento da Plataforma

Baseline inicial da auditoria: `52d6183d`  
Baseline operacional mais recente validado: `256d47eb`

Este plano acompanha o estado real do codigo e nao apenas a intencao documental. O objetivo e transformar a aba **Plataforma** em um console simples, confiavel e auditavel, sem botões decorativos ou indicadores aproximados.

## Status atual

| Bloco | Estado |
| --- | --- |
| Financeiro | Em andamento, com primeira tranche entregue |
| Contratos | Pendente de fechamento funcional |
| Configuracao | Pendente de fechamento funcional |
| Experiencia da plataforma | Parcialmente simplificada |

## O que ja foi entregue

- Reset de senha de usuarios corrigido e validado.
- Financeiro da Plataforma ganhou:
  - histórico recente de auditoria;
  - painel lateral de detalhes por fatura;
  - ação de ver detalhes na tabela;
  - contexto operacional mais claro antes de editar, cancelar ou sincronizar.
- Builds de API e frontend passaram na base atual.

## Fase 1 - Congelar e estabilizar

1. Fixar a base atual como referencia de trabalho.
2. Evitar novas telas antes de fechar os fluxos quebrados.
3. Validar que builds, migrações e deploy seguem verdes.
4. Manter o inventario funcional da Plataforma atualizado.

### Entregaveis

- backlog consolidado;
- mapa de botoes e acoes;
- matriz de risco por pagina;
- lista de lacunas por API e por tela.

## Fase 2 - Fechar Financeiro

### Escopo

1. Valor faturado, recebido, aberto e em atraso.
2. Criacao, edicao, cancelamento e sincronizacao de faturas.
3. Reembolso e estorno.
4. Conciliacao com Asaas.
5. PDF de extrato backend-only.
6. Auditoria e historico operacional.

### O que ja existe

- resumo financeiro funcional;
- listagem com filtros;
- webhook events;
- retry de webhook;
- detalhe por fatura;
- auditoria recente.

### O que ainda falta fechar

- remover qualquer leitura aproximada como verdade oficial;
- ligar PDF de extrato a snapshot imutavel e rastreavel;
- deixar claro o fluxo de reembolso e cancelamento;
- fechar a conciliacao como visao operacional e nao apenas tabela;
- padronizar estados de erro, parcial e sincronizado.

### Criterio de saida

- nenhum numero critico pode ser aproximado sem identificacao;
- todo PDF precisa vir do backend;
- cada acao sensivel precisa deixar trilha;
- a operacao precisa ser reproduzivel na VPS e no GitHub.

## Fase 3 - Fechar Contratos

### Escopo

1. Rascunho e revisao.
2. Ativacao e vinculo financeiro.
3. PDF contratual.
4. Aditivos e revisoes.
5. Encerramento e renovacao.
6. Historico e auditoria.

### O que ainda falta fechar

- tornar a tela um fluxo de contrato mais claro;
- separar visualmente rascunho, ativo, encerrado e cancelado;
- impedir edicao silenciosa de contrato ativo;
- deixar as acoes de linha mais explicitas;
- ligar contrato e cobranca de forma mais didatica para operacao.

### Criterio de saida

- contrato ativo nao pode ser alterado silenciosamente;
- revisao deve gerar nova versao;
- a acao de linha precisa ser real;
- PDF e vigencia precisam refletir o mesmo estado.

## Fase 4 - Fechar Configuracao

### Escopo

1. Separar configuracoes de negocio, permissao e integracao.
2. Salvar perfis e acessos de fato.
3. Testar conexoes externas.
4. Esconder segredos.
5. Auditar antes/depois.

### O que ainda falta fechar

- tornar a pagina menos redundante;
- separar o que e financeiro do que e configuracao;
- tornar permissao global mais clara para o usuario;
- deixar mais legivel o impacto das alteracoes;
- manter integracoes e segredos fora de telas desnecessarias.

### Criterio de saida

- nenhuma configuracao sensivel pode ficar solta em tela unica;
- a alteracao precisa refletir no backend;
- o usuario precisa entender o impacto antes de salvar;
- auditoria precisa mostrar antes e depois.

## Fase 5 - Organizar a experiencia da Plataforma

1. Reduzir redundancia visual.
2. Agrupar a navegacao em tres blocos:
   - Financeiro
   - Contratos
   - Configuracao
3. Remover botoes decorativos.
4. Padronizar nomes, estados e feedback.
5. Tornar mensagens mais objetivas.

## Fase 6 - Fechar o que depende da Plataforma

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
- a experiencia no celular nao quebra;
- a publicacao na VPS reproduz o mesmo estado do GitHub.
