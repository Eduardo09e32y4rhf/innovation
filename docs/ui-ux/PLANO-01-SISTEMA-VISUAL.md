# Plano 1 — Um sistema visual, três tamanhos de tela

Projeto: Innovation RH. Data de referência: 03/10/2026. Inventário publicado de referência: `c1b340ac`.

## 1. Resultado pretendido e limites

Criar uma experiência única: a pessoa deve reconhecer o mesmo produto no celular, no notebook e no PC. A disposição se adapta ao espaço; nomes, identidade, permissões, conteúdo e significado dos botões permanecem iguais.

Os dois planos são complementares:

1. Este documento define identidade, estrutura, componentes, responsividade e regras de interação.
2. `PLANO-02-PAGINAS-E-EXECUCAO.md` define cada módulo, subpágina, fluxo, sequência de implementação e critérios de entrega.

`INVENTARIO-CONTROLES.md` e `inventario-ui.json` são o registro rastreável dos controles encontrados no código. Devem ser consultados durante cada etapa; este plano não autoriza remover uma ação porque ela parece secundária.

Este trabalho é planejamento, não implementação. Não houve validação autenticada de todos os fluxos em navegador. Elementos encontrados no código não são, por isso, declarados funcionais. Funcionalidades novas que exigem backend serão tratadas como entregas próprias, não como botões decorativos.

## 2. Diagnóstico que orienta o plano

Problemas observados nos arquivos locais e na referência publicada:

- Existem componentes de interface de gerações diferentes: `enterprise`, `platform-ui`, componentes `ui`, classes antigas e `shell-v2`.
- O CSS redefine tokens com formatos incompatíveis. Exemplo: `--border` aparece como hexadecimal e depois como canais RGB; consumidores antigos continuam esperando hexadecimal.
- Há usos de `bg-brand`, `text-brand` e `border-brand`, mas a configuração tem escala numérica sem `DEFAULT`. Também há usos de `rounded-v2`, sem esse nome exato definido.
- `btn-v2-primary`, `btn-v2-ghost`, `chip-neutral` e variáveis de espaçamento de página são usadas sem definição correspondente nos arquivos de estilos examinados.
- Há textos com codificação quebrada, acentos ausentes e variações de nomenclatura. O problema não é apenas revisão ortográfica: existem sequências de bytes decodificadas incorretamente.
- A busca da barra superior aponta para `/[tenant]/dashboard/search`, mas não foi encontrado um arquivo de página correspondente. O atalho mostrado também não tem implementação equivalente naquele componente.
- Menu de computador e navegação inferior do celular não aplicam a mesma filtragem de permissões e módulos.
- O avatar do topo e a identidade do rodapé lateral têm aparências e comportamentos diferentes; o rodapé parece interativo sem executar uma ação.
- Plataforma pode adicionar uma segunda lateral larga dentro da lateral principal, consumindo espaço de tabelas no notebook.
- Há controles de páginas-esqueleto sem ação, além de destinos relativos/incompletos que precisam ser testados.
- Há 16 arquivos rastreados já modificados no workspace, além de arquivos não rastreados. São alterações anteriores a este plano. Não devem ser descartados nem publicados indiscriminadamente.

Decisão: criar uma base compartilhada e migrar por módulo, preservando regras e ações existentes. Não reescrever todas as páginas simultaneamente sem marcos de comparação.

## 3. Direção visual fechada para a primeira versão

Nome interno da direção: **Innovation Workspace**.

Uma aplicação operacional clara, sóbria e confortável: fundo suave, superfícies brancas, roxo como identidade e hierarquia visual previsível. Inovação significa reduzir o caminho até a ação e deixar evidente o contexto, não adicionar efeitos a todas as telas.

### 3.1 Tokens propostos

