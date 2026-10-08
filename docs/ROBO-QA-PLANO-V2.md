# Robô QA v2: achar o erro que ninguém imaginou

## Por que a v1 não basta

Hoje o robô só marca como defeito o que **quebra de forma visível**: erro 500, erro de JavaScript, tela de erro e vazamento de permissão por rota. Ele olha a **tela**. Os erros que mais custam num RH multiempresa são silenciosos: dado de outra pessoa na resposta da API, número errado que parece certo, "salvou" que não salvou, ponto duplicado, PDF com valor diferente da tela.

A v2 muda o princípio: o robô deixa de ser só "quem clica e vê se quebra" e passa a ser **observador + oráculo**.

| Camada | O que vê | Hoje |
| --- | --- | --- |
| Tela (DOM) | textos, botões, erros | sim |
| Rede (toda chamada à API) | corpo de cada resposta, status, tempo | só as criações (`coletor.ts`) |
| Verdade independente (oráculo) | o valor que **deveria** aparecer | só no robô de API (folha) |

Duas técnicas dão a maior parte do ganho:

1. **Canários.** Dados de teste com marcadores únicos e impossíveis de ocorrer por acaso (ex.: `CANARIO-EMPRESA-B-7f3a`). Se uma resposta recebida por quem não deveria enxergá-los contiver o marcador, é vazamento, com prova. Não depende de adivinhar o que "parece" errado.
2. **Dados determinísticos + oráculo.** Marcações de ponto, escalas e salários semeados com valores conhecidos. O resultado esperado é calculado fora do sistema e comparado com o que cada tela, API e PDF mostram.

## Onde cada coisa roda (decisão de arquitetura)

O robô embutido roda no navegador: bom para tela, rede, tempo e persistência; ruim para ler PDF, fazer concorrência real e martelar a API. Por isso:

- **Embutido (`apps/web/app/_components/robo-qa`):** observador de rede, canários na resposta, campos proibidos, persistência após recarregar, tempo, silenciosos, duplo clique, responsivo.
- **Robô de API (`tools/robo-api`, Node):** IDOR por repetição, mass assignment, concorrência, entradas hostis, sessão, PDFs/CSV, oráculo da folha, limites do plano.
- **Compartilhado:** a mesma lista de campos proibidos, os mesmos canários e os mesmos dados semeados (um arquivo só, para os dois lados não divergirem, como já é feito com as contas fixas).

## Dados semeados (estender `seed-robo-qa`)

- **Empresa B** ("ROBO-QA Empresa B") com um admin, funcionários e vagas **cheios de canários** (nome, CPF fictício válido, e-mail, salário, observações, anexos).
- Na empresa A, **dois funcionários com canários distintos**, para testar funcionário × funcionário.
- **Mês de ponto determinístico** para um funcionário: dias normais, atraso de 17 min, saída antecipada, falta, hora extra autorizada e não autorizada, DSR, atestado, folga extra, banco de horas. O esperado de cada dia fica em um arquivo de oráculo.
- Vaga com candidatos em cada etapa; férias em cada estado; empresa suspensa e empresa inadimplente (para testar bloqueios); empresa no limite de usuários e de vagas.

## Detectores

Cada detector é um módulo com `id`, `nome`, `gravidade`, `executar(ctx)` e **um defeito plantado** que ele precisa encontrar no sistema de mentira do robô (`tools/robo-qa/demo`). Detector sem defeito plantado não entra.

### Privacidade e segurança (prioridade máxima, risco LGPD)

**D1. Canário fora de lugar.** Observa toda resposta da API recebida pelo usuário logado e procura canários que não são dele (outra empresa, outro funcionário, outro perfil sem permissão). Cobre o que você achou à mão no dashboard e em férias. Evidência: URL, trecho da resposta com o marcador, quem estava logado.

