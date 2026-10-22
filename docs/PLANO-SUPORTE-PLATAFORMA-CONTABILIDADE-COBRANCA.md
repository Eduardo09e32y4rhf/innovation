# Plano: Suporte, Plataforma, Contabilidade e Cobrança

Plano para terminar as quatro frentes pedidas em 22/10/2026. Complementa `docs/ESCOPO-PRODUCAO-V1.md` (estas frentes correspondem aos itens M2, M3, M6 e M8 de lá e passam a ter prioridade). Baseado no código atual; números e lacunas abaixo foram medidos no repositório.

> **5 decisões suas travam o início** (seção 6). As que não estiverem respondidas seguem com a recomendação marcada.

---

## 1. Suporte (com reembolso dentro do chamado)

### Como está
- **Três telas diferentes** para o mesmo chamado: página pública `/suporte` (247 linhas), tela da empresa `dashboard/support` (633) com o assistente de abertura (192), e a fila da plataforma `platform/_hub/suporte-view.tsx` (**856 linhas num arquivo só**).
- O back-end é bom: SLA de primeira resposta e de solução, pausa de SLA, mensagens públicas e internas, anexos, eventos (linha do tempo), duplicados, 10 status e 12 categorias (incluindo `BILLING`).
- **Sem atualização em tempo real nem atualização automática**: quem está com o chamado aberto não vê a resposta chegar.
- **Reembolso não passa pelo suporte**: o pedido de devolução (`PaymentRefund`) é ligado só à fatura e só a plataforma o inicia. A empresa não tem como pedir pelo sistema.

### Como deve ficar
| Item | Entrega |
|---|---|
| S1 | **Um componente de chamado só**, usado pela empresa e pela plataforma (a plataforma vê a mais: notas internas, atribuir, SLA, mesclar duplicado). Layout responsivo: computador em duas colunas (lista à esquerda, conversa à direita); tablet com lista recolhível; celular com lista e conversa em tela cheia, botão voltar e caixa de resposta fixa no rodapé |
| S2 | **Conversa interativa**: linha do tempo única (mensagens, mudanças de status, atribuições), anexo por arrastar/colar/câmera do celular com pré-visualização, respostas prontas para a plataforma, indicador "não lido", atualização automática a cada 15 s (tempo real por WebSocket fica para depois do lançamento, porque o único gateway existente é o do WhatsApp, congelado) |
| S3 | **Status claros para o cliente** ("Recebido", "Em análise", "Aguardando você", "Resolvido") e prazo visível de resposta; avaliação (1 a 5 + comentário) ao resolver; reabrir em até 7 dias |
| S4 | **Pedido de reembolso pelo suporte**: categoria nova "Reembolso" no assistente; a empresa escolhe a fatura paga, total ou parcial (nunca acima do valor reembolsável) e o motivo. O chamado nasce ligado à fatura (relação nova `SupportTicket.invoiceId`) |
| S5 | **Aprovação dentro do chamado**: a plataforma aprova ou recusa com justificativa; ao aprovar, dispara o estorno que já existe (idempotente, com cancelamento ou ajuste da nota fiscal); a confirmação do Asaas aparece sozinha na linha do tempo ("Reembolso confirmado em …"). Acima de um valor definido por você, exige **segunda aprovação** |
| S6 | Notificação por e-mail e no sino: resposta nova, mudança de status, reembolso aprovado/confirmado |

### Critério de pronto
- 0 rolagem horizontal em 360, 768 e 1280 px; acessibilidade automatizada ≥ 90.
- E2E: abrir chamado → anexar → resposta da plataforma aparece sem recarregar → resolver → avaliar.
- E2E: pedir reembolso parcial → aprovar → estorno no sandbox do Asaas → chamado mostra "confirmado" e a nota é ajustada.
- Nenhum arquivo de tela acima de 300 linhas.

**Esforço:** ~45 h de agente. **Depende de:** chave do sandbox do Asaas (D5 do escopo) e da política de reembolso (decisão 2).

---

## 2. Plataforma (o console do DEV, CEO e equipe)