| Grupo | Padrão da versão clara | Uso |
| --- | --- | --- |
| Marca | `#8B00C5`; hover `#71009F`; superfície `#F5EAFE` | Ação principal e navegação ativa; validar contraste na implementação |
| Fundo | `#F7F8FC` | Área geral da aplicação |
| Superfície | `#FFFFFF` | Cards, tabelas, menus e formulários |
| Texto principal | `#101828` | Títulos, números e conteúdo essencial |
| Texto secundário | `#475467` | Descrições, metadados e auxílio |
| Borda | `#DCE2EC` | Delimitação sutil, nunca substitui o foco |
| Sucesso | Verde com texto e ícone | Concluído, aprovado, pago |
| Atenção | Âmbar com texto e ícone | Pendente, próximo de vencer |
| Erro/risco | Vermelho com texto e ícone | Falha, bloqueio, exclusão |
| Informação | Azul com texto e ícone | Orientação, processando |
| Espaçamento | 4, 8, 12, 16, 24, 32, 48 px | Sem medidas arbitrárias repetidas em cada página |
| Raios | 8 px controle, 12 px card, 16 px modal | Pílula somente para badges compactos |
| Sombra | Uma leve para elevação; outra para overlays | Evitar sombra forte em todos os cards |

Os códigos acima são valores propostos, não uma alegação de contraste já medido. Validar pares reais, inclusive hover, foco e estado desabilitado. O tema escuro utilizará os mesmos tokens semânticos, com valores próprios e gráficos legíveis; não simplesmente inverter cores de algumas telas.

### 3.2 Tipografia e densidade

- Manter uma família consistente, preferencialmente a já carregada pelo projeto; fallback de sistema. Não adicionar download externo só para mudar a aparência.
- Corpo e controles: 14 px no computador; campos de formulário de 16 px no celular para leitura e para evitar zoom automático em navegadores móveis.
- Auxílio: 12–13 px. Texto operacional não deve depender de legendas de 10 px.
- Título de página: 24–28 px no computador e 22–24 px no celular; peso 600–700, não tudo em peso 900.
- Valores de indicadores: 24–32 px, com unidade e período visíveis.
- Rótulos em português com capitalização de frase. Evitar blocos extensos em maiúsculas e espaçamento excessivo entre letras.
- Densidade confortável como padrão. Uma opção compacta para tabelas pode ser futura, sem reduzir alvos interativos abaixo do mínimo.

### 3.3 Iconografia, marca e escrita

- Reutilizar `lucide-react`. Mesmo ícone para a mesma ação em qualquer módulo; tamanho visual de 18–20 px para controles.
- Ícone decorativo não recebe foco; botão só com ícone recebe nome acessível e tooltip também acionável por teclado.
- O logo da empresa é identidade da organização; o avatar é identidade da pessoa. Não usar um no lugar do outro.
- Logo com proporção preservada e fallback aprovado da marca; avatar com iniciais do nome e fallback neutro, sem imagem quebrada.
- Nome comercial único na interface: **Innovation RH**. A escolha entre esse nome e outra grafia registrada deve ser confirmada antes de alterar materiais fiscais; não corrigir razão social automaticamente.
- Menu: **Dashboard, Funcionários, Escalas, Férias, Gestão, Vagas, Usuários, Configurações, Suporte, Plataforma**. **Contabilidade** ganha entrada exclusiva para DEV e CEO.
- Evitar alternar Funcionários, Equipe e Colaboradores como nome do mesmo destino. “Equipe” pode ser um conceito dentro de Escalas, mas a navegação principal permanece “Funcionários”.
- Mensagens descrevem objeto e ação: “Salvar funcionário”, “Enviar resposta”, “Reabrir fechamento”. Evitar “OK”, “X”, “Executar” ou “Finalizar” sem contexto.
- Formatar moeda com `pt-BR`/BRL; datas como dia/mês/ano; competência como “outubro de 2026”; horas com convenção única. Data sem horário não deve mudar um dia por conversão de fuso.

## 4. Anatomia única das páginas

Estrutura lógica compartilhada:

```text
AppShell
  Navegação principal filtrada por autorização
  Topbar: empresa/contexto + busca + notificações + tema + usuário
  Main
    Breadcrumb (quando há hierarquia)
    PageHeader: título + descrição + ações
    ModuleNav (quando há subabas)
    Feedback/bloqueio contextual (se necessário)
    Indicadores (quando ajudam a decidir)
    FilterBar + filtros ativos
    Conteúdo: tabela, calendário, formulário ou painel
    Paginação/resumo (quando aplicável)
  Overlays: menu, modal, drawer, confirmação
  Navegação inferior (celular/tablet)
```