**D2. Campos proibidos e dados demais.** Varre o JSON de **toda** resposta, recursivamente, atrás de `passwordHash`, `resetPasswordCode`, `mfaSecretEnc`, `previousPasswords`, tokens, `asaasCustomerId`, `internalNotes` e similares. Também marca CPF/CNPJ/salário completos em respostas de perfis que deveriam ver mascarado, e campos que a tela nunca usa (comparando o que veio com o que foi exibido). É o "API vazando".

**D3. IDOR por repetição (robô de API).** Para cada GET/PUT/PATCH/DELETE observado, repete trocando o ID por um recurso de outra empresa e de outro usuário. Esperado: 403/404 e corpo sem dados. Inclui abrir por URL direta (`/[tenant]/...`) o recurso de outro tenant.

**D4. Mass assignment.** Em criação e edição, envia campos que o cliente nunca deveria controlar (`role`, `companyId`, `isActive`, `maxUsers`, `billingStatus`) e confere que foram ignorados ou recusados.

**D5. Sessão.** Token antigo após logout deve dar 401; troca de senha derruba as outras sessões; botão Voltar após sair não mostra dado em cache; empresa suspensa e usuário bloqueado perdem acesso na hora; limite de tentativas de login; resposta de login não revela se o e-mail existe. Cabeçalhos: `Cache-Control: no-store` em rotas com dado pessoal.

### Correção dos números

**D6. Mesmo fato, várias fontes.** Define "fatos" (saldo de banco, horas trabalhadas, atraso, hora extra, férias disponíveis, total da fatura) e coleta cada um em **todos** os lugares onde aparece: dashboard, folha de ponto, API, PDF, CSV, resumo do gestor. Diverge, vira defeito, com as duas fontes lado a lado.

**D7. Oráculo da folha.** Liga o robô ao `oracle/folha-clt-2026.mjs` e ao mês determinístico acima. Confere, dia a dia, atraso/saída antecipada pela **escala do usuário**, DSR/atestado/folga extra **sem** entrar no saldo negativo, hora extra que **não** compensa atraso sem autorização, e os descontos do holerite. É exatamente a lista de regras que você me passou, transformada em teste.

**D8. Planos e cobrança.** Confere o preço calculado pelo sistema contra a tabela (Premium R$ 199,99 com 10 usuários + R$ 2 por extra; R&S R$ 99,99 com 50 vagas + R$ 2 por vaga extra; Básico R$ 99,99 + R$ 2 por usuário extra). O valor mostrado ao cliente, o enviado ao Asaas e o da fatura precisam ser iguais.

### Persistência e comportamento

**D9. Salvou, mas não salvou.** Para cada criar/editar/excluir: faz a ação, **lê de volta pela API**, recarrega a página, lê de novo e compara campo a campo com o que foi digitado. Também confere que o excluído realmente sumiu das listas e dos totais.

**D10. Idempotência e concorrência.** Duplo clique em bater ponto, criar, pagar e solicitar férias deve gerar **um** registro. Dois navegadores no mesmo ponto; reenvio depois de queda de rede; mesmo CPF/e-mail em paralelo (já existe 8 simultâneos no robô de API; trazer para as telas).

**D11. Limites e regras de negócio.** Matriz **estado da empresa × ação**: no limite de usuários, no limite de vagas, em trial, inadimplente, suspensa, sem plano. Esperado: bloqueio correto, mensagem compreensível, nada criado pela metade.

**D12. Tempo e datas.** 29/02, virada de mês e de ano, 23:59→00:01, fuso America/Sao_Paulo, feriado, domingo, escala 12x36 atravessando meia-noite. Ponto e folha costumam quebrar aqui.

### Desempenho e qualidade técnica

**D13. Orçamento de tempo.** Mede cada clique até a resposta e até a tela estável. Orçamentos: bater ponto < 1 s; abrir tela < 2 s; qualquer clique > 2 s é marcado. Também marca tela com muitas chamadas repetidas (sinal de N+1) e resposta muito grande. Reporta p50/p95 por endpoint, para ver o ponto lento por número e não por impressão.

