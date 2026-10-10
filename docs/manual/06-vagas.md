# Aba VAGAS (recrutamento e seleção) — botão por botão

**Para que serve:** "Gerencie oportunidades, acompanhe candidaturas e conduza cada processo seletivo." Aqui a empresa **cria vagas**, divulga no **portal de carreiras**, recebe **candidatos**, avalia, entrevista, pede documentos e **contrata**.

## Quem vê a aba
Desenvolvedor, Administrador, RH - Empresas, **RH - R&S** e Gestor (se o módulo Recrutamento estiver ativo no plano; o número de vagas ativas depende do plano contratado).

| Perfil | O que faz |
|---|---|
| **Administrador, RH - Empresas, Desenvolvedor** | Tudo: cria/edita/publica/encerra/duplica/exclui vagas, conduz candidatos, **contrata**, configura o **funil e as tags**, define os **responsáveis** de cada vaga. |
| **RH - R&S** | Cria e edita vagas e **conduz todo o processo seletivo**, mas **não efetiva contratação** (a etapa "Contratado" não aparece para ele; mensagem: "Seu perfil pode conduzir o processo seletivo, mas não efetivar contratações."). Não usa ações em lote nem configura o funil. Ao final, usa **Encaminhar ao RH da empresa**. |
| **Gestor** | **Só acompanha** as vagas/candidatos: não cria nem edita vaga (não vê "Nova vaga" nem "Editar vaga"). Participa avaliando. |
| Funcionário, Consulta, CEO, Contábil, Comercial | Não veem a aba. |

---

## 1. Tela principal "Vagas e recrutamento"
**Botões do topo:**
| Botão | Para que serve | Quem |
|---|---|---|
| **Portal de carreiras** | Abre a página pública onde os candidatos veem suas vagas. | quem gerencia |
| **Configurar funil** | Leva às configurações do funil e das tags (seção 6). | Admin, RH, Dev |
| **Nova vaga** | Abre o assistente de criação (seção 2). | quem gerencia (todos menos Gestor) |

**Quadros de resumo:** **Vagas abertas · Candidaturas recentes · Aguardando análise · Contratados.**
**Próximas entrevistas:** "Compromissos agendados nos processos seletivos."
**Lista de vagas:** filtro por situação (**Aberta, Encerrada, Rascunho**) e busca ("Buscar cargo, local, contrato ou benefício"; botão **limpar busca**). Se não há nada: "Sua próxima contratação começa aqui — Crie uma vaga…" com **Criar primeira vaga**.

**Botões em cada vaga:**
| Botão | O que faz |
|---|---|
| **Candidatos** | Abre o funil daquela vaga (seção 3). |
| **Editar** | Abre o assistente de edição. |
| **Duplicar** | Cria uma cópia (para reaproveitar uma vaga parecida). |
| **Publicar** / **Encerrar** | Publica a vaga no portal (de Rascunho/Encerrada → Aberta) ou a encerra (sai do portal). |
| **Copiar link** | Copia o endereço público da vaga para divulgar. |
| **Excluir** | Pede confirmação "Excluir vaga" e apaga. |

---

## 2. Assistente "Nova vaga / Editar vaga"
"Monte a vaga, o formulário e os critérios de avaliação do seu jeito." Etapas (botões **Anterior / Próxima**, **Voltar**, e uma **Prévia no portal** ao lado):
1. **Informações básicas** – "O essencial para o candidato reconhecer a vaga": **Título da vaga** (ex.: Analista de RH Sênior), **Departamento**, **Senioridade**, **Local** (cidade, estado ou remoto), **Modalidade**, **Tipo de contratação**, **Quantidade de vagas**.
2. **Descrição** – "Explique o papel, as responsabilidades e o que você espera do candidato": **Descrição da vaga**, **Requisitos** (um por linha), **Benefícios** (um por linha).
3. **Condições** – **Salário mínimo / máximo (R$)**, caixa **"Não divulgar a faixa salarial no portal (exibir 'A combinar')"**, **Inscrições até** (depois da data a vaga sai do portal sozinha; em branco = sem prazo).
4. **Formulário de candidatura** – "Perguntas extras para filtrar os candidatos do seu jeito. Nome, e-mail, telefone, LinkedIn, apresentação e currículo já são pedidos." Você adiciona/edita/remove perguntas (editor de perguntas).
5. **Critérios de avaliação** – "Crie sua própria ficha de avaliação. Cada avaliador dá notas de 1 a 5 e o sistema calcula a média ponderada." **Critério** (adicionar), **Usar modelo básico**, remover critério.
6. **Revisão** – "Confira tudo antes de salvar" (Título, Departamento/Local, Remuneração, Prazo, Perguntas, Critérios). Lista "Corrija antes de salvar" se faltar algo. Ao sair com alterações: "Descartar alterações?" → **Descartar e sair**.