Não obrigar todas as páginas a ter indicadores ou um banner enorme. Formulário e detalhe podem ser diretos. Só há um H1 por página. A aba interna não deve criar outro cabeçalho principal duplicado.

## 5. Plano de adaptação: celular, notebook e PC

Breakpoints propostos são regras de layout, não detecção por marca/modelo. Zoom e largura disponível também contam.

| Elemento | Celular: até 767 px | Tablet: 768–1023 px | Notebook: 1024–1439 px | PC: a partir de 1440 px |
| --- | --- | --- | --- | --- |
| Navegação principal | Drawer + inferior | Drawer + inferior | Lateral compacta de 80 px; expansão explícita | Lateral de 248 px com rótulos |
| Topbar | 56–64 px; busca abre painel | 64 px | 64 px | 64 px |
| Conteúdo | Margem 16 px; pode cair para 12 px em 320 px | Margem 20 px | Margem 24 px | Margem 32 px; conteúdo operacional até cerca de 1600 px |
| Indicadores | 1 ou 2 colunas conforme cabem | 2–3 colunas | 3–4 colunas | 4–6 colunas |
| Cabeçalho | Título e ações em linhas; CTA não fica cortado | Pode quebrar em duas linhas | Título + ações com quebra controlada | Título + ações na mesma linha quando couber |
| Filtros | Busca visível + botão Filtros com contador | Busca + essenciais, demais em painel | Barra com quebra | Barra completa, sem esmagar o conteúdo |
| Tabela operacional | Lista equivalente + detalhes; tabela rolável se comparação exigir | Lista ou tabela contida | Tabela contida; colunas secundárias em detalhe | Tabela com colunas essenciais e ações |
| Formulário | 1 coluna; seções identificadas | Até 2 colunas | 2 colunas | 2 colunas; 3 apenas para campos curtos |
| Detalhe lateral | Tela cheia ou sheet alto | Drawer até 640 px | Drawer de 480–640 px | Drawer de 480–720 px |
| Modal curto | Quase largura toda; rodapé visível | Centralizado | Centralizado | Centralizado |
| Calendário | Lista diária/agenda e navegação de datas; mês alternativo | Semana ou mês com detalhe | Mês + detalhe | Mês/equipe + painel |
| Funil de vagas | Uma etapa escolhida por vez + contadores | Etapas navegáveis | Kanban rolável dentro da área | Kanban amplo; sem rolagem horizontal da página |

### 5.1 Celular: contrato de interação

- Barra inferior com até quatro destinos permitidos e “Mais”. Padrão quando autorizados: Dashboard, Funcionários, Escalas, Férias. Perfis sem esses destinos recebem os primeiros destinos permitidos pela mesma configuração, sem espaços vazios.
- “Mais” abre o menu completo, com os mesmos rótulos e agrupamento do desktop. Contabilidade e Plataforma não desaparecem em celular autorizado.
- Nenhuma ação depende apenas de hover, clique direito ou arrastar.
- Botões e alvos interativos com pelo menos 44 × 44 px. Ícone pode ser pequeno, área clicável não.
- Uma ação principal visível; ações secundárias podem ficar em menu “Ações”, com nomes completos e ordem idêntica à versão ampla.
- Rodapé fixo do formulário não cobre campos nem navegação inferior. Considerar safe area e teclado virtual; nunca somar duas barras fixas sem reservar espaço.
- Cabeçalho sticky somente se não impedir leitura em telas baixas. Usar altura dinâmica de viewport; conteúdo de overlay continua rolável.
- Tabelas convertidas em lista preservam status, período, pessoa/empresa, valores relevantes e acesso a todas as ações. Campos secundários vão para “Ver detalhes”, não são eliminados.
- Gráficos têm resumo textual. Se esconder legendas por espaço, o significado continua disponível no detalhe acessível.
- File upload oferece seletor nativo; câmera/geolocalização têm orientação para permissão negada, indisponibilidade e recuperação.

### 5.2 Notebook: contrato de produtividade