**D14. Erros silenciosos.** Cada cenário declara os status esperados (um 403 de teste de permissão é esperado). Todo 4xx/5xx fora disso, aviso no console, recurso 404 e chamada cancelada viram achado.

**D15. Entradas hostis.** Por tipo de campo: acentos, emoji, 300 caracteres, só espaços, `<img src=x onerror=...>` com marcador para detectar execução, `=1+1` para injeção em CSV, números negativos, datas inválidas. Esperado: recusa clara ou texto exibido como texto, nunca erro 500 nem script rodando.

**D16. Documentos.** Extrai o texto do PDF/CSV e confere contra a API: o comprovante de ponto precisa ter nome, data, hora, local e IP do momento da batida; o holerite precisa fechar bruto − descontos = líquido; número e hash de verificação batendo.

**D17. Celular e acessibilidade.** Largura de 360 px sem rolagem lateral, alvos de toque de 44 px, rótulos, contraste e foco por teclado (axe-core). Tela vazia, carregando para sempre e botão que não faz nada.

**D18. Efeitos colaterais.** A ação sensível gerou registro de auditoria? E-mail/WhatsApp/notificação saiu uma vez só? O log não contém senha nem token?

## Ordem de execução

| Onda | O que entrega | Por quê primeiro |
| --- | --- | --- |
| 1 | Observador de rede no `coletor.ts` (todas as respostas), canários e Empresa B no seed, D1, D2, D9, D13, D14 | Maior risco (LGPD), reaproveita o que existe e já acha o que você pegou à mão |
| 2 | D3, D4, D5 (robô de API), D6, D7 com o mês determinístico, D8, D10 | Fecha as regras de ponto/folha/plano e a segurança de acesso |
| 3 | D11, D12, D15, D16, D17, D18 | Cobertura ampla; mais cenários e dependências |

## Relatório que vira trabalho

- Agrupado por detector e por gravidade, com **prova**: requisição e resposta com segredos mascarados, captura de tela, passo a passo para repetir.
- Campo "arquivo provável", como o robô de API já faz, para o agente de código ir direto ao ponto.
- Comparação com a rodada anterior: **novo**, **ainda aberto**, **corrigido**. Sem isso o relatório vira ruído.
- Saída pronta para colar como tarefa de agente (um bloco por defeito).

## Como saber se o robô ficou bom

- Cada detector acha o seu defeito plantado (teste do teste) e **não** acusa o sistema de mentira sem defeito.
- Falsos positivos abaixo de 10%. Todo achado novo é classificado como defeito real ou falso, e a regra é ajustada.
- Rodada completa em menos de 25 minutos, sem depender do seu usuário pessoal (contas fixas do seed).
- Nenhum segredo, token ou canário real no relatório.

## Primeiros arquivos a criar

1. `engine/rede.ts`: registra toda resposta (URL, método, status, tempo, corpo limitado e mascarado).
2. `engine/deteccoes/{canarios,camposProibidos,persistencia,tempo,silenciosos}.ts`, cada um com defeito plantado em `tools/robo-qa/demo`.
3. `apps/api/prisma/robo-qa-fixtures.cjs`: Empresa B, canários e mês determinístico (uma fonte só, lida pelo seed, pelo robô embutido e pelo robô de API).
4. `tools/robo-api/lib/idor.mjs` e `lib/sessao.mjs` para D3, D4 e D5.
5. Ligar `oracle/folha-clt-2026.mjs` ao mês determinístico para D6 e D7.

## Limites honestos

- O robô prova divergência e vazamento; **não** decide regra de negócio. Onde a regra é ambígua (ex.: hora extra antes da entrada compensa saída antecipada?), a regra escrita por você vira o oráculo, e o robô cobra exatamente isso.
- Em ambiente de teste ele cria e martela dados de verdade. Continua valendo: banco de teste, nunca o dos clientes.
- Nenhuma promessa de "zero defeitos": a cobertura é a lista acima, e o relatório mostra o que **não** foi testado.
