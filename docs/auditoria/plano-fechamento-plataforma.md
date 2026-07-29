# Plano de Fechamento da Plataforma e do Core de RH

Baseline inicial da auditoria: `52d6183d`  
Baseline operacional atualmente validada no GitHub: `be3d17eb`

Este plano transforma a auditoria em execução. O objetivo nao e apenas revisar telas, mas fechar os fluxos que ainda podem gerar erro financeiro, juridico, operacional ou de experiencia.

## Leitura executiva

O sistema tem base forte, arquitetura consistente e varios modulos ja funcionalmente utilizaveis. O que impede o encerramento comercial como produto confiavel e a presenca de:

- regras duplicadas entre frontend e backend;
- calculos aproximados tratados como verdade oficial;
- documentos gerados em mais de um lugar;
- fluxos sem auditaria completa;
- botao visivel sem efeito real;
- estados que nao representam o backend;
- excesso de responsabilidade na pagina errada.

## O que ja esta bom

- Frontend e backend separados.
- NestJS, Next.js, Prisma, PostgreSQL e Redis.
- Isolamento por empresa em varios fluxos.
- Dashboard por perfil.
- Portal de carreiras e funil de candidatos.
- Escala com vigencia.
- Calculo de ponto centralizado no backend em varias trilhas.
- Integracao com Asaas.
- Auditoria parcial ja existente.
- Suites de testes previstas no projeto.

## Bloqueadores P0 confirmados pela auditoria

### 1. Folha 2026 com tabela antiga do INSS

O sistema identifica a regra como `CLT_2026_1`, mas ainda usa faixas antigas no calculo.

**Precisamos fechar:**

- tabelas tributarias versionadas no banco;
- selecao por competencia;
- snapshot da folha com a versao da tabela usada;
- testes oficiais por faixa;
- bloqueio de fechamento quando a tabela da competencia nao existir.

### 2. Risco de desconto duplicado em ponto e folha

A logica de `absenceMinutes` pode se sobrepor a atraso e saida antecipada.

**Precisamos fechar:**

- separar minutos de ausencia total, atraso, saida antecipada e intervalo indevido;
- impedir que o mesmo minuto apareca duas vezes no desconto;
- validar o fechamento da folha com base em campos mutuamente exclusivos.

### 3. Batidas ainda sem trilha suficiente de causa

O sistema tenta classificar atrasos e saidas, mas a explicacao ainda nao e confiavel para o usuario final.

**Precisamos fechar:**

- preservar o tipo original da batida;
- registrar previsto x real;
- expor a razao da classificacao;
- eliminar dependencias de ordenacao que mudem o sentido da batida.

### 4. Atestado de horas tratado como evento de dia inteiro

**Precisamos fechar:**

- modelar certificado por hora, dia ou periodo;
- abonar apenas o intervalo coberto;
- manter atrasos ou saidas fora da janela coberta;
- guardar documento, emissor, protocolo e status.

### 5. Ferias juridicamente inconsistentes

O modulo precisa deixar de tratar ano civil como unico modelo.

**Precisamos fechar:**

- ledger de ferias por periodo aquisitivo e concessivo;
- saldo versionado;
- fracionamento correto;
- abono pecuniario;
- pagamento e recibo com trilha;
- regra baseada na admissao, nao apenas no ano calendario.

### 6. PDFs oficiais ainda dependem do navegador

**Precisamos fechar:**

- geração backend-only;
- snapshot imutavel;
- hash SHA-256;
- metadados de emissao;
- codigo de verificacao;
- reemissao controlada.

### 7. Candidatura e candidato com integridade fragil

**Precisamos fechar:**

- separar pessoa (`Candidate`) da candidatura (`Application`);
- persistir consentimento;
- evitar mutacao retroativa de dados da candidatura anterior;
- impedir payload vazio em criacao de contratacao;
- manter origem, score, historico e decisao por candidatura.

## Backlog por prioridade

### P0