- Lateral compacta identifica destino por ícone, tooltip e nome acessível. Botão “Expandir menu” é explícito; não exigir hover para descobrir opções.
- Expansão deve funcionar sem sobrepor campos silenciosamente; escolher overlay com fechamento ou recalcular conteúdo, com teste em 1024 px.
- Eliminar a segunda lateral de Plataforma. Subabas serão navegação de módulo e grupos em menu; conteúdo fica com a largura útil.
- Testar alturas de 720 e 768 px: menu rola internamente, logout é alcançável, rodapés e confirmações não saem da tela.
- Tabelas largas rolam dentro de um contêiner rotulado. Busca, cabeçalho e rodapé não saem da largura da tela.
- Quatro botões de cabeçalho não justificam reduzir fonte: quebrar ações ou agrupá-las.

### 5.3 PC: contrato de visão ampla

- Lateral expandida, breadcrumb, contexto e filtros claros. Não criar funcionalidades exclusivas de PC sem alternativa móvel.
- Lista + detalhe lado a lado onde isso ajuda, especialmente suporte, empresa e contabilidade. Respeitar leitura e não duplicar o mesmo dado em três cards.
- Painéis analíticos podem usar proporção 2/3 + 1/3. Formulários continuam com largura confortável e campos próximos dos respectivos rótulos.
- Preferências de expansão/densidade, se implementadas, não devem alterar autorização ou perder o estado dos filtros.

## 6. Navegação e contexto: uma fonte de verdade

Criar um registro central de destinos com `id`, rótulo, ícone, construtor de rota, grupo, módulo requerido e política de autorização. Compartilhar esse registro entre sidebar, drawer, barra inferior, breadcrumbs, atalhos e busca.

Regras:

1. Resolver `role`/`profile` em um único adaptador, sem diferentes prioridades em cada página.
2. Combinar papel, permissões efetivas, módulo contratado, estado de cobrança e contexto da empresa. Não usar texto traduzido para decidir autorização.
3. A filtragem do menu não substitui guard da página nem autorização da API.
4. Ao carregar permissões, usar estado neutro; não piscar ações privilegiadas.
5. Não ampliar poderes para “fazer o botão aparecer”. Divergência entre menu e API vira item de contrato a resolver.
6. URL deve preservar tenant, empresa selecionada, competência e filtros relevantes. Usar helpers, não `../finance` ou rota sem tenant.
7. Ao trocar contexto, cancelar/inutilizar requisições antigas e limpar seleção que pertença à empresa anterior.
8. Redirecionamentos legados preservam query parameters necessários e não criam loop.

Agrupamento principal proposto:

- Trabalho: Dashboard, Funcionários, Escalas, Férias, Gestão, Vagas.
- Administração da empresa: Usuários, Configurações, Suporte.
- Operação global: Plataforma e Contabilidade, só para quem tiver autorização correspondente.

O agrupamento não muda a ordem/nomes entre dispositivos. Destinos não autorizados não aparecem no menu, mas URL direta ainda recebe resposta de acesso negado corretamente.

## 7. Barra superior, logo e conta do usuário

### 7.1 Barra superior

- Esquerda: abrir/recolher menu quando aplicável; contexto da empresa com nome e logo.
- Centro/espaço disponível: busca. Desktop usa controle com rótulo legível; celular usa botão de busca com nome acessível.
- Direita: notificações, tema e menu do usuário. No celular, tema pode estar dentro do menu do usuário para não apertar controles; a função permanece disponível.
- Empresa longa é truncada visualmente com nome completo acessível. E-mail da pessoa não ocupa o campo de busca.
- Badge de função pode aparecer no menu de conta, não substituir nome nem contexto da empresa.

### 7.2 Busca real, não promessa vazia

Entrega inicial proposta: um CommandMenu compartilhado para destinos e ações de navegação autorizados. Ele não exige uma nova rota `/search` sem página.

- Buscar por nomes de módulos e subabas; tratar acentos na busca, mas manter acentos no texto exibido.
- Categorias e resultados com ícone, nome, caminho e indicação do contexto.
- Enter seleciona, setas navegam, Escape fecha. `Ctrl+K`/`Cmd+K` só aparece quando o listener existir e não conflitar com digitação.
- Busca em pessoas/registros só será anunciada após endpoint autorizado e paginado, com isolamento de empresa. Até lá, placeholder “Buscar páginas e ações”.
- Se não encontrar, mostrar “Nenhum resultado” e saída clara, não erro.