### Como está
- Um hub com **abas e sub-abas**, mais páginas soltas (`finance`, `accounting`, `visitas`, `whatsapp`, `proposals`, `contracts`), e as **faturas da plataforma num menu à parte** (Faturas: planos, assinaturas, cupons, reembolsos, ajustes fiscais, banco).
- Arquivos gigantes: suporte 856, contratos 552, configuração 474, contabilidade 405 linhas.
- **A regra de quem vê o quê está espalhada em três lugares** (`TAB_POLICY`, `platform-nav-config`, lista "specialist" no layout), o que já gerou divergências.
- "Resumo", "Inteligência" e "Alertas" se sobrepõem.

### Como deve ficar: 6 áreas, uma navegação lateral, sem aba dentro de aba
| Área | Conteúdo | Quem vê |
|---|---|---|
| **Visão geral** | Receita do mês e recorrente (MRR), inadimplência, empresas ativas e em teste, chamados abertos e vencendo, visitas do site, saúde do sistema | DEV, CEO |
| **Clientes** | Lista de empresas → ficha da empresa com abas fixas: Geral, Assinatura, Faturas, Usuários, Documentos, Suporte, Auditoria | DEV, CEO, COMERCIAL |
| **Financeiro** | Faturas, Assinaturas, Planos, Cupons, Reembolsos, Ajustes fiscais, Conciliação (traz para cá o que hoje está no menu Faturas) | DEV, CEO, CONTABIL (leitura) |
| **Contabilidade** | O escritório contábil (seção 3) | DEV, CEO, CONTABIL |
| **Suporte** | A fila (seção 1) | DEV, CEO |
| **Sistema** | Configuração, Permissões, Acessos, Auditoria, Visitas do site | DEV (CEO só leitura) |

Módulos congelados por flag (comercial, propostas, contratos, WhatsApp, IA) somem enquanto a flag estiver desligada.

| Item | Entrega |
|---|---|
| P1 | **Uma única fonte de permissão** (`platform-access.ts`) usada pelo menu, pela proteção das páginas e pelo teste da matriz perfil × rota que já compara com os `@Roles` da API |
| P2 | Casca de página padrão: título, filtros na URL, estados de carregando/vazio/erro, tabela que vira cartões no celular |
| P3 | Migrar as telas atuais para as 6 áreas, quebrando os arquivos gigantes em componentes (nenhum acima de 300 linhas) |
| P4 | Redirecionamentos permanentes das URLs antigas (já existe o padrão em `next.config.js`) |
| P5 | Visão geral com números reais da API (sem número fixo no código) |

### Critério de pronto
- 6 áreas, 1 rota por área, matriz de permissão sem divergência.
- E2E por área em 360, 768 e 1280 px, 0 rolagem horizontal.
- Nenhum link quebrado (todas as URLs antigas redirecionam).

**Esforço:** ~55 h de agente.

---

## 3. Contabilidade (o contador calcula, o RH recebe a folha pronta)

### O fluxo que você descreveu
```
Contador entra → escolhe a empresa cliente → escolhe o mês
  → vê a folha de ponto de cada funcionário (batidas, ocorrências, ajustes, banco de horas)
  → "Calcular automático"  ou  ajuste manual por funcionário (com motivo)
  → revisa (calculado × ajustado, totais da empresa)
  → "Publicar para a empresa"
RH/empresa → recebe a folha do mês com salários, descontos e encargos atualizados
  → confere (pode devolver ao contador com comentário) → libera os holerites → marca como pago
```

