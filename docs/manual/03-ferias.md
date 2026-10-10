# Aba FÉRIAS — botão por botão

**Para que serve:** pedir, acompanhar e aprovar férias, respeitando o **período aquisitivo** (os 12 meses que dão direito) e o **prazo concessivo** (até quando a empresa precisa conceder).

## Quem vê a aba
Desenvolvedor, Administrador, RH, Gestor, Funcionário e Consulta (se o módulo Férias estiver ativo no plano). CEO, Contábil, Comercial e RH - R&S não veem.

| Perfil | O que consegue |
|---|---|
| **Administrador, RH, Desenvolvedor** | Veem os pedidos da empresa toda, **aprovam/rejeitam** (um a um ou em lote), pedem férias para qualquer funcionário, baixam o recibo e usam a aba **Avisos**. |
| **Gestor** | Vê os pedidos do seu escopo e **solicita férias** (para si e para a equipe). **Não aprova** — a aprovação é do RH/Administrador. |
| **Funcionário** | Vê só os próprios pedidos ("Acompanhe suas solicitações e períodos de descanso."). Pelo padrão do sistema, **não tem o botão de nova solicitação**, a menos que o Administrador conceda a permissão "Solicitar férias para si" em Usuários → Permissões. |
| **Consulta** | Só olha, não pede nem aprova. |

---

## 1. Topo da página
| Botão | Para que serve |
|---|---|
| **Atualizar** | Recarrega a lista (ela também se atualiza sozinha a cada 30 segundos). |
| **Nova solicitação** | Abre o formulário de pedido de férias (seção 5). Só aparece para quem pode pedir. |

## 2. Quatro quadradinhos de números
**Pendentes · Aprovadas · Concluídas · Recusadas** — contam os pedidos considerando os filtros que você aplicou. Não são botões.

## 3. Filtros
- **Buscar por funcionário ou período** (nome ou período aquisitivo, ex.: 2025/2026).
- **Funcionário** (lista) — escolhe uma pessoa (não aparece para o Funcionário, que só vê o dele).
- **Mês do descanso** — mostra só pedidos cujo descanso passa por aquele mês.
- **Limpar filtros** — aparece quando há algum filtro.

## 4. Abas de visão e lista
Botões com o contador entre parênteses:
| Aba | O que mostra |
|---|---|
| **Ativas (n)** | Pedidos **pendentes** (aguardando decisão). |
| **Recusadas (n)** | Pedidos recusados. |
| **Histórico (n)** | Pedidos **aprovados, concluídos e cancelados**. |
| **Avisos (n)** | *(só RH/Administrador/Dev)* ciclos com **prazo concessivo em 90 dias ou menos** e saldo sobrando: mostra nome, admissão, período aquisitivo, prazo concessivo e **saldo disponível em dias**. Botão **Solicitar para este funcionário** já abre o pedido para ele. Aviso na tela: a lista usa só os ciclos já registrados — não prova que não haja pendências para quem não tem ciclo registrado. |

**Colunas da lista:** Funcionário, Período aquisitivo, Descanso (datas), Dias / abono (dias de descanso e dias "vendidos"), Status, Observação, Ações.

**Botões em cada linha:**
| Botão | O que faz | Quando aparece |
|---|---|---|
| **Aprovar** | Abre confirmação "Aprovar férias" e, ao confirmar, aprova. | pedido pendente, para RH/Admin/Dev |
| **Rejeitar** | Abre confirmação "Rejeitar solicitação" e recusa. | pedido pendente, para RH/Admin/Dev |
| **Recibo oficial** | Baixa o **recibo de férias em PDF** (mostra "Emitindo…" enquanto gera). | pedido aprovado ou concluído |
| Caixa de seleção | Marca o pedido para ação em lote. | RH/Admin/Dev na aba Ativas |

**Ação em lote (aba Ativas):** caixa **"Selecionar todas as N pendentes visíveis"** e botão **"Aprovar selecionadas (N)"**. Depois aparece o quadro **"X de Y decisões salvas"** dizendo, por pessoa, o que deu certo e o que falhou.

## 5. Janela "Nova solicitação de férias"
"Escolha o funcionário, o período e as datas. Campos com * são obrigatórios."
- **Funcionário \*** — escolha a pessoa (se for você pedindo para si, aparece "Solicitação em seu nome").
- Faixa informativa: **"Tempo mínimo de admissão cumprido"** ou aviso de que o funcionário ainda não completou o período exigido, com a data de admissão.
- **Início \*** e **Fim \*** — as datas do descanso. Precisam somar **de 5 a 30 dias**.
- **Período aquisitivo \*** — formato AAAA/AAAA; o sistema preenche sozinho conforme a data de admissão e o início.
- Quadro de contagem: "**N dias de descanso** (+ 10 dias de abono)", **saldo disponível** do ciclo, dias já usados, vendidos e reservados, e **prazo concessivo**. Se não conseguir consultar, aparece **Consultar saldo novamente**.
- **Solicitar abono pecuniário de 10 dias** — caixa para "vender" 10 dias de férias (recebê-los em dinheiro). Só vale se o direito do ciclo permitir (até 1/3).
- **Observação (opcional)**.
- O sistema bloqueia e avisa quando: o período é menor que 5 ou maior que 30 dias, **já existe outro pedido pendente/aprovado** no mesmo intervalo, ou **descanso + abono passam do saldo**.
- Botões: **Cancelar** (se já preencheu algo, pergunta "Descartar solicitação?") e **Solicitar férias** (só liga quando tudo está válido).

Depois de enviado, o pedido fica **Pendente** até o RH/Administrador decidir. Aprovadas, as férias entram na escala da pessoa (ela não é escalada nesses dias).