Na edição de uma vaga, Admin/RH/Dev também veem o quadro **Responsáveis pela vaga**: "Com responsáveis marcados, só eles (além de Administrador e RH) veem esta vaga e suas candidaturas. Sem ninguém marcado, toda a equipe de R&S da empresa vê." Botões **Salvar responsáveis** e **Desfazer**.

---

## 3. Funil da vaga ("Funil de recrutamento")
Botões do topo: **Voltar para vagas**, **Editar vaga**, **Copiar link**, **Ver publicação**.
- **Funil / Tabela** – alterna entre quadro de colunas (uma coluna por etapa, arrastando os candidatos) e tabela.
- **Filtros de candidatos:** busca ("nome, e-mail, telefone ou qualquer resposta"), **Ordenar** (Mais recentes, Mais antigos, Maior pontuação, Melhor avaliação, Nome A–Z), **Etapa**, **Tag**, **Critérios** (dentro/fora/ambos), **Pontuação mínima**, **Nota mínima (1-5)**, **Só favoritos**, **Inscritos a partir de / até**, **Filtrar por resposta…**, **Limpar filtros** e **Salvar visão** (guarda um conjunto de filtros com nome).
- **Ações em lote** (marque vários candidatos; **não** disponível ao RH - R&S): **Mover para… → Mover**, **Tag… → Adicionar / Remover**, **Favoritar**, **Limpar seleção**.

## 4. Ficha do candidato (janela lateral ao clicar no candidato)
- Mostra **Etapa** atual, **Fora do critério** (aviso quando não atende), LinkedIn, **Baixar currículo**, **Apresentação**, **Respostas do formulário**, **Tags**, **Motivo da reprovação** (se houver) e histórico.
- **Sua avaliação (1 a 5)**: dê nota a cada critério; "A nota geral é a média ponderada de todos os avaliadores"; **Comentário (opcional)**; **Salvar avaliação**. Se a vaga não tem critérios: "Adicione-os em Editar vaga → Avaliação."
- **Notas**: escreva e **Adicionar nota** (anotações internas).
- **Entrevistas**: **Data e hora**, **Local / link**, **Entrevistador**, **Agendar entrevista**; cancelar entrevista. Elas aparecem em "Próximas entrevistas".
- **Mover de etapa**: pela lista **Etapa** (ou arrastando no funil).
  - **Reprovar candidato** → janela pede o **Motivo**; **Cancelar / Reprovar**.
  - **Contratar candidato** (não existe para RH - R&S) → janela pede **Departamento, Tipo de contrato, Data de admissão, Salário (R$)**; **Confirmar contratação** **cria o cadastro do funcionário**.
- **Documentos do candidato** (admissão):
  - **Solicitar documentos** – escreva um por linha; o sistema gera um **link para o candidato enviar**. O link **só aparece uma vez** ("Ele só aparece agora"): **Copiar**, depois **Já copiei**; é possível **Revogar link**.
  - **Conferência** – para cada documento recebido: **Baixar**, **Aprovar**, ou **Devolver** (com **Motivo da devolução**, que o candidato verá → **Confirmar devolução**).
  - **Seleção e encaminhamento** – **Encaminhar ao RH da empresa**: entrega o candidato com os documentos aprovados ao RH da empresa. "Não cria funcionário nem acesso: a admissão é decidida pelo RH da empresa." Fica desabilitado até selecionar o candidato.

## 5. Quem enxerga o quê na vaga
Se a vaga tem **responsáveis** marcados, só eles (mais Administrador/RH/Dev) veem a vaga e os candidatos; sem responsáveis, toda a equipe de R&S da empresa vê.

## 6. "Funil e tags" (Admin, RH, Dev)
"Defina as etapas do seu processo seletivo e as etiquetas usadas para organizar candidatos."
- **Etapas do funil** – "Todas as vagas usam este funil. Cada etapa tem um tipo que define o comportamento: contratação gera o cadastro do funcionário; reprovação pede o motivo." Botões: **+ Etapa**, nome da etapa, setas **Subir / Descer**, **Remover etapa**, **Salvar funil**.
- **Tags** – "Etiquetas livres para marcar candidatos (ex.: Talento futuro, Indicação, Urgente)": **Nome da tag**, **Cor da tag**, **Criar tag**.