### Como está (o que já existe e o que falta)
| Parte do fluxo | Situação |
|---|---|
| Motor de cálculo (INSS, IRRF, FGTS, horas extras, adicional noturno, DSR, faltas, férias, 13º, rescisão) | **Existe** e tem testes |
| Fechamento de ponto com fluxo (gerar, ajustar com motivo, enviar para revisão, aprovar, fechar, reabrir) e trava do período | **Existe** |
| Rotas do contador (`/accounting`: recalcular, ajustar, fluxo do fechamento e da folha, escritório: clientes, tarefas, documentos, honorários) | **Existe** |
| **O contador ver as batidas de ponto** | **Falta**: as rotas de ponto (`time-track`) não liberam o perfil CONTABIL |
| **O contador ver só as empresas que atende** | **A conferir e reforçar**: o vínculo existe (`AccountingClient` com responsável), mas a restrição precisa ser aplicada em todas as rotas do contador |
| **Tela de trabalho do contador** | **Falta**: `dashboard/contabilidade` (64 linhas) só embrulha uma visão do hub |
| **Etapa "Publicar para a empresa" e "devolver ao contador"** | **Falta** |
| Tela do RH com a folha (Gestão > Folha) e holerites do funcionário | **Existe**; precisa mostrar o selo "conferida pelo contador em …" e o que mudou |

### Entregas
| Item | Entrega |
|---|---|
| C1 | **Acesso do contador às batidas e ocorrências, só leitura e só das empresas vinculadas a ele**, com teste de isolamento (contador de A não vê B) |
| C2 | **Painel do escritório**: lista de clientes com a situação do mês (sem fechamento, calculando, em revisão, publicada, devolvida, paga) e prazos |
| C3 | **Mês da empresa**: tabela de funcionários (horas, extras, faltas, atrasos, bruto, descontos, líquido) com filtros; botão "Calcular todos"; totais da empresa (INSS, FGTS, IRRF) |
| C4 | **Ficha do funcionário** (painel lateral): espelho de ponto do mês, cálculo detalhado item a item e ajuste manual de qualquer item com motivo obrigatório; a tela mostra lado a lado "calculado" e "ajustado"; recalcular preserva os ajustes manuais (a não ser que o contador peça para descartar) |
| C5 | **Publicar para a empresa**: trava o mês, notifica o RH, gera holerites em PDF; o RH pode **devolver com comentário** (o mês volta para o contador) ou **liberar os holerites** para os funcionários |
| C6 | **Saídas para o contador**: resumo da folha (planilha), totais de encargos do mês, holerites em lote; exportação no formato que o contador usa para o eSocial (o envio ao eSocial fica fora da v1) |
| C7 | **Validação com contador real**: os 3 meses de referência (item M2 do escopo) viram testes; diferença de R$ 0,00 |

### Critério de pronto
- E2E: contador entra → empresa X → mês → calcula → ajusta 1 funcionário → publica → RH vê os salários atualizados → devolve → contador corrige → publica → RH libera → funcionário vê o holerite.
- Contador sem vínculo com a empresa recebe 404 em todas as rotas dela.
- Ajuste manual sempre com motivo e registrado na auditoria.

**Esforço:** ~70 h de agente + validação do contador. **Depende de:** decisões 3 e 4.

---

## 4. Planos, tarifação, reembolso e a contabilidade da própria Innovation

### Como está
- **Plano** (`PlatformPlan`) completo: preço, ciclo, fidelidade, desconto, preço base + preço por usuário, unidades incluídas, limites de usuários e funcionários, módulos, plano grátis/oculto/recomendado, versão de preço. A landing **já lê os planos da API**.
- Assinaturas, cupons (reserva de uso corrigida), faturas no Asaas, inadimplência com bloqueio, conciliação, estorno total e parcial, ajustes fiscais e **razão contábil da plataforma** (`/accounting/platform-ledger`).
- **Furos**: a conversão do teste grátis em assinatura depende de propostas e contratos, que estão **congelados**; não há política de reembolso definida; as taxas do Asaas não entram no razão; nada foi testado no Asaas real.

