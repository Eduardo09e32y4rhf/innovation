# Plano de Fechamento do Core de RH

Este plano cobre as paginas e fluxos que ainda impedem o produto de ser considerado fechado com confianca operacional, financeira e juridica.

## Escopo

- Ponto e pre-folha
- Escala
- Ferias
- Funcionarios e ASO
- Vagas e Admissao
- Plataforma
- Dashboard, Gestao, Usuarios e Suporte
- PDFs, QA e producao

## Objetivo

Fechar os fluxos reais do sistema, removendo:

- regra duplicada entre frontend e backend;
- calculo aproximado tratado como oficial;
- PDF gerado no navegador para documento critico;
- botao sem efeito real;
- estado visual que nao representa o backend;
- redundancia de navegacao e responsabilidade.

## Status atual do escopo

### Fechado ou validado em grande parte

- [x] 30/07/2026 - Ponto e pre-folha: INSS 2026 atualizado, ausencia sem duplicidade entre atraso/saida antecipada e atestado por hora no fluxo de ponto.
- [x] 30/07/2026 - Escala: bloqueio de vigencia sobreposta antes de salvar nova atribuicao.
- [x] 30/07/2026 - Ferias: ciclo aquisitivo calculado por admissao, entitlement por faltas e front sem regra falsa de "11o mes obrigatorio".
- [x] 30/07/2026 - Dashboard, Gestao, Usuarios e Suporte: simplificacao visual, suporte com autor/status/historico, usuarios com persistencia de permissao e ajuste de overflow.

### Fechamento executado em 30/07/2026

- [x] 30/07/2026 - Funcionarios e ASO: exclusao segura com arquivamento quando houver historico, dossie 360 com ASO/ferias/ponto e mascaramento de dados sensiveis.
- [x] 30/07/2026 - Vagas e Admissao: candidatura com consentimento persistido, curriculo/versionamento por Application, bloqueio de contratacao incompleta e isolamento para nao sobrescrever dados criticos de outra candidatura.
- [x] 30/07/2026 - Plataforma: raiz convertida em hub unico, extrato financeiro servido pelo backend, contratos com download por endpoint e configuracao separada como centro administrativo.
- [x] 30/07/2026 - PDFs e QA local: documentos oficiais migrados para o backend, fronteira automatica sem consumidores de `printPdf`, builds de API/Web aprovados, typecheck Web aprovado, 245 testes unitarios, 38 de contrato e 35 de seguranca aprovados.
- [x] 30/07/2026 - Revisao automatizada ponta a ponta: regras integradas cobertas por testes deterministas, Prisma validado e client regenerado, candidatura publica validada no Chromium.

### Fechamento operacional ainda pendente

- [x] 31/07/2026 - Publicar as alteracoes locais em `main` (commit `8bdcd47a` enviado para `origin/main`).
- [ ] 30/07/2026 - Aplicar as duas migrations na VPS e executar o deploy.
- [ ] 30/07/2026 - Executar smoke manual de login, candidatura, PDFs e fluxos principais na VPS.
- [ ] 30/07/2026 - Validar backup e rollback antes de declarar producao fechada.

## Ordem de execucao

1. Ponto e pre-folha
2. Escala
3. Ferias
4. Funcionarios e ASO
5. Vagas e Admissao
6. Plataforma
7. Dashboard, Gestao, Usuarios e Suporte
8. PDFs, QA e producao

## P0 - Fechamento obrigatorio

### 1) Ponto e pre-folha

#### Problemas a fechar

- tabela tributaria 2026 antiga;
- risco de desconto duplicado entre ausencia, atraso e saida antecipada;
- atestado de horas modelado como dia inteiro;
- banco de horas sem trilha idempotente suficiente;
- explicacao do calculo ainda fraca para o usuario final.

#### Entregas

- tabela tributaria versionada por competencia;
- batida com tipo preservado;
- modelo de ausencia sem sobreposicao;
- atestado por hora, periodo ou dia;
- snapshot da folha com versao da regra usada;
- testes de atraso, saida antecipada, intervalo e horas extras.

#### Pronto quando

- a folha fecha sem duplicar minuto;
- o usuario entende a origem de cada desconto;
- a competencia usa a tabela correta;
- o fechamento nao depende de ajuste manual posterior.

### 2) Escala

#### Problemas a fechar

- vigencia com risco de sobreposicao;
- alteracao retroativa sem impacto claro;
- possibilidade de mudar documento ja fechado;
- falta de bloqueio de conflito entre escalas.

#### Entregas

- vigencia com validacao de conflito;
- impacto calculado antes de salvar;
- registro de alteracao e aprovacao;
- cobertura minima por setor;
- historico de trocas e excecoes.

#### Pronto quando

- uma escala nao sobrescreve outra silenciosamente;
- documento fechado nao muda sozinho;
- o conflito aparece antes do commit da alteracao.