### 7.3 Menu do usuário

Uma implementação `UserMenu`/`UserAvatar`, reaproveitada em todos os lugares. O rodapé lateral não deve ser um segundo perfil com regras diferentes; pode mostrar contexto textual ou abrir o mesmo menu.

Conteúdo:

1. Avatar/iniciais, nome, e-mail e função com rótulo em português.
2. Empresa atual e, somente se houver autorização e mecanismo seguro, ação de trocar contexto.
3. “Minha conta” abre inicialmente a seção de segurança existente em Configurações. Edição de dados pessoais/foto é nova se não houver endpoint; não exibir como pronta.
4. “Alterar senha” abre destino/seção existente, com validações reais do servidor.
5. “Aparência”: claro, escuro e, se implementado, sistema. Persistir e aplicar antes do flash inicial de tema.
6. “Ajuda e suporte” leva ao suporte autorizado.
7. “Sair” executa logout real, invalida a sessão conforme contrato e remove credenciais do cliente. Apenas navegar para `/login` não é suficiente.
8. No acesso assistido/ghost, banner persistente com empresa acessada e “Encerrar acesso assistido”. Não misturar sessão global original com sessão do cliente.

Não incluir opção ativa que não tenha destino/API. Registrar itens futuros no backlog, não em um menu que aparenta funcionar.

## 8. Biblioteca mínima compartilhada

Reutilizar/refatorar componentes existentes quando possível. Nomes abaixo são contratos propostos, não exigência de criar duas versões em pastas diferentes.

| Componente | Responsabilidade | Estados/requisitos |
| --- | --- | --- |
| AppShell | Uma lateral, topbar e conteúdo | Tenant, loading de permissões, bloqueios e mobile |
| MainNav / ModuleNav | Navegação comum e subabas | Ativo, autorizado, rótulos, URL e teclado |
| PageHeader / Breadcrumb | Título e ações | Quebra responsiva, H1 único e retorno correto |
| Button / IconButton | Toda ação | Variantes, foco, loading, disabled e nomes acessíveis |
| Menu / ActionMenu | Ações secundárias | Teclado, Escape, outside click e retorno de foco |
| UserAvatar / UserMenu | Identidade e sessão | Fallback, erro de imagem e itens autorizados |
| MetricCard / StatusBadge | Indicador/status | Loading, desconhecido, valor zero e contraste |
| FilterBar / FilterSheet | Busca e filtros | Aplicar, limpar, contador e URL |
| DataTable / MobileRecordList | Listagem equivalente | Seleção, paginação, vazio, erro e ações |
| Field / Select / Combobox | Formulários | Label, descrição, obrigatório, erro e ajuda |
| MoneyInput / DateField / MonthField / TimeField | Entrada especializada | Formato local, valor canônico e validação |
| FormSection / FormActions | Organização e salvamento | Dirty state, erro de seção e rodapé seguro |
| Modal / Drawer / ConfirmDialog | Sobreposição | Foco, rolagem, cancelamento e proteção de alterações |
| LoadingState / EmptyState / ErrorState | Feedback consistente | Retry e mensagem específica; nunca zero falso |
| FileUpload / AttachmentItem | Arquivos | Limites, progresso, verificação e download seguro |
| Timeline / AuditChange | Histórico | Autor, horário, motivo, antes/depois quando fornecido |
| Toast / InlineAlert | Feedback de ação | Sucesso só após confirmação; erro persistente no campo |
| PermissionGate / BillingGate | Elegibilidade | Motivo, destino de solução e API ainda protegida |

## 9. Contrato de todos os botões

### 9.1 Variantes e dimensões

