# Aba GESTÃO — botão por botão

**Para que serve:** "Pendências, agenda, segurança do trabalho e rotinas de pessoas em um só lugar." Reúne a **saúde ocupacional (ASO)**, a **agenda do RH**, os **comunicados e advertências**, a **admissão** de novos funcionários e a **folha de pagamento**.

## Quem vê a aba
Desenvolvedor, Administrador, RH e Gestor (se o módulo Gestão estiver ativo). Dentro dela:

| Área | Administrador / RH / Dev | Gestor | CEO / Consulta |
|---|---|---|---|
| Central de Gestão (painel) | ✔ | ✔ | só pelo link direto |
| Agenda de compromissos | ✔ cria, edita, conclui, exclui | só **vê** | — |
| ASO e exames | ✔ agenda e conclui | só **vê** | só vê |
| Comunicados | ✔ cria e acompanha | vê o que recebeu | — |
| Admissão | ✔ | — (não aparece) | — |
| Folha de pagamento | ✔ | — (não aparece) | — |

A tela tem um **menu lateral** (no celular vira uma lista "Área"): **Visão geral → Central de Gestão · Agenda → Agenda de compromissos · Segurança do trabalho → ASO e exames (PCMSO) · Pessoas → Comunicados, Admissão, Folha de pagamento.**

---

## 1. CENTRAL DE GESTÃO (a tela inicial)
Painel só de **leitura**, com atalhos.
- **Faixa de saúde ocupacional**: "Saúde ocupacional em dia" (verde) ou "**N colaboradores irregulares**" (vermelho), com a barra "**X% regular**" — a porcentagem de colaboradores ativos com ASO válido.
- **5 cartões** (cada um é um botão que abre o ASO já filtrado):
  - **Sem ASO** – "Nunca fizeram exame".
  - **Vencidos** – "Exame fora da validade".
  - **Inaptos** – "Último resultado inapto".
  - **A vencer em N dias** – "Agende com antecedência".
  - **Em dia** – "ASO válido".
- **Fila de ação** ("Os casos mais urgentes primeiro"): lista de pessoas com nome, cargo, data de vencimento e a etiqueta de situação. **Ver todos** abre o ASO completo.
- **Atalho "ASO e exames"** – mostra quantos exames estão em aberto.
- **Atalho "Agenda"** – mostra quantos compromissos há nos próximos 7 dias.

## 2. AGENDA DE COMPROMISSOS
Calendário de tarefas do RH. Quem só visualiza (Gestor) não vê botões de alteração.
- **Resumo**: **Atrasados · Hoje · Esta semana · Próximos · Concluídos**, e os cartões **Agenda em aberto** / **Compromissos concluídos**.
- **Filtros**: **Todos os status**, **Todos os tipos**, **Todos os funcionários**.
- **Novo compromisso** (RH/Admin/Dev) – formulário: **Título \***, **Tipo \*** (**Reunião, Ligação, Tarefa interna, Prazo administrativo, Retorno ao colaborador, Documento pendente, Outros**), **Status \*** (**Pendente, Em andamento, Concluído, Cancelado**), **Prioridade \*** (**Baixa, Média, Alta, Urgente**), **Início \***, **Funcionário vinculado** (opcional), **Descrição**, **Cancelar/Salvar**.
- Em cada compromisso: **Editar**, **Concluir** (marca como feito) e excluir (pergunta "Excluir compromisso — Esta ação não pode ser desfeita.").
- "Nenhum evento" quando a lista está vazia.

## 3. ASO E EXAMES (PCMSO — saúde ocupacional)
ASO = Atestado de Saúde Ocupacional (exame admissional, periódico, demissional). A lei exige que esteja sempre válido.
- **Filtros**: **situação** (Sem ASO, Vencido, Inapto, A vencer, Em dia…) e **Buscar colaborador** (nome ou cargo).
- **Tabela**: Colaborador, Situação, Vencimento, Ações.
- Botões por linha (RH/Admin/Dev):
  - **Agendar ASO** – janela "Agendar ASO — Registra o exame como pendente ou agendado": escolha o colaborador/tipo/data/clínica e **Agendar**.
  - **Concluir ASO** – janela "Concluir ASO": **Resultado \*** (apto/inapto etc.), **Vence em** (o sistema sugere a validade), **Exames complementares realizados** (deixe em branco se não houver), restrições, **Concluir ASO**.
  - **Histórico** – abre painel com todos os ASOs da pessoa: Exame, Vencimento, Resultado, Clínica, Restrições, Exames. **Fechar**.
- Botão **Agendar ASO** no topo da página – agenda para qualquer colaborador.
- Paginação **Anterior / Próxima**.
- Quando você **desliga** um funcionário em Funcionários, o sistema cria um **ASO demissional pendente** aqui.

