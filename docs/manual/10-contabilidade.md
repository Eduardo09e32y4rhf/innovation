# Aba CONTABILIDADE — botão por botão

**Para que serve:** "Regras de cálculo, conferência de fechamentos e aprovação da folha. Ao aprovar, a folha do funcionário já fica correta." É a mesa de trabalho do **contador**: confere o que o RH fechou (ponto e folha) de **todas as empresas**, corrige se preciso, **aprova ou devolve ao RH**, vê quanto há de INSS, IRRF e FGTS a recolher e mantém as **tabelas de cálculo** (INSS, IRRF…).

## Quem vê a aba
Só **Desenvolvedor, CEO e Contábil** (fica no grupo "Operação global" do menu). Qualquer outro perfil que tente abrir vê: "Acesso restrito — Seu perfil não tem acesso à Contabilidade" e o botão **Voltar ao Dashboard**.

| Perfil | O que faz |
|---|---|
| **Contábil** | Faz o trabalho completo: confere, corrige proventos, aprova, devolve ao RH, recalcula, baixa relatórios, mantém as regras. |
| **Desenvolvedor, CEO** | Mesmos poderes (a tela é a mesma e está liberada para edição). |
| Administrador, RH | Não veem esta aba. O RH fecha o ponto em **Escalas → Fechamento** e gera a folha em **Gestão → Folha de pagamento**; quando a Contabilidade **devolve**, o RH recebe e precisa reabrir/corrigir lá. |

---

## 1. Cabeçalho
- Título mostra a empresa escolhida (ou apenas "Contabilidade").
- **Escolher empresa** (seletor) – filtra a tela para uma empresa só. Sem escolher, você vê o **resumo de todas as empresas**.
- **Todas** (botão com X) – limpa a escolha e volta ao resumo geral.

## 2. Duas abas: "Competência" e "Regras e simulador"

### Aba "Competência" (o mês de trabalho)
- **‹ mês ›** – troca o mês (a "competência").
- **Relatório PDF** – gera o relatório contábil do mês (da empresa escolhida ou geral).

#### Visão geral (nenhuma empresa escolhida)
- Faixa: "**N item(ns) ainda pendente(s) de revisão em N empresa(s)**" (amarela) ou "Nenhuma pendência de revisão nesta competência" (verde).
- Indicadores: **Empresas com folha** (quantas de quantas) · **Fechamentos** (e quantos pendentes) · **Folhas** · **Bruto** · **Encargos** (INSS + IRRF + FGTS) · **Líquido**.
- **Obrigações da competência** – quadro com os valores das **guias** do mês (INSS, IRRF, FGTS), com a data de **vencimento** e quantos dias faltam (ou atraso). Aviso: "Valores calculados sobre os fechamentos da competência. Confira com o eSocial antes de pagar as guias."
- **Lista de empresas**: busca (**Buscar empresa ou CNPJ**), filtros **Todas · Com pendência · Sem fechamento** (cada um com contador) e botão **CSV** (baixa a planilha). Cada linha mostra fechamentos (com "N pend."), bruto, encargos e líquido; **clicar numa empresa abre o detalhe dela**.

#### Detalhe de uma empresa
- Cabeçalho com nome, CNPJ e as **versões das regras** usadas.
- Botões:
  | Botão | O que faz |
  |---|---|
  | **Aprovar N pendente(s)** | Aprova de uma vez todos os itens pendentes da aba atual (pede confirmação "Confira os valores antes"; se algum não puder ser aprovado, avisa quantos falharam — normalmente por valores inválidos). |
  | **Recalcular rascunhos** | Refaz os fechamentos em rascunho com as regras vigentes. |
  | **CSV** | Baixa a planilha da lista mostrada. |
- Indicadores: Fechamentos (e quantos em revisão/rascunho) · Folhas · Bruto · INSS · IRRF · Líquido, e o quadro de **Obrigações**.
- Dois botões de aba: **Fechamentos de ponto** e **Folha de pagamento** (com contagem). Caixa **Buscar funcionário** e filtros por situação (Todos / Rascunho / Em revisão / Aprovado / Fechado / Pago…).
- **Tabela**: Funcionário (e cargo), Situação, Bruto, INSS, IRRF, FGTS, Líquido. **Clicar numa linha abre a janela de conferência.**

#### Janela de um Fechamento ("Fechamento de [nome]")
Mostra Bruto, INSS, IRRF, FGTS (patronal) e Líquido, a situação e a versão das regras.
- **Revisão da contabilidade** (botões conforme a situação):
  - **Marcar em revisão** – sinaliza que está sendo conferido (só em rascunho).
  - **Aprovar** – aprova (rascunho ou em revisão).
  - **Devolver ao RH** – abre um campo "Explique ao RH o que precisa ser corrigido" (mínimo 5 letras) e **Devolver ao RH** envia de volta (para fechamentos em revisão ou aprovados).
- **Ajuste** (só enquanto Rascunho ou Em revisão): **Campo** (qual valor mudar), **Novo valor**, **Motivo**, botão **Ajustar e recalcular** (e **Cancelar**). Impostos e líquido são sempre refeitos pelas regras.
- Se já está aprovado/fechado: "Fechamentos aprovados ou fechados só podem ser alterados pelo RH, reabrindo o período."

#### Janela de uma Folha ("Folha de [nome]")
Mostra Salário base, Horas extras, Adicional noturno, Bruto, INSS, IRRF, FGTS (patronal), Líquido, situação e versão das regras.
- A mesma **Revisão da contabilidade** (Aprovar / Devolver ao RH).
- **Correção** (só em Rascunho/Processando): "Corrija só os proventos. INSS, IRRF, FGTS e líquido são sempre recalculados pelas regras da Contabilidade." Campos **Salário base (R$)**, **Horas extras (R$)**, **Noturno (R$)** e **Motivo da correção**; botões **Corrigir e recalcular** (precisa de motivo e de pelo menos um valor) e **Só recalcular** (refaz sem alterar valores).
- Se aprovada/paga: "Folhas aprovadas ou pagas não podem ser alteradas por aqui. O RH precisa reabrir a folha."

### Aba "Regras e simulador"
- **Regras de cálculo** (tabelas de INSS, IRRF, salário mínimo/dedução etc.), organizadas em **versões com data de início de vigência**. Há sempre o **Padrão embutido**; "Nenhuma versão cadastrada" se você ainda não criou a sua.
  - **Nova versão** – abre o formulário, que **já vem preenchido com os valores vigentes: altere só o que mudou**. "A versão anterior termina no dia anterior à vigência e fechamentos já fechados não mudam."
  - Campos: **Vigente a partir de \***, **Nome da versão (opcional)** (ex.: 2027-01) e as **faixas** de INSS/IRRF: **Até (R$)** (vazio = sem teto), **Alíquota (%)**, e a dedução; ícone de lixeira **Remover faixa**; **+ faixa**.
  - **Salvar versão**.
- **Simulador de holerite** – "Mostra exatamente o que o fechamento calcula com as regras vigentes na data escolhida." Informe os valores e a data e veja o resultado e as **Regras usadas**, para testar uma mudança sem afetar ninguém.