- Corrigir tabela tributaria da folha.
- Eliminar descontos duplicados entre ponto e folha.
- Fechar atestado de horas com modelo correto.
- Reescrever a logica de ferias em ledger.
- Mover PDFs oficiais para o backend.
- Garantir integridade de candidaturas e contratacao.
- Validar rebuild, migracao e deploy.

### P1

- Padronizar estados e mensagens.
- Reduzir redundancia visual.
- Melhorar performance das telas grandes.
- Consolidar permissao e auditaria por modulo.
- Fechar o mobile sem overflow nem layout quebrado.

### P2

- Refino de microcopy.
- Melhoria de hierarquia visual.
- Acabamento de cards, menus e drawers.
- Experiencia mais consistente entre modulos.

## Ordem de fechamento recomendada

### Fase 0 - Congelar e inventariar

Objetivo: impedir que a equipe avance sem saber o que ainda esta errado.

**Entregas:**

- mapa de botoes e acoes por pagina;
- lista do que funciona, funciona parcialmente e nao existe;
- inventario de endpoints por modulo;
- matriz de risco por pagina e por perfil;
- baseline de build e deploy.

**Sai desta fase quando:**

- toda pagina critica tiver inventario;
- todo botao relevante tiver estado e destino;
- nenhuma regra central estiver apenas no frontend;
- o baseline estiver registrado.

### Fase 1 - Ponto e pre-folha

Este e o bloco de maior risco financeiro e trabalhista.

**Entregas:**

- tabelas tributarias versionadas;
- classificacao de ocorrencias com tipo preservado;
- modelo de ausencia sem sobreposicao;
- banco de horas idempotente;
- explicacao previsivel de cada calculo;
- testes de atraso, saida antecipada, intervalo e horas extras.

**Sai desta fase quando:**

- o ponto fecha sem duplicar minutos;
- a folha usa a mesma regra do backend;
- o usuario entende por que cada desconto aconteceu;
- a competencia 2026 nao usa tabela antiga.

### Fase 2 - Escala

**Entregas:**

- vigencia sem sobreposicao;
- impacto de alteracao retroativa;
- bloqueio de conflito entre escalas;
- cobertura minima por setor;
- troca de escala com historico.

**Sai desta fase quando:**

- uma escala nao sobrescreve outra silenciosamente;
- o fechamento nao muda documento ja emitido;
- conflitos aparecem antes de salvar.

### Fase 3 - Ferias

**Entregas:**

- ledger de ferias;
- saldo por periodo;
- fracionamento real;
- abono e pagamento com prazo correto;
- recibo backend-only;
- auditaria de aprovacao e alteracao.

**Sai desta fase quando:**

- o funcionario tiver saldo claro por competencia;
- o RH enxergar direito, uso, venda e saldo;
- o fluxo nao dependa de ano civil simplificado.

### Fase 4 - Funcionarios, ASO e dossiê

**Entregas:**

- pagina 360 do funcionario;
- historico de acesso, jornada, escala, ponto e ferias;
- ASO como dossie individual;
- exclusao segura com arquivamento/anonimizacao quando necessario;
- mascaramento de dados sensiveis;
- auditoria de alteracoes cadastrais.

**Sai desta fase quando:**

- o funcionario nao for tratado como registro descartavel;
- o dossie for consultavel sem recalculo indevido;
- dados sensiveis estiverem protegidos.

### Fase 5 - Vagas, candidatos e admissao

**Entregas:**

- `Candidate` separado de `Application`;
- consentimento persistido;
- score e historico por candidatura;
- integridade de anexo e origem;
- contratacao com payload valido;
- processo seletivo com funil confiavel.

**Sai desta fase quando:**

- uma candidatura nao alterar retroativamente outra;
- a admissao nao puder ser criada sem dados obrigatorios;
- o fluxo estiver coerente do portal ate o cadastro interno.

### Fase 6 - Plataforma, planos, contratos e pagamentos

**Entregas:**

