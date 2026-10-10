# Aba SUPORTE — botão por botão

**Para que serve:** falar com a equipe do sistema (Innovation). Você abre um **chamado** descrevendo o problema ou dúvida, anexa prints, e acompanha as respostas até a solução. Os chamados também são o canal de pedidos de **reembolso** (Faturas).

**Quem vê:** todos os perfis veem a aba. Mas:
- **Consulta e Comercial** só **acompanham**: não têm o botão para abrir chamado.
- **Desenvolvedor** vê uma tela **diferente** (a fila de atendimento de todas as empresas) — veja a Parte B.
- Todos os outros (Administrador, RH, Gestor, Funcionário, CEO, Contábil, RH - R&S) abrem e acompanham os **próprios** chamados. O Funcionário vê só os que ele mesmo abriu. Cada pessoa vê "os chamados disponíveis para seu perfil e empresa".

---

# PARTE A — Tela do cliente (todos, exceto o Desenvolvedor)

## A1. Topo
| Botão | O que faz |
|---|---|
| **Atualizar** | Recarrega a lista de chamados. |
| **Abrir novo chamado** | Abre o formulário de novo chamado (A3). Não aparece para Consulta e Comercial. |

## A2. Números e filtros
- Três quadros: **Chamados abertos · Resolvidos · Fechados**.
- **Buscar** – por código, assunto, empresa ou responsável.
- **Status** (lista): **Todos os chamados · Novos · Em andamento · Aguardando sua resposta · Resolvidos · Fechados**.
- Cada chamado da lista mostra código, assunto, etiqueta de situação (**Aberto, Em andamento, Aguardando cliente, Aguardando atualização, Reaberto, Resolvido / Fechado**) e o botão **Abrir detalhes**.

## A3. "Novo chamado" (formulário)
- **Categoria**: **Acesso e senha · Erro ou instabilidade · Financeiro e assinatura · Sugestão de melhoria · Outra dúvida**.
- **Prioridade**: **Baixa (pode esperar) · Normal (dúvida comum) · Alta (impacta meu trabalho) · Crítica (sistema parado)**.
- **Assunto (obrigatório)** – ex.: "Erro ao gerar espelho de ponto".
- **Descrição (obrigatória)** – "Descreva o problema com o máximo de detalhes possível…".
- **Clique para anexar arquivos** – PNG, JPG, WEBP, PDF, TXT, MP4 e WEBM, até 20 MB por arquivo.
- **Abrir chamado** – envia. Se algum anexo falhar, o chamado é criado mesmo assim e aparece o aviso com o botão **Reenviar anexos ao chamado criado**.
- Ao fechar com algo preenchido, pergunta "Descartar novo chamado? O conteúdo digitado e os anexos selecionados serão descartados."

## A4. Detalhes do chamado (painel ao abrir)
- **Processo do chamado**: a linha do tempo da situação — **Aberto → Triagem → Em andamento → Cliente → Resolvido → Fechado**.
- Dados: **Quem abriu · Empresa · Responsável (da equipe de suporte) · Categoria**.
- **Descrição inicial do problema** e **Histórico de respostas** (com anexos que podem ser baixados).
- **Adicionar nova resposta ou informação complementar** – caixa "Escreva sua mensagem aqui…" e botão de enviar ("Sua resposta será enviada diretamente à equipe de suporte").
- **Encerrar chamado** – pergunta "Encerrar chamado? Você poderá reabrir o chamado para enviar novas informações." e fecha o atendimento.
- **Reabrir chamado** – aparece em chamados resolvidos/fechados, para continuar a conversa.
- **Tentar novamente** – se o detalhe não carregar.

---

# PARTE B — Tela do Desenvolvedor ("Suporte operacional")
Fila de atendimento de **todas as empresas**.
- **Atualizar chamados** e busca "por número do chamado, assunto ou empresa".
- **Filtros rápidos**: **Todos · Sem responsável · Críticos / altos · SLA em risco · Reabertos · Aguardando cliente · Aguardando deploy**.
- Etapas possíveis: **Novo · Em triagem · Em atendimento · Aguardando cliente · Aguardando deploy · Resolvido · Fechado · Reaberto**. O **SLA** (prazo de atendimento) aparece como **SLA normal / SLA vencido / SLA encerrado**.
- Ao abrir um chamado:
  - Resposta: alternar entre **Resposta pública** (vai para o cliente por e-mail e aparece no chamado — botão **Enviar resposta pública**) e **Nota interna** (só a equipe vê — botão **Salvar nota interna**).
  - **Ações rápidas**: **Assumir este chamado** (vira o responsável), **Etapa atual** (muda a etapa), **Resolver** e **Reabrir**.
  - Painel lateral: **Empresa / Cliente** (com link **Abrir** para a ficha da empresa), **Solicitante**, **Prazos SLA** (e resolução final).
  - Anexos do cliente (prints e documentos) para baixar.
