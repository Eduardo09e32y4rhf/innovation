# Blueprint do Design System - Innovation Plataforma
*Documentação consolidada para unificação do frontend (Refatoração Moderna)*

---

## 1. Padrão Global (O "DNA" Visual)
Todas as telas devem seguir estas regras estritas para manter a consistência e o aspecto moderno:
*   **Arredondamento (Border Radius):** Constante e generoso em todos os cantos (cards, botões, modais, inputs). Nada de cantos retos.
*   **Paleta de Cores Base:**
    *   **Fundo Principal (Main):** Cinza super claro (off-white).
    *   **Menu Lateral (Sidebar):** Escuro sólido (quase preto).
    *   **Cor Primária:** Roxo vibrante (usado em botões primários, itens ativos no menu e bordas de inputs em foco).
    *   **Cores de Status:** Verde (Positivo/Ativo), Vermelho (Negativo/Falta), Amarelo/Laranja (Atenção), Cinza (Neutro/Inativo).
*   **Cards (KPIs e Containers):** Fundo branco, contorno cinza extremamente sutil e sombra leve (`box-shadow` suave).
*   **Estados Vazios (Empty States):** Caixas brancas grandes contendo um ícone centralizado, um título forte ("Nenhum registro") e texto explicativo claro.
*   **Interações (Foco):** Campos de formulário e inputs ganham uma borda roxa evidente quando clicados/focados.

---

## 2. Componentes Estruturais Isolados

### Menu Lateral (Sidebar)
*   **Fundo e Divisores:** Escuro sólido. Divisores de seção ("MENU PRINCIPAL") em cinza pequeno e maiúsculo. Linha fina separando o rodapé.
*   **Itens de Navegação:** 
    *   *Inativos:* Ícone vazado e texto cinza claro/azulado.
    *   *Ativo:* Fundo roxo em formato de "pílula", texto e ícone brancos.
*   **Marca/Logo (Topo):** Retângulo com cantos arredondados, fundo cinza escuro. Ícone quadrado "IR" (brilho roxo) ao lado do texto "Innovation" (branco, negrito) e "PLATAFORMA" (cinza, maiúsculo).
*   **Rodapé do Usuário:** Avatar circular roxo com iniciais brancas. Nome em branco negrito e Cargo (ex: DEV) em roxo logo abaixo.

### Cabeçalho Superior (Top Header)
*   **Títulos:** Título grande e escuro com subtítulo descritivo cinza logo abaixo. Algumas telas possuem um "Pré-título" colorido acima do principal.
*   **Botões de Ação:** Alinhados à direita. Primários são roxos, Secundários são brancos com borda fina. Ícones ficam à esquerda do texto.
*   **Notificações e Perfil (Canto Direito):**
    *   *Sino:* Dentro de um quadrado branco de cantos arredondados (squircle) com borda cinza fina.
    *   *Avatar Superior:* Círculo roxo com inicial branca e um "anel" externo branco para separá-lo do fundo da página.
*   **Menu Suspenso (Dropdown):** Caixa flutuante branca com sombra. Exibe nome e e-mail. Separador horizontal cinza. Botão de "Sair" e seu ícone devem ser na cor vermelha.

---

## 3. Telas Principais (Layouts)

### 3.1. Dashboard (Visão Global)
*   Filtros longos no topo (Mês e Departamento).
*   4 Cards principais de KPI (Funcionários, Pontos, Férias, Banco de Horas) e Cards secundários (Pendências, Alertas, Movimentações).
*   Bloco inferior largo reservado para a "Central de Notificações".

### 3.2. Funcionários & Vagas (Listagens)
*   Cards de status de contagem rápida no topo (Ativos, Inativos / Vagas abertas).
*   Barra de pesquisa gigante e centralizada ("Digite para filtrar...").
*   Tabelas em caixas brancas arredondadas ou *Empty States* gigantes convidando à primeira ação ("Novo funcionário" ou "Criar vaga"). Na tela de vagas, o botão de criar fica *dentro* do Empty State.

### 3.3. Escalas & Gestão (Complexidade e Abas)
*   **Escalas:** Exibe um componente de *Stepper* (passos de progresso do Fechamento: Apuração -> Rascunho -> Revisão). 6 Cards coloridos de status de presença.
*   **Gestão:** Usa abas de navegação internas limpas (texto puro, onde o ativo fica roxo). Botões de alternância de visão (Calendário vs Kanban). Filtros dropdown empilhados.

### 3.4. Férias & Suporte (Fluxos e Triagem)
*   Uso forte de **Pílulas (Pills)** para filtros horizontais rápidos (Pendentes, Aprovadas, SLA em risco). O filtro ativo fica com fundo roxo.
*   No Suporte, botão escuro de "Atualizar" e busca integrada.

### 3.5. Usuários (Tabelas de Segurança)
*   5 Cards de KPI. Tabela contendo avatares circulares ao lado do nome, *badges* (pílulas coloridas) para o Status ("ATIVO" em verde). Botão "Editar" e reticências "..." para ações de linha.

### 3.6. Configurações & Plataforma (Layout de Duas Colunas)
*   Usado para painéis de alta densidade.
*   **Coluna Esquerda:** Navegação em lista vertical. Item ativo ganha texto e ícone roxos com fundo branco super sutil.
*   **Coluna Direita:** O conteúdo ativo exibido dentro de grandes blocos brancos arredondados.
*   Na tela de Plataforma, uso de sub-gráficos dentro dos cards de KPI e botões de "Acesso Rápido" gigantes com setas indicativas.

---

## 4. Modais (Janelas Sobrepostas)

*   **Fundo:** A tela traseira escurece levemente. O modal é branco, com forte arredondamento e drop-shadow. Ícone "X" no topo direito para fechar.
*   **Modal Padrão (Ex: Nova Empresa):** Campos de CNPJ, dropdowns largos. Campos não-editáveis ganham fundo cinza/azulado. Senhas preenchidas viram bolinhas `........`.
*   **Modal Rico (Ex: Criar Vaga):** Uso de campos complexos como Área de Texto grande com contador de caracteres (ex: 0/6000) e campos de input que aceitam múltiplas entradas separadas por vírgula (Benefícios).
*   **Rodapé de Modais:** Sempre à direita. Botão "Cancelar" (secundário, branco) ao lado do botão de confirmação (primário, roxo).

---

## 5. Componentes Especiais

### Importação por Excel (Upload UI)
*   Interface em Cards lado a lado.
*   O *Dropzone* (área de arrastar arquivo) difere do resto do sistema: o fundo ganha um tom lilás extremamente claro e a **borda torna-se tracejada (dashed) roxa**, indicando claramente a ação de upload.

### Calendário de Horas / Ponto Mensal
*   **KPIs de Topo:** Cada card muda a cor do fundo e da borda dependendo do status (Verde = Saldo positivo/Extra; Vermelho = Falta; Laranja = Atraso).
*   **Navegação:** Mês centralizado com botões de setas `<` e `>` circulares/brancos ao lado.
*   **Grid:** Dias desenhados como blocos individuais arredondados cinza claro.
*   **Dia Ativo/Focado:** O quadrado ganha fundo totalmente branco e uma **borda escura/grossa**, destacando o dia atual em relação à grade.