## 4. COMUNICADOS ("Notificações / Comunicados — Comunicados, alertas, advertências e suspensões")
- **+ Nova notificação** (RH/Admin/Dev) abre o formulário. O texto de ajuda muda conforme o tipo:
  - **Comunicado** – "Aviso geral. Aparece para todos assim que entrarem no sistema." Destinatário: **Todos os funcionários** ou um específico.
  - **Promoção / reconhecimento** – "Mensagem de parabéns que aparece ao funcionário assim que ele entrar." Campos extras opcionais: **Novo cargo**, **Novo salário (R$)**, **Vale a partir de**. ⚠ É **só uma mensagem**: **não muda** o cargo nem o salário no cadastro — isso você altera em Funcionários → Editar cadastro.
  - **Advertência** – "Documento formal. O funcionário precisa assinar (ou recusar) ao entrar." Exige **Funcionário \***, **Data da ocorrência \***, **Motivo \*** (ex.: "Falta sem justificativa nos dias 10 e 11") e **Detalhes da ocorrência \***.
  - **Suspensão** – "Documento formal. Lança os dias no ponto e o desconto entra na folha." Além dos campos da advertência, **Dias de suspensão \*** (1 a 30, a partir da data da ocorrência). Depois de criada o sistema informa quantos dias foram lançados no ponto e o **desconto estimado** na folha.
  - **Título \*** e **Mensagem \*** em todos. Se o funcionário escolhido **não tem usuário de acesso**, o sistema avisa para criar o acesso antes (ele não conseguiria receber/assinar).
- **Filtros**: por tipo (Comunicado, Promoção, Advertência, Suspensão, Sistema) e por situação (**Não lida, Lida, Pendente resposta, Ciente, Aceita, Recusada**).
- Cada comunicado mostra tipo, data, título, mensagem, para quem foi e a situação de cada destinatário (e o **motivo da recusa**, se houver).
- **Baixar PDF Legal** – nas advertências e suspensões, gera o termo disciplinar em PDF.
- **Do lado do funcionário:** ao entrar, aparece o aviso. Em advertência/suspensão ele escolhe **Ciente / Aceitar / Recusar** (a recusa pede motivo). O sino do topo também avisa.

## 5. ADMISSÃO (RH/Admin/Dev) — "Acompanhe as tarefas e os documentos dos processos de integração"
- **Atualizar** – recarrega.
- **Novo processo** – janela "Novo processo de admissão": escolha o **Funcionário \*** e **Criar processo**. O sistema monta o **checklist** de entrada (aviso: "ASO e documentos continuam nos respectivos módulos").
- Filtros: **Buscar funcionário** e **Estado do processo**.
- **Abrir processo** – mostra as tarefas e os **documentos do checklist**. Botões: **Concluir tarefa** (dar baixa em cada item) e **Excluir processo**.

## 6. FOLHA DE PAGAMENTO (RH/Admin/Dev) — "Escolha o ciclo (início e fim), calcule, edite, aprove e registre o pagamento"
Outros perfis veem: "Acesso restrito à folha de pagamento."
- **Ciclo começa em / Ciclo termina em** – o período que quer ver (o fim não pode ser antes do início). A tela mostra as folhas cujo ciclo toca esse período.
- **Quadros**: **Funcionários na folha · Total bruto · Total líquido · Aprovadas / pagas**.
- **Nova folha** – janela "Nova folha — Defina o ciclo e escolha quem entra na folha": **Início do ciclo \***, **Fim do ciclo \***, **Buscar funcionário** (marque quem entra), **Observações**, botões **Voltar** e **Calcular**. Em ciclo que não é o mês cheio, o salário é **proporcional**; **faltas, suspensão e horas extras aprovadas** do período entram no cálculo.
- **Calcular primeira folha** – atalho quando ainda não há nenhuma.
- **Tabela**: Funcionário/ciclo, **Bruto, INSS, IRRF, FGTS, Líquido**, Status, Ações. Abrir uma linha mostra **Proventos**, **Descontos** e observações. "Valores inválidos" aparece se algo não bate.
- **Botões por folha:**
  - **Recalcular** – refaz a conta com as regras e os dados atuais.
  - **Editar** – altera o ciclo e os **lançamentos manuais** (bônus, comissão, adiantamento… cada um com descrição e valor; botão para remover). Os valores são recalculados ao salvar.
  - **Aprovar** – a folha fica correta e bloqueada para mudanças.
  - **Marcar paga** – registra a **quitação**. ⚠ Não faz transferência bancária.
  - **Reabrir** – volta uma folha aprovada/paga para edição.
  - **Cancelar** – pede **Motivo \***; a folha cancelada fica no histórico, sai dos totais e libera o período para novo cálculo.
  - **Excluir** – remove a folha.
- Regra de horas extras: só entra a hora extra **autorizada** e a parte que **não foi para o banco de horas**.