### 3) Ferias

#### Problemas a fechar

- logica baseada em ano civil simplificado;
- fracionamento e abono sem regra robusta;
- risco de prazo errado para pagamento;
- ausencia de ledger por periodo aquisitivo.

#### Entregas

- ledger com periodo aquisitivo e concessivo;
- saldo, uso, venda e fracionamento;
- abono pecuniario;
- pagamento e recibo com prazo correto;
- auditaria completa da aprovacao.

#### Pronto quando

- saldo e direito aparecem por competencia real;
- o RH consegue ver uso e saldo sem ambiguidade;
- o fluxo nao depende de um ano calendario fixo.

### 4) Funcionarios e ASO

#### Problemas a fechar

- exclusao definitiva perigosa;
- ASO sem dossie individual;
- pagina extensa sem estrutura 360;
- dados sensiveis sem mascaramento suficiente.

#### Entregas

- pagina 360 do funcionario;
- dossie de ASO;
- historico de jornada, escala, ponto e ferias;
- arquivamento/anonimizacao em vez de exclusao bruta quando houver historico;
- auditaria de alteracoes cadastrais.

#### Pronto quando

- o funcionario nao for tratado como registro descartavel;
- ASO estiver dentro do dossie;
- a pagina estiver consultavel e objetiva.

### 5) Vagas e Admissao

#### Problemas a fechar

- candidato misturado com candidatura;
- consentimento nao persistido corretamente;
- score e historico sem isolamento por candidatura;
- contratacao com payload vazio;
- origem e documentos sem integridade suficiente.

#### Entregas

- `Candidate` separado de `Application`;
- consentimento persistido;
- historico e score por candidatura;
- admissao com validacao forte;
- funil e decisao por etapa.

#### Pronto quando

- uma candidatura nao altera outra;
- a admissao nao aceita payload incompleto;
- o processo seletivo fica rastreavel do inicio ao fim.

### 6) Plataforma

#### Problemas a fechar

- financeiro ainda com leitura aproximada em alguns pontos;
- contratos sem ciclo de vida plenamente didatico;
- configuracao repetindo responsabilidade de outras abas;
- integracao, contrato e cobranca sem representacao unica do estado.

#### Entregas

- financeiro com extrato backend-only;
- contratos com resumo, filtros e detalhe operacional;
- configuracao simplificada como hub administrativo;
- reembolso, cancelamento e sincronizacao com trilha;
- contrato e cobranca representando o mesmo estado.

#### Pronto quando

- o financeiro mostra dado real;
- contrato ativo nao e alterado silenciosamente;
- configuracao nao repete o que ja existe em financeiro e contratos.

### 7) Dashboard, Gestao, Usuarios e Suporte

#### Problemas a fechar

- dashboard calculando demais no cliente;
- usuarios com edicao/permissao ainda fragil;
- gestao e suporte com informacao dispersa;
- redundancia visual e muitos botoes sem efeito claro.

#### Entregas

- dashboard com agregacao no backend;
- usuarios com edicao funcional e permissao aplicada de fato;
- gestao com notificacao confiavel;
- suporte com processo completo;
- reducao de telas duplicadas.

#### Pronto quando

- nao houver barra de rolagem desnecessaria;
- o botao gerar estado real;
- as mensagens forem claras e acionaveis.

### 8) PDFs, QA e producao

#### Problemas a fechar

- documento oficial dependendo do navegador;
- falta de metadados e hash em documentos criticos;
- ausencia de rotina clara de validacao final;
- deploy sem checklist operacional completo.

#### Entregas

- PDF backend-only para documentos oficiais;
- hash SHA-256 e metadados de emissao;
- QA visual por pagina;
- teste de permissao por perfil;
- teste de falha de integracao e retry;
- backup e rollback testados;
- deploy reproduzindo o mesmo estado do GitHub.

#### Pronto quando

- nenhum documento critico depender do navegador;
- cada PDF tiver origem e versao;
- a VPS subir exatamente a versao validada.

## P1 - Estabilidade e experiencia

- mensagens de erro e vazio mais claras;
- padronizacao de titulos e status;
- remover botoes decorativos;
- layout mobile sem overflow;
- feedback melhor em operacoes lentas;
- reduzir redundancia entre telas.

## P2 - Acabamento

- microcopy;
- hierarquia visual;
- consistencia de cores e tons;
- ajustes finos de cards, menus e drawers;
- refinamento sem criar duplicacao.

## Checklist final de saida

- [ ] Nao existe regra critica duplicada sem controle de versao
- [x] Nenhum PDF critico depende do navegador
- [ ] Nenhuma pagina critica tem botao sem efeito
- [ ] Cada acao sensivel gera auditoria
- [ ] O fechamento nao depende de aproximacao local
- [ ] O mobile nao quebra a experiencia
- [ ] O deploy da VPS reproduz o mesmo estado do GitHub