- Primário: ação principal positiva, roxo preenchido. Ex.: Novo funcionário, Salvar funcionário.
- Secundário: contorno neutro. Ex.: Importar XLSX, Exportar CSV, Atualizar.
- Discreto: texto/ícone com hover neutro. Ex.: abrir menu, fechar drawer.
- Destrutivo: vermelho com verbo explícito; confirmar de acordo com impacto.
- Link: navega com elemento de link; não usar submit para navegação.
- Botão: executa ação; `type="button"` quando não é envio de formulário. Submit real dispara o mesmo fluxo por Enter e por clique.
- Altura padrão 44 px; ícone 18–20 px; espaçamento 8 px. Controle visual compacto continua com área clicável mínima.
- Uma ação primária por cabeçalho e por rodapé de formulário. Não é proibido ter botões primários em contextos separados; é proibido dar a todas as ações o mesmo destaque.

### 9.2 Checklist por controle, sem exceção

Para cada A/F/C do inventário relacionado ao módulo:

1. Nome correto em português; ícone não substitui significado.
2. Destino/handler existe e opera no objeto/tenant/competência corretos.
3. Papel, permissão, estado e módulo permitem a ação.
4. Condições de habilitação têm explicação: “Fechamento encerrado; reabra antes de corrigir”.
5. Loading impede duplicidade e informa o que está acontecendo.
6. Sucesso confirma persistência; depois atualiza os dados relacionados.
7. Erro preserva dados digitados e informa próximo passo.
8. Cancelar não salva; fechar com alterações pede confirmação proporcional.
9. Retorno de foco e posição de rolagem continuam úteis.
10. Testado por mouse, teclado e toque; sem texto cortado.
11. Confirmar operações irreversíveis ou financeiras com alvo, valor e impacto. Não usar `window.confirm`/`prompt` como solução final de UX.
12. Controle inexistente no backend fica no backlog ou em mensagem de indisponibilidade, nunca em sucesso simulado.

### 9.3 Ações em linha e ações em lote

- Linha: uma ação frequente visível + menu para demais; manter todos os comandos existentes acessíveis.
- Lote: informar quantidade e abrangência. “Selecionar página” e “selecionar todos os resultados” são coisas diferentes.
- Aprovar em lote exige resultado individual para sucesso/falha parcial e não repete itens já processados.
- Exclusão permanente exige identificação do alvo, dependências e confirmação reforçada; desligar/arquivar não é excluir.
- Alteração de salário, fechamento, nota ou cobrança exige resumo antes de confirmar, motivo e auditabilidade adequada.

## 10. Formulários, filtros e dados

### 10.1 Formulários

- Labels reais associados ao campo; placeholder nunca é o único rótulo.
- Obrigatórios indicados e explicados; validação no cliente melhora experiência, mas o servidor decide.
- Erros por campo e resumo com links quando houver vários; focar o primeiro campo inválido, inclusive em aba oculta.
- Máscara não destrói valor canônico; CPF/CNPJ, CEP, telefone, moeda e datas com tratamento consistente.
- Busca de CEP/CNPJ mostra progresso e falha; permitir correção manual dos dados preenchidos.
- Senhas: mostrar/ocultar separado por campo, política consistente com endpoint; não reduzir exigência existente para acomodar formulário antigo.
- Dependentes/itens repetidos recebem identificador estável; excluir um não troca o conteúdo do seguinte.
- Evitar campos duplicados para o mesmo dado, como admissão em duas seções. Migrar a posição sem perder o valor.
- Não persistir CPF, salário, currículo ou credenciais em armazenamento local por conveniência. Preservar rascunho em memória; persistência protegida exige projeto específico.

### 10.2 Filtros e paginação

- Busca com debounce adequado e cancelamento de requisições obsoletas; reset da página ao alterar critérios.
- Filtros ativos em chips com remoção e “Limpar filtros”. No celular o painel tem Aplicar e Limpar; não perder seleção ao fechar acidentalmente.
- Estado na URL para filtros navegáveis e subabas; recarregar/compartilhar URL mantém contexto sem incluir dados sensíveis desnecessários.
- Distinguem-se “nenhum registro cadastrado”, “nenhum resultado para estes filtros” e “não foi possível carregar”.
- Totais deixam claro se representam página, filtro ou todas as empresas. Não somar a primeira página e chamar de total global.

### 10.3 Estados e concorrência