- Financeiro com extrato backend-only;
- contratos com resumo, filtros e detalhe operacional;
- configuracao simplificada como hub administrativo;
- reembolso, cancelamento e sincronizacao com trilha;
- contrato, cobranca e assinatura representando o mesmo estado.

**Sai desta fase quando:**

- o financeiro mostrar dados reais, nao aproximados;
- contrato ativo nao for alterado silenciosamente;
- configuracao nao repetir outros blocos;
- a VPS reproduzir exatamente a base do GitHub.

### Fase 7 - Dashboard, gestao, usuarios e suporte

**Entregas:**

- dashboard com agregacoes reais no backend;
- usuarios com edicao funcional e permissao aplicada;
- gestao com notificacao confiavel;
- suporte com processo completo;
- eliminacao de telas que apenas repetem informacao.

**Sai desta fase quando:**

- nao houver barra de rolagem desnecessaria;
- a acao do usuario realmente produzir estado;
- mensagens de erro e sucesso forem objetivas.

### Fase 8 - PDFs, QA e producao

**Entregas:**

- padronizacao dos documentos oficiais;
- hash e metadados de emissao;
- regressao visual dos PDFs;
- testes desktop e mobile;
- teste de perfil e permissao;
- teste de falha de integracao e retry;
- backup e rollback testados.

**Sai desta fase quando:**

- nenhum PDF critico depender do navegador;
- cada documento tiver origem, versao e auditoria;
- o deploy final reproduzir a mesma base validada.

## Plano de execucao por ordem pratica

1. Fechar Ponto e pre-folha.
2. Fechar Escala.
3. Fechar Ferias.
4. Fechar Funcionarios e ASO.
5. Fechar Vagas e Admissao.
6. Fechar Plataforma, Planos, Contratos e Pagamentos.
7. Fechar Dashboard, Gestao, Usuarios e Suporte.
8. Fechar PDFs, QA e deploy de producao.

## Checklist de validacao por modulo

### Ponto

- [ ] tipos de batida preservados;
- [ ] atraso e saida antecipada nao duplicam desconto;
- [ ] atestado de horas preserva intervalo coberto;
- [ ] banco de horas nao credita duas vezes;
- [ ] fechamento usa a mesma regra do backend.

### Escala

- [ ] vigencia nao sobrepoe;
- [ ] alteracao retroativa mostra impacto;
- [ ] documento fechado nao muda sozinho;
- [ ] conflito de escala aparece antes de salvar.

### Ferias

- [ ] ledger por periodo existe;
- [ ] saldo, uso e venda estao claros;
- [ ] fracionamento esta correto;
- [ ] pagamento e recibo seguem prazo;
- [ ] auditoria registra aprovacao e alteracao.

### Funcionarios

- [ ] pagina 360 existe;
- [ ] exclusao definitiva foi evitada quando ha historico;
- [ ] ASO esta no dossie;
- [ ] dados sensiveis estao mascarados.

### Vagas

- [ ] `Candidate` e `Application` estao separados;
- [ ] consentimento foi persistido;
- [ ] candidatura nao altera historico passado;
- [ ] contratacao nao aceita payload vazio.

### Plataforma

- [ ] Financeiro mostra dados reais;
- [ ] Contratos tem detalhe e estado operacional;
- [ ] Configuracao nao repete outras areas;
- [ ] reembolso, cancelamento e sincronizacao tem trilha.

### Deploy

- [ ] build green;
- [ ] migracoes green;
- [ ] commit na `main`;
- [ ] VPS puxando exatamente a mesma base.

## Definition of Done

A auditoria so pode ser considerada fechada quando:

- nenhum bloco P0 estiver pendente;
- ponto e pre-folha nao duplicarem calculo;
- ferias forem calculadas por ledger real;
- PDFs oficiais forem backend-only;
- candidaturas nao perderem integridade;
- contratos e cobrancas representarem o mesmo estado;
- configuracao nao reproduzir duplicidade de responsabilidade;
- dashboard e suporte nao exibirem botoes decorativos;
- o deploy na VPS reproduzir a mesma versao validada no GitHub.