### Entregas
| Item | Entrega |
|---|---|
| T1 | **Tabela de planos final** (decisão 1): nomes, preços, o que cada um inclui (só módulos do MVP), limites; módulos congelados saem da lista de recursos |
| T2 | **Uma única função de preço**, com testes, usada no cadastro, na troca de plano, na geração da fatura e na landing: base + excedente por usuário/funcionário, mensal ou anual com desconto, valor proporcional na troca de plano, cupom; clientes antigos mantêm a versão de preço deles |
| T3 | **Teste grátis → pagante sem propostas**: fim do teste gera a primeira fatura; e-mails 7, 3 e 1 dia antes; régua de cobrança após o vencimento; bloqueio por inadimplência (já existe) |
| T4 | **Reembolso**: política (decisão 2) aplicada na API (prazo, proporcional, limite), pedido pelo suporte (seção 1), aprovação, estorno, nota fiscal e lançamento no razão |
| T5 | **Contabilidade da Innovation**: relatório mensal para o contador da própria Innovation com receita bruta, devoluções, taxas do Asaas, impostos da nota fiscal e receita líquida; recorrência e cancelamentos; exportação em planilha; conferência com o extrato do Asaas |
| T6 | Ciclo completo no **sandbox real do Asaas**: assinar, pagar (PIX, boleto, cartão), trocar de plano, atrasar, bloquear, pagar, pedir reembolso |

### Critério de pronto
- Mesma entrada = mesmo preço em todos os pontos (teste da função única).
- Ciclo T6 verde no sandbox; divergência entre sistema e Asaas = 0 após a conciliação.
- Relatório T5 batendo com o extrato do Asaas do mês de teste.

**Esforço:** ~50 h de agente. **Depende de:** decisões 1, 2 e 5 e da chave do sandbox.

---

## 5. Ordem e prazo

Execução em ondas de **até 5 agentes** (o plano de IA bateu o limite de uso com mais que isso). Estimativa de ~220 h de agente no total, **3 semanas corridas**, mais a validação do contador em paralelo.

| Semana | O que sai | Por quê nessa ordem |
|---|---|---|
| **1** | Base comum (casca de página responsiva, tabela que vira cartão, lista + conversa) e P1 (permissão única). Suporte S1–S3. Contabilidade C1–C2 | O suporte é o que o cliente mais vê; C1 destrava o contador |
| **2** | Suporte S4–S6 (reembolso no chamado). Contabilidade C3–C5. Cobrança T2–T3 | Reembolso precisa do suporte pronto; a publicação para o RH fecha o fluxo do contador |
| **3** | Plataforma P2–P5 (migrar tudo para as 6 áreas). Contabilidade C6–C7. Cobrança T4–T6. Passada de E2E e responsivo em tudo | A reorganização da plataforma é a última porque acomoda as telas novas das outras frentes |

O que **não** acelera com IA: a sua decisão de preços e de política de reembolso, a conferência do contador (C7) e o ciclo no Asaas real (T6), que precisa da chave do sandbox.

---

## 6. Decisões suas (travam o início)

| # | Decisão | Recomendação |
|---|---|---|
| 1 | **Tabela de planos**: quantos planos, preço base, preço por usuário/funcionário, desconto anual, limites | Manda os números e eu monto; até lá sigo com os planos que já estão cadastrados |
| 2 | **Política de reembolso** | Reembolso integral até 7 dias após a contratação online (direito de arrependimento do Código de Defesa do Consumidor, art. 49; **confirmar com o jurídico** se vale para empresas clientes); depois disso, só proporcional ao período não usado e só em plano anual; segunda aprovação acima de R$ 500 |
| 3 | **Quem é o contador na v1**: (a) o escritório contábil da própria Innovation atendendo várias empresas (é o que o código já modela) ou (b) o contador externo de cada empresa, convidado pelo ADMIN dela | (a) na v1, porque já existe; (b) logo depois, usando o mesmo vínculo |
| 4 | **Depois que o contador publica**, o RH precisa conferir antes de os funcionários verem o holerite? | Sim: contador publica → RH confere e libera (ou devolve) |
| 5 | **Regime tributário da Innovation** (Simples Nacional, Lucro Presumido…) para o relatório T5 | Informar com o contador da Innovation |

---

## 7. Fora deste plano
- Envio automático ao eSocial, tempo real por WebSocket no suporte, contador externo convidado (vem logo depois, se a decisão 3 for "a").
- Os 26 defeitos conhecidos do harness de QA (8 de segurança) e o isolamento entre empresas em todas as rotas continuam no escopo principal e **devem ser corrigidos antes do beta**; a segurança roda em paralelo a este plano.