- Skeleton com geometria real para carregamento inicial; refetch não apaga a tabela inteira se dados anteriores continuam válidos.
- Não mostrar 0 para dado desconhecido/loading/erro. Usar estado neutro, erro ou indisponível.
- Operações críticas reconciliam estado atual do servidor antes de concluir; conflito/alteração por outra pessoa não pode sobrescrever silenciosamente.
- Falta de internet preserva o formulário e oferece tentar novamente; não afirmar suporte offline a ponto/financeiro sem implementação.
- Timeout e retry não duplicam cobrança, candidato contratado, usuário ou fechamento.

## 11. Acessibilidade e desempenho: metas de projeto

- Alvo de acessibilidade: critérios aplicáveis de WCAG 2.2 nível AA, a comprovar por testes, não por selo na interface.
- Contraste de texto comum de pelo menos 4,5:1 e texto grande 3:1; foco e componentes identificáveis. Cores propostas ainda precisam ser medidas.
- Foco visível, sequência de tabulação lógica, skip link para conteúdo, `aria-current` na navegação, labels e anúncio de erro/sucesso.
- Modal/drawer: foco inicial adequado, contenção de foco, Escape quando permitido e retorno para o acionador. Sem modal dentro de modal por conveniência.
- Menus e tabs usam semântica compatível com a interação real. Não marcar link de rota como tab se não implementar o comportamento correspondente.
- Zoom de 200% e reflow em 320 px sem perda de ação. Scroll horizontal restrito a componente que precise comparar dados.
- Preferência de movimento reduzido respeitada. Remover pulse/bounce permanente em indicadores operacionais.
- Imagens com dimensão reservada; lazy-load de gráficos, câmera/biometria e módulos pesados quando aplicável.
- Evitar buscar `company.me` em cada componente; contexto/caching compartilhado, sem cache global vazando empresa.
- Medir antes/depois em build de produção. Definir orçamentos a partir do baseline; não declarar melhoria de desempenho sem medição.

## 12. Decisões técnicas e estratégia de migração

- Manter Next/React/Tailwind e bibliotecas já presentes. Este redesign não depende de troca de framework nem de assinatura de ferramenta externa.
- Componentes canônicos em `apps/web/app/components/ui/`; estrutura de shell no diretório compartilhado existente ou em uma consolidação equivalente documentada.
- `shell-v2` é o ponto de partida da estrutura, não uma segunda versão paralela permanente.
- Criar tokens semânticos com um formato consistente. Se consumidores legados exigirem outro formato, usar aliases explícitos de migração; não redefinir o mesmo token incompativelmente.
- Documentar cada variante no componente; parar de escrever combinações diferentes de classes de botão por página.
- Organizar rotas e políticas em arquivo único. A API continua sendo a autoridade; alteração de política exige tarefa explícita e testes.
- Migrar shell → componentes → módulo piloto → demais módulos. Remover legado apenas após comprovar que não há imports/consumidores e que as ações estão cobertas.
- Testes de UI devem incluir visual, interação e contrato. Build aprovado sozinho não prova que botão funciona.
- Não editar a pasta não rastreada `innovation/` como se fosse a aplicação principal: ela é uma cópia fora do recorte deste plano. Trabalhar na raiz atual `apps/web`/`apps/api`.
- Não executar reparo amplo de codificação nem restaurar arquivos em bloco. Preservar alterações atuais e corrigir trechos com diff rastreável e testes de texto.

## 13. Definição de pronto da base comum

- Um menu, uma topbar, um avatar/menu de conta e uma biblioteca de botões.
- Todos os destinos principais encontrados no mesmo registro e filtrados igualmente em todas as larguras.
- Nenhum botão dependente de classe inexistente; nenhuma variável de estilo com formato incompatível.
- Nenhum texto quebrado nas áreas migradas; strings novas em UTF-8 e terminologia uniforme.
- Header, filtros, tabela/lista, overlay e rodapé funcionam em 360, 390, 768, 1024, 1366, 1440 e 1920 px; incluir 320 px para reflow.
- Estados loading, vazio, erro, sem permissão e cobrança bloqueada testados.
- Logout é real; busca corresponde ao que anuncia; tema persiste; acesso assistido tem contexto claro.
- Evidências: screenshots por largura, testes dos controles, lista de diferenças e cobertura do inventário. Só depois a base é usada para migrar o restante.
