# Plano 2 — Especificação das páginas e roteiro de execução

Data: 03/10/2026. Referência publicada para inventário: `c1b340ac`.

## 1. Como executar este documento sem esquecer funcionalidades

Ler primeiro `PLANO-01-SISTEMA-VISUAL.md`. Depois escolher uma etapa deste documento e consultar as ações, campos, opções e funções dos respectivos arquivos em `INVENTARIO-CONTROLES.md`. O JSON complementar preserva textos/expressões longos sem abreviação.

Convenção de rotas: **D = `/[tenant]/dashboard`**, **P = `D/platform`**, **E = `D/escalas`**, **G = `D/management`**. `[tenant]`, IDs e query parameters são valores reais, não strings para copiar literalmente.

Classificações:

- **Existente**: existe interface ou integração no código; ainda precisa de teste de execução. Não significa validado em produção.
- **Correção**: adequar comportamento, texto, acesso, destino ou contrato existente.
- **Novo**: funcionalidade adicional proposta. Se exigir servidor, registrar dependência e não simular conclusão.
- **Esqueleto**: página incompleta ou controle sem implementação suficiente.
- **Alias**: redirecionamento/reexportação para outro fluxo; não criar uma segunda versão visual.

As 86 páginas do inventário incluem telas públicas, rotas auxiliares e aliases, não 86 experiências independentes a redesenhar. O manifesto completo está no inventário, e as seções abaixo cobrem os módulos e agrupam explicitamente os destinos auxiliares.

Este plano também inclui **Contabilidade**, porque já existe uma tela global relacionada ao pedido anterior. O acesso exclusivo DEV/CEO é preservado; o perfil `CONTABIL` existente não ganha acesso automaticamente.

## 2. Contrato obrigatório de entrega de cada página

Para cada tela, preencher durante a implementação:

1. Rota canônica, aliases, título, breadcrumb e retorno.
2. Papéis/permissões/módulos/estado de cobrança necessários, confirmados na API.
3. Fonte dos dados, paginação, filtros, ordenação e escopo dos totais.
4. Lista de cada ação do inventário com resultado: preservada, corrigida, consolidada ou retirada com justificativa/aprovação quando mudar produto.
5. Cada campo: label, tipo, máscara, obrigatoriedade, validação, erro e regra condicional.
6. Cada modal/drawer/aba e respectivos confirmar/cancelar/fechar.
7. Loading inicial, atualização, vazio real, vazio filtrado, erro, acesso negado e bloqueio de cobrança.
8. Comportamento em celular, notebook e PC; equivalente para ações secundárias e tabelas.
9. Testes de navegação, permissão e persistência; efeitos em outros módulos.
10. Evidências e pendências. Nenhuma ação crítica é marcada pronta só porque compila.

Aplicam-se a todas as ações as regras de foco, loading, erro, cancelamento, confirmação, autorização e prevenção de duplicidade do Plano 1. Essas regras não serão reescritas em cada botão para evitar contradição.

## 3. Estrutura comum, conta e bloqueios

### 3.1 Menu principal e navegação de módulo

Entregar os onze destinos autorizados: Dashboard, Funcionários, Escalas, Férias, Gestão, Vagas, Usuários, Configurações, Suporte, Plataforma e Contabilidade.

- Desktop/PC: uma sidebar. Notebook: versão compacta/expansível da mesma sidebar.
- Celular/tablet: drawer e barra inferior derivados do mesmo registro de rotas e políticas.
- Escalas, Gestão e Plataforma têm `ModuleNav`, sem sidebar interna competindo com a principal.
- Suporte do cliente e suporte operacional usam a mesma identidade, mas não misturam dados nem poder de ação.
- Notificações, financeiro e WhatsApp têm destinos canônicos únicos; aliases mantêm links antigos.

### 3.2 Conta do usuário

Controles: abrir/fechar UserMenu; Minha conta; Alterar senha; Aparência; Ajuda e suporte; Sair; troca/encerramento de acesso assistido somente quando houver contrato autorizado.

Informações: avatar/iniciais, nome, e-mail, função, empresa atual. Fallback de imagem. A mesma ação/identidade no topo e em qualquer identificação lateral. Não usar e-mail como placeholder da busca.

### 3.3 Gates existentes que não podem desaparecer

- `ProtectedRoute`: autenticação, expiração e retorno ao login.
- `PasswordChangeGate`: troca obrigatória de senha temporária, campos atuais/novos conforme contrato, mostrar/ocultar, política de senha, confirmação e erro.
- `PrivacyConsentGate`: apresentação da política/termo, escolha e registro real; não confundir ciência necessária com consentimento opcional.
- `PendingNotificationsGate`: comunicado pendente, ciência/resposta e persistência de quem respondeu. Não bloquear usuário com falha de carregamento sem recuperação.
- `ProposalGate`: proposta/termos e pagamento conforme estado; contrato/proposta não podem aparecer aceitos antes da confirmação do servidor.
- Bloqueio de assinatura: distinguir acesso administrativo à cobrança de acesso ao restante do sistema. Preservar exceções efetivamente autorizadas, não apenas DEV escrito no layout.
- Acesso assistido: banner do contexto, auditoria e saída segura, sem vazamento de dados entre empresas.

Cada gate terá o mesmo padrão de modal/tela de sistema, mas continuará com comportamento e criticidade próprios.

## 4. Dashboard — D

### 4.1 Estrutura e informações

- Título único: Dashboard; subtítulo adaptado ao perfil, sem alterar a navegação principal.
- Variantes existentes por função: operacional/RH, visão global DEV/CEO quando autorizada, comercial e visão individual do funcionário. Conferir seleção real no código antes de consolidar.
- Contexto explícito: empresa ou operação global, competência e departamento. Um indicador global nunca deve parecer dado da empresa atual.
- Filtros existentes: mês de referência e departamento; limpar/restabelecer período atual.
- Indicadores: funcionários ativos, registros de ponto hoje, férias pendentes e banco de horas. Explicar unidade, período e escopo.
- Gráficos: jornadas/registros por dia, distribuição da equipe e movimentações ao longo dos meses quando disponíveis.
- Fila de atenção: ASOs vencidos/a vencer/admissionais/inaptos; lançamentos manuais; férias; funcionários sem gestor ou acesso, conforme dados e autorização.
- Movimentações: admissões e desligamentos. Datas importantes/aniversários quando retornados pela API.
- Central de notificações e comunicados; últimos pontos e solicitações de férias, quando aplicável à função.
- Atalhos existentes para Plataforma, Financeiro, Usuários e configurações precisam ser reconciliados com permissões reais.

### 4.2 Ações e detalhes

- Alterar mês/departamento → todas as seções relacionadas usam o mesmo contexto.
- Abrir destino de um KPI/alerta → rota e filtro correspondentes. **Novo** se atualmente o card só informa; implementar apenas com destino válido.
- Abrir notificação/comunicado → objeto correto, não lista genérica sem contexto.
- Ver todos os pontos/férias → período e funcionário/empresa preservados.
- Registrar ponto → fluxo canônico de ponto apenas para perfil elegível.
- Preparar fechamento/abrir fila de fechamento → `E/fechamento` no período adequado.
- Atualizar dados → feedback de refetch sem apagar dados válidos.
- Gráficos sem dados mostram vazio real, sem valores inventados; dados com erro mostram erro, não “0”.

### 4.3 Responsividade e aceite

- Celular: resumo → atenção → ações → análises; 1–2 KPIs por linha e gráfico resumido com detalhes.
- Notebook: KPIs em até quatro colunas; gráficos em duas áreas somente se os textos couberem.
- PC: gráficos e atenção lado a lado, com tabela de atividade recente.
- Aceite: variantes de função não expõem dados indevidos; totais iguais à fonte; alertas levam ao problema correto; competência sincronizada; nenhuma palavra corrompida.

## 5. Funcionários — D/employees

### 5.1 Listagem, indicadores e busca

- Cabeçalho: Funcionários; descrição “Gerencie os dados e acessos da equipe”.
- Indicadores existentes: ativos, inativos e desligados. Não considerar status de admissão/férias/afastado como inexistente; definir agrupamento coerente com backend.
- Busca existente: nome, CPF, matrícula, gestor ou departamento.
- Filtros propostos: status, departamento, gestor e unidade, usando dados/API reais. Não apresentar filtro sem comportamento.
- Dados essenciais de linha: nome, matrícula/CPF conforme autorização e máscara, cargo, departamento, gestor, status e vínculo de acesso.
- Ações de cabeçalho: **Novo funcionário** e **Importar XLSX**. Exportação genérica já disponível em Configurações pode ser consolidada como atalho autorizado, não duplicar implementação.

### 5.2 Todas as ações por funcionário

1. Ficha cadastral em PDF.
2. Folha/documento individual em PDF, com nome que explique exatamente qual documento é gerado.
3. Relatório de ocorrências em PDF.
4. Abrir ponto do funcionário, preservando ID e competência.
5. Abrir dossiê.
6. Editar cadastro (`D/employees/new?id=...`).
7. Desligar funcionário, com data e impacto sobre acesso, folha, escalas e registros conforme contrato existente.
8. Excluir definitivamente, quando permitido, depois de consultar impacto/dependências e exigir confirmação reforçada pelo alvo.

Trocar a fileira apertada de ícones por ação frequente + menu “Ações”. PDF pode ser submenu “Documentos”, sem remover documentos. Não chamar exclusão de desligamento.

### 5.3 Dossiê

- Resumo: nome, status, cargo, departamento, matrícula, admissão/desligamento, gestor e indicadores ASO/férias/ocorrências.
- Dados pessoais sensíveis com máscara e acesso coerente; não depender de CSS para esconder informação já entregue a papel não autorizado.
- Seções: cadastro; ASOs/resultados e histórico; férias; ocorrências/ponto; documentos existentes.
- Abrir registro relacionado, editar cadastro e emitir documentos quando esses handlers existirem/forem implementados.
- Estados independentes por fonte: falha em férias não apaga o cadastro inteiro.
- Confirmar exclusão com quantidades relacionadas: ponto, férias, ASOs, ocorrências e demais dependências retornadas pelo servidor.

### 5.4 Cadastro e edição — D/employees/new

Manter oito seções, com labels corrigidos, progresso de preenchimento opcional e validação navegável. Não converter formulário completo em cadastro reduzido.

| Seção | Campos que devem ser preservados |
| --- | --- |
| Dados pessoais | Nome completo, CPF, nascimento, e-mail, telefone principal, telefone secundário, matrícula, gênero, estado civil, escolaridade, nome da mãe, nome do pai, naturalidade/cidade natal, nacionalidade |
| Documentos | Primeiro emprego, PIS/PASEP/NIT quando aplicável, RG, órgão emissor, UF/data de emissão, título de eleitor, zona, seção, UF, reservista conforme regra vigente |
| Endereço | CEP, logradouro, número, complemento, bairro, cidade, estado, observações cadastrais |
| Dados profissionais | Admissão, status, desligamento quando aplicável, departamento, cargo, gestor e operação/unidade |
| Jornada | Escala, descrição se Outra, jornada diária, entrada padrão, saída para almoço, retorno do almoço e saída padrão |
| Dados bancários | Banco, agência, conta, tipo de conta |
| Dependentes | Nome, CPF, nascimento e parentesco por dependente; adicionar e remover item |
| Contrato e acesso | Salário, tipo de contrato, CNPJ para PJ/terceirizado, razão social/nome fantasia de PJ, acesso ao painel Sim/Não, perfil de acesso |

Campos de admissão aparecem repetidos na versão existente: consolidar em Dados profissionais sem perder valor. Preservar opções atuais de status, escala, escolaridade, contrato, parentesco e perfil; corrigir rótulos, não alterar enums/API silenciosamente.

Controles:

- Voltar; selecionar seção; adicionar/remover dependente; lookup de CEP e CNPJ; Salvar funcionário/Salvar alterações; Cancelar; Fechar aviso de erro quando aplicável.
- Campos condicionais preservados: Outro na escala, primeiro emprego/PIS, desligamento, reservista e tipo de contrato/CNPJ.
- Funcionário em admissão tem orientação para dados pendentes e ASO admissional. Ativação depende do estado real do servidor; não liberar acesso só por selecionar Ativo no front.
- Ao salvar com erro em outra aba, indicar seção e focar campo inválido.
- Link de conta/usuário não deve alegar acesso criado se apenas marcou intenção de vínculo.
- Máscaras, moeda, datas e senha quando houver seguem a biblioteca comum. Dados bancários não ficam em localStorage.

### 5.5 Importação — D/employees/import

Fluxo: Baixar modelo XLSX → selecionar arquivo → validar → revisar prévia → confirmar → apresentar resultado.

- Limites atuais observados: arquivo de até 2 MB e até 2.000 linhas; confirmar contrato e exibir limites antes do upload.
- Listar quantidade total, válida, inválida e duplicada se retornada. Erros têm linha, coluna/campo e descrição.
- Controles: Voltar; Baixar modelo; Selecionar/substituir/remover arquivo; Validar; Confirmar importação; Cancelar; Tentar novamente.
- Confirmar apenas dados elegíveis conforme regra da API. Importação parcial precisa explicitar o que entrou e o que falhou.
- Corrigir retorno relativo para destino canônico de Funcionários. Evitar modelo/download sem autorização.
- Atualizar listagem/indicadores após sucesso; não criar o mesmo funcionário duas vezes num retry.

### 5.6 Responsividade e aceite

- Celular: cards com nome/status/cargo e acesso a todos os documentos/ações; formulário uma coluna com seletor das oito seções.
- Notebook: tabela com essenciais e drawer; formulário duas colunas.
- PC: tabela completa, dossiê lateral e resumo do formulário sem duplicar campos.
- Aceite: importar, cadastrar, editar, abrir dossiê, emitir cada PDF e desligar testados; vínculo/permissão e máscara corretos; exclusão separada e protegida.

## 6. Escalas — nove telas de módulo + registro de ponto

### 6.1 Visão geral — E

- Indicadores existentes: colaboradores, presentes hoje, ausências, ocorrências, trocas e fechamento/pendências conforme fonte.
- Contexto de competência e status da jornada; fila de atenção e atalho para a etapa correta.
- Subnavegação: Visão geral, Calendário, Ponto, Equipe, Trocas, Ocorrências, Regras, Fechamento, Documentos.
- Ações: navegar para cada subaba; Abrir ponto/Registrar ponto quando elegível; Tratar ocorrência; Revisar troca; Preparar fechamento; atualizar contexto.
- A proposta de “assistente de fechamento” usa estados já existentes e links reais, sem aprovação automática.

### 6.2 Calendário — E/calendario

Preservar as áreas **Minha jornada, Escala da equipe e Trocas**, mas evitar dois fluxos divergentes para a mesma troca/escala.

Informações/filtros:

- Funcionário selecionado, mês e ano; próprio funcionário e outros conforme autorização.
- Dia, jornada prevista, entrada/almoço/retorno/saída registrados, horas trabalhadas e saldo.
- Hora extra, faltas, atraso, saída antecipada, saldo do mês; feriado, atestado integral/parcial, suspensão e outras ocorrências.
- Informações de localização e ausência de biometria somente para quem pode consultar.
- Datas anteriores à admissão/posteriores ao desligamento identificadas, não contabilizadas como faltas por simples ausência.

Ações:

1. Mês anterior/próximo; voltar ao atual quando implementado; selecionar funcionário.
2. Abrir dia/detalhe; fechar detalhe; abrir folha de ponto no funcionário/período.
3. Editar jornada prevista por exceção, incluindo horários e motivo conforme API.
4. Lançamento manual: data, motivo, entrada, almoço, retorno, saída e observação; salvar/cancelar.
5. Ajustar mês, respeitando ciclo e efeitos em fechamento; mostrar resumo antes de confirmar.
6. Criar escala/modelo e atribuir existente à equipe; selecionar funcionários, filtrar, selecionar todos/nenhum, definir vigência e horários/dias/ciclo.
7. Solicitar troca com datas/funcionários disponíveis conforme fluxo, justificativa; aprovar/rejeitar/cancelar quando permitido.
8. Aprovar horas extras/pendências do dia se expostas pelo contrato existente; preservar nomes e regras dos controles do inventário.

Correções: extrair calendário, formulários e trocas do arquivo monolítico para componentes testáveis; reutilizar as mesmas mutações de Equipe/Trocas/Ponto; impedir cálculo divergente entre abas.

### 6.3 Folha de ponto — E/ponto

- Filtros: funcionário e competência; visão mensal/lista conforme código existente.
- Exibir previsão, batidas, total, saldo, ocorrências e condição de aprovação. Valores do servidor são autoridade para folha.
- Controles: alterar funcionário/período; abrir dia; criar/editar lançamento manual; aprovar pendência; excluir registro permitido; PDF individual; PDF coletivo; Registrar ponto; fechar/cancelar formulários.
- Manual: funcionário, data, motivo, entrada, saída almoço, retorno, saída, observação. Erros de cronologia/virada de dia e dia fora do vínculo recebem retorno legível.
- Aprovar/excluir exige alvo e atualização dos totais. Registro imutável/fechamento bloqueado não é editável só porque o modal abriu.
- Impressão e documento oficial devem usar o endpoint correto, não PDF inventado com dados do DOM.

### 6.4 Equipe e modelos — E/equipe

- Listar modelos de escala com nome, descrição, dias/ciclo e horários.
- Criar, editar e arquivar modelo; condições de uso/vínculo respeitadas. Reativação é nova se não houver endpoint/ação atual.
- Atribuir modelo existente a funcionários: busca/filtro, seleção, selecionar todos/nenhum, vigência inicial/final e confirmar/cancelar.
- Mês/período e situação de escala da equipe quando exibidos.
- Alterar modelo não deve trocar retroativamente todas as jornadas sem regra explícita; mostrar efeito de vigência definido na API.
- Nomear ações distintamente: Criar modelo, Editar modelo, Atribuir escala. “Novo” sozinho não explica o objeto.

### 6.5 Trocas — E/trocas

- Filtros/abas: pendentes, aprovadas, rejeitadas, canceladas e todas conforme estados existentes.
- Linha: solicitante, origem/destino, datas, justificativa, status, solicitada em e decisão quando disponível.
- Solicitar troca; escolher data original/destino; enviar; cancelar própria solicitação quando permitido; aprovar; rejeitar com justificativa exigida pela API; abrir detalhe.
- Validar disponibilidade, conflito, elegibilidade e concorrência no servidor. Não mostrar troca aprovada sem atualizar escala correspondente.
- Unificar o fluxo que também aparece no Calendário.

### 6.6 Ocorrências — E/ocorrencias

- Listagem por funcionário/status; pendentes, aprovadas, rejeitadas e todas.
- Campos: funcionário, data, tipo, dia completo ou minutos/duração, motivo e observação conforme contrato.
- Controles: Nova ocorrência, selecionar filtro, Enviar/Salvar, Cancelar, Aprovar, Rejeitar, detalhes de decisão quando disponíveis.
- Funcionário consulta/solicita apenas no escopo permitido; gestor não ganha escopo global.
- Aprovação precisa refletir no ponto/fechamento; mostrar distinção entre registro do fato e mudança de cálculo.

### 6.7 Regras — E/regras

Três áreas:

1. **Jornadas**: nome, carga semanal, tolerância em minutos, intervalo padrão. Criar, editar, arquivar, ativar; labels distintos e confirmação para efeitos relevantes.
2. **Extras e ciclo**: hora extra dia útil, DSR/feriado, adicional noturno, banco de horas habilitado, início/fim do ciclo de fechamento. Salvar configurações e cancelar/restaurar edição quando implementado.
3. **Feriados**: nome, data, tipo nacional/estadual/municipal e escopo. Criar, editar, excluir; confirmar exclusão e exibir impacto.

Correção importante: botão contextual “Novo” deve criar jornada em Jornadas e feriado em Feriados; não abrir formulário de feriado na aba de configurações globais. Nomear “Nova jornada”/“Novo feriado”; em Extras, usar “Salvar configurações”.

Não fixar valores trabalhistas universais a partir de um texto de interface. O plano visual preserva as regras existentes; eventuais mudanças de cálculo precisam de especificação e validação própria.

### 6.8 Fechamento — E/fechamento

Fluxo existente a preservar: **Rascunho → Em revisão → Aprovado → Fechado**. Reabertura segue autorização e motivo, sem contornar histórico.

- Contexto: competência e intervalo real do ciclo, empresa e estado de fechamento.
- Resumo/tabela: funcionário, horas trabalhadas, horas extras 50/100, noturno, falta/atraso/saída antecipada, salário/valores e totais conforme contrato.
- Gerar fechamento; recalcular quando permitido; abrir funcionário; baixar PDF individual/coletivo conforme controles; ajustar valores com motivo; enviar para revisão; aprovar; fechar; reabrir; excluir rascunho elegível.
- Campos do ajuste: rubrica/valor ou minutos, salário e respectivos adicionais/descontos disponíveis; motivo obrigatório. Mostrar valor anterior, novo e impacto quando fornecido/calculado pelo servidor.
- Corrigir `prompt` e `window.confirm` com diálogos reais; manter restrições de estado. Pagamento/fechamento protegido não pode ser editado com mudança só do front.
- Estados claros quando regras, escala ou batidas faltarem. “Preparar fechamento” leva ao período certo, não executa fechamento irreversível sem revisão.
- Prevenir geração duplicada por clique/retry; alteração concorrente exige recarregar/reconciliar.

### 6.9 Documentos — E/documentos

- Competência/ano e lista de fechamentos/documentos disponíveis.
- Gerar/baixar folha de ponto individual, coletivo e documentos de fechamento conforme API.
- Mostrar tipo, período, empresa, funcionário quando aplicável e estado de disponibilidade.
- Atualizar anos de forma dinâmica; a lista fixa até 2026 não pode impedir uso futuro.
- Botões de geração e download independentes; loading por documento, erro recuperável, autorização de PDF testada.

### 6.10 Registrar ponto — D/time-track/clock-in

- Preservar relógio, próximo tipo de batida, localização/GPS, geofence e fluxo facial quando obrigatório.
- Estados: solicitando localização/câmera, permissão negada, fora da área, dispositivo indisponível, primeiro cadastro facial, reconhecimento, enviando, confirmado e erro.
- Ação principal indica o tipo: Registrar entrada, Iniciar intervalo, Retornar do intervalo ou Registrar saída, conforme sequência real.
- Lançamento manual: tipo, motivo, data e horário; abrir/fechar, enviar; não criar uma brecha quando biometria for requisito.
- Alteração da obrigatoriedade de biometria aparece apenas para administração autorizada e é separada da ação pessoal de registrar ponto.
- Voltar à folha de ponto; estado “este perfil não registra ponto” com saída útil.
- Dados biométricos/geográficos tratados com proteção e política existentes. Não prometer operação offline ou reconhecimento infalível.

### 6.11 Responsividade e aceite do módulo

- Celular: seletor de subaba, dia/agenda e detalhe completo; mês alternativo acessível; batida com uma ação clara e orientação de permissões.
- Notebook: calendário mensal sem células com fontes minúsculas; equipe e ponto com scroll contido.
- PC: calendário/equipe + detalhe e tabela de fechamento ampla.
- Testar: atribuição, exceção, lançamento manual, troca, ocorrência, feriado, fechamento em todas as transições, reabertura e cada documento. Totais consistentes entre Dashboard, Ponto, Fechamento, Folha e Contabilidade.

## 7. Férias — D/vacations

### 7.1 Visão e dados

- Cabeçalho Férias, competência/escopo quando aplicável e ação Nova solicitação.
- Abas existentes: Ativas, Recusadas, Histórico e Avisos, com contagens coerentes com o filtro.
- Solicitações: funcionário, período aquisitivo, início/fim, dias, venda/abono quando aplicável, observação, status e ações.
- Avisos: elegibilidade, saldo e prazos retornados pelo sistema. Distinguir prazo informativo de impedimento real.
- Visão individual e equipe usam a mesma linguagem, mas escopo e ações diferentes.

### 7.2 Formulário, ações e controles

- Novo: funcionário, período aquisitivo, início, fim, cálculo de dias, observação e opção de venda/abono atualmente prevista.
- Explicar saldo, elegibilidade, conflito e impedimentos com dados reais. Não repetir como regra universal as frases fixas de prazo hoje presentes sem reconciliar com backend.
- Solicitar; Cancelar; Fechar; alterar funcionário/datas; marcar opção permitida.
- Aprovar individual; Rejeitar; selecionar pendentes; selecionar conjunto; Aprovar selecionadas; resultado por solicitação.
- Seleção em lote só inclui pendentes elegíveis. Erro parcial não anuncia todas aprovadas.
- Baixar recibo/documento oficial, com loading por registro, requisito claro e erro recuperável. Preservar proteção de endpoint e tipo de documento.
- **Novo condicionado**: motivo de rejeição e cancelamento de solicitação só viram ação ativa se contrato suportar e política for definida; não inventar mutação no redesign.

### 7.3 Responsividade e aceite

- Celular: lista cronológica com funcionário/status/datas/dias; formulário de uma coluna, saldo legível; lote com barra segura.
- Notebook: tabela e drawer; PC: tabela e resumo de avisos sem duplicação.
- Aceite: solicitar/aprovar/rejeitar/lote/recibo, saldo e período, próprio funcionário vs equipe, conflitos e bloqueios testados.

## 8. Gestão — G e suas cinco subabas

`G` redireciona para Agenda. Subnavegação: Agenda, ASO, Comunicados, Folha de pagamento, Admissão. O nome “Admissão” pode apresentar “Onboarding” como apoio, não depender de termo em inglês.

### 8.1 Agenda — G/agenda

- Visões existentes: Calendário e Kanban; no mobile adicionar/usar agenda diária acessível equivalente.
- Filtros: status, tipo de evento e funcionário; navegação mês anterior/próximo.
- Kanban: atrasados, hoje, semana, futuros e concluídos conforme retorno existente; não fingir drag-and-drop implementado.
- Formulário: título, tipo, status, prioridade, início, fim, funcionário e descrição.
- Tipos existentes: reunião, ligação, tarefa interna, prazo administrativo, retorno ao colaborador, documento pendente e outros.
- Ações: Novo compromisso, mudar visão/filtro/período, abrir detalhe, Editar, Concluir, Excluir, Salvar, Cancelar, Fechar.
- Validar fim/início, datas/fuso, prioridade e vínculo; excluir com identificação do evento e confirmação.

### 8.2 ASO — G/aso

- Indicadores/alertas por situação, vencimento e resultado conforme dados.
- Filtros: tipo, status e funcionário.
- Formulário em seções Identificação/Clínica: funcionário, tipo de ASO, status, resultado, data/hora do exame, validade, clínica, endereço, médico e observação.
- Ações: Agendar ASO/Novo ASO, Editar, Cancelar ASO, Excluir, Baixar PDF, Salvar, Cancelar edição, Fechar.
- Botões de cancelar/excluir precisam de label, não apenas ícone/X. Cancelamento do ASO não se confunde com fechar modal.
- Estado admissional/resultado Apto influencia admissão conforme backend. Mostrar consequência e atualizar cadastro/avisos; não ativar funcionário a partir de uma mensagem visual.
- Documentos médicos/resultados só para papéis autorizados; não exportar dados sensíveis em listagem pública.

### 8.3 Comunicados — G/notifications

- Lista de comunicados/notificações e acompanhamento de ciência/respostas quando disponível.
- Campos: título, tipo (comunicado/promoção/advertência/suspensão conforme enums), conteúdo, destinatários todos ou funcionário específico e exigência de ciência/termo conforme formulário existente.
- Ações: Novo comunicado, escolher destinatários, Enviar, Cancelar, abrir detalhe, consultar respostas/ciência e Baixar termo/PDF quando elegível.
- Diferenciar enviado, recebido, lido e respondido; não apresentar ciência comprovada só porque abriu tela.
- Sino da topbar e alias `D/notifications` usam destino/contexto consistentes. Badge de não lidas só aparece com dado real; marcar leitura é novo se não houver endpoint.

### 8.4 Folha de pagamento — G/payroll

- Acesso atual da tela: DEV/ADMIN/RH. Conferir API e manter exclusões até decisão explícita; CEO usa Contabilidade global se autorizado, não recebe o fluxo empresarial por inferência.
- Filtros: ano e mês. Indicadores: funcionários calculados, bruto, líquido e folhas aprovadas.
- Listagem por funcionário: competência, salário base/bruto/líquido, descontos/adicionais e status conforme contrato.
- Calcular folha: escolher funcionário e competência; calcular; cancelar/fechar. Cálculo coletivo é novo se não houver endpoint atual.
- Aprovar folha em rascunho; Marcar como paga quando aprovada; Excluir rascunho permitido; detalhes e feedback por linha.
- Corrigir/adaptar nomes de campos entre frontend e API, incluindo INSS/IRRF/FGTS (`inssAmount`, etc.) antes de confiar em totais.
- Marcar pago é registro operacional, não transferência bancária. O texto deve esclarecer isso.
- Holerite/PDF só será botão ativo depois de confirmar endpoint e conteúdo oficial aplicável; não inferir que toda folha já gera documento.

### 8.5 Admissão — G/onboarding

**Esqueleto no frontend**: existe “Novo onboarding” sem handler suficiente. Existe controlador de servidor com listar, obter por funcionário/ID, criar fluxo, concluir tarefa e excluir.

Entrega proposta com suporte nesses endpoints:

- Listar processos por funcionário, estado e pendências retornadas.
- Novo processo: selecionar funcionário elegível e criar; indicar se já existe fluxo.
- Abrir processo: checklist de tarefas reais; dados/ASO/documentos relacionados por links existentes.
- Concluir tarefa com confirmação/contexto; atualizar progresso com resposta do servidor.
- Excluir processo apenas quando permitido, deixando claro que não é excluir o funcionário.
- Reabrir tarefa, modelos personalizados, assinatura e upload de documentos no checklist são **novos dependentes**: não estão comprovados por esse controlador.
- Contratação pelo funil de vagas deve abrir o mesmo processo, não criar outro sistema de admissão.

### 8.6 Responsividade e aceite

- Celular: agenda em lista, cartões de ASO/comunicado/folha e checklist de admissão; todas as ações acessíveis.
- Notebook/PC: calendário ou kanban contido, tabelas e drawer padrão.
- Aceite por subaba: criar/editar/concluir/excluir compromisso, ASO e PDF, enviar comunicado e registrar ciência, calcular/aprovar/pagar folha, criar/concluir processo de admissão. Autorizações e transições cruzadas testadas.

## 9. Usuários — D/users

### 9.1 Listagem e controle de acesso

- Indicadores de usuários e situação; definir escopo da empresa ou global conforme função.
- Busca/filtros existentes por nome/e-mail, empresa, perfil, status e vínculo; paginação conforme código/API.
- Dados: nome/e-mail, empresa, perfil, ativo/bloqueado, vínculo com funcionário, último acesso e criação quando permitido.
- Ações de cabeçalho: Novo usuário. Ações da linha: abrir detalhe, editar, redefinir senha, bloquear/desbloquear, documentos/histórico e excluir conforme menu existente.
- Proteger própria conta e contas críticas; role disponível para criação/edição é decidido pelo backend, não só array no modal.

### 9.2 Novo usuário

- Campos: empresa quando criação global, nome completo, e-mail, perfil de acesso, senha temporária e confirmação conforme mecanismo existente.
- Política consistente com servidor; acesso temporário obriga troca real no primeiro login.
- Forma automática de gerar senha só é mostrada se implementada. Não informar senha gerada que nunca foi persistida.
- Ações: Criar usuário, Cancelar, Fechar; sucesso com resumo seguro; Criar outro; Fechar sucesso.
- Não copiar/expor senha sem decisão consciente de segurança e expiração. Dados sensíveis não aparecem em logs/toasts/URL.

### 9.3 Drawer com quatro abas

| Aba | Conteúdo e controles |
| --- | --- |
| Geral | Nome, e-mail e perfil editáveis; empresa, último acesso e criação informativos; Salvar alterações apenas quando mudou |
| Permissões | Usar padrão do perfil ou personalizadas; grupos de checkboxes; Restaurar padrão; Salvar permissões; informar alterações pendentes |
| Segurança | Redefinir senha temporária, bloquear/desbloquear; explicar efeito sobre sessão conforme API |
| Vínculo | Funcionário associado e status; Abrir cadastro do funcionário correto ou Ir para Funcionários; não alegar vínculo criado por mera navegação |

Correção: “Abrir cadastro do funcionário” hoje navega para a lista genérica; levar ao ID correto/dossiê ou editor autorizado.

### 9.4 Controles auxiliares e aceite

- Reset de senha: nova temporária, confirmação, mostrar/ocultar, redefinir/cancelar/fechar; não alterar permissões por acidente.
- Histórico e termo/PDF existentes: download autorizado, labels corretos e contexto.
- Bloquear, excluir e restaurar permissões com confirmação apropriada. Restaurar padrão deve deixar explícito se só alterou rascunho ou já salvou.
- Celular: cards e drawer tela cheia; abas em seletor acessível. Notebook/PC: tabela e drawer lateral.
- Aceite: usuário criado entra e troca senha; bloqueio efetivo; permissão muda após refresh seguro; vínculo correto; nenhum papel ganha menu/API indevido em outra largura.

## 10. Vagas e recrutamento — D/jobs

### 10.1 Central de vagas

- Indicadores: abertas, rascunhos, encerradas, candidaturas e etapas que exigem atenção quando retornados.
- Busca: título, local, tipo de contrato e benefícios conforme comportamento existente; filtros/abas por status.
- Vaga: título, localização, vínculo, faixa salarial, status, quantidade de candidaturas e data de atualização/publicação quando disponível.
- Ações: Nova vaga, Editar, Abrir funil, Pré-visualizar, Copiar link público, Publicar, Encerrar, Excluir, atualizar/limpar filtros quando disponíveis.
- Publicar não significa contratar; encerrar não apaga candidaturas. Excluir precisa de regra/impacto claro.

### 10.2 Formulário de vaga

- Título, localização, tipo de contrato, faixa salarial, status, descrição e benefícios. Descrição tem limite observado de 6.000 caracteres; confirmar contrato e mostrar contador quando útil.
- Benefícios hoje separados por vírgula podem virar chips sem alterar representação esperada na API.
- Salvar vaga/Salvar alterações; Cancelar; Fechar; validação por campo.
- Não tornar campos de salário numéricos rígidos se o contrato permite texto/faixa negociável; tratar apresentação e dado canônico corretamente.

### 10.3 Funil — D/jobs/[jobId]

Etapas existentes: Inscritos, Em análise, Entrevista, Proposta, Contratados e Reprovados, respeitando enums atuais.

- Cabeçalho: vaga/status, link público e retorno à lista.
- Cartões: nome, contato permitido, data, etapa, origem/observação conforme dados existentes.
- Mudar etapa por seletor; selecionar candidatos; atualizar etapa em lote; cancelar seleção; mostrar resultado por item.
- Abrir candidato; baixar currículo; links de e-mail/telefone/LinkedIn; histórico/timeline quando retornados.
- Contratar: revisar alvo e dados; confirmar criação/vínculo de funcionário em admissão; redirecionar para processo/cadastro correto.
- Não presumir drag-and-drop: se for novo, manter seletor acessível equivalente e regras do servidor.
- Falhas de currículo/vínculo não apagam candidatura. Contratar em retry não cria funcionário duplicado.

### 10.4 Portal público de carreiras

Rotas: `/carreiras`, `/carreiras/[companyId]`, `/carreiras/[companyId]/[jobId]`.

- Hub de empresas/vagas: busca, filtros, paginação e acesso à empresa/vaga conforme componentes existentes.
- Página da empresa: marca/logo, descrição, vagas e filtros; mesmas tipografia/inputs/botões do sistema, sem sidebar de aplicação autenticada.
- Detalhe da vaga: descrição, benefícios, local, salário/vínculo conforme publicação; Voltar/Ver outras vagas.
- Candidatura: nome, e-mail, telefone, LinkedIn opcional, apresentação opcional até 1.500 caracteres, currículo PDF/DOCX até 5 MB e aceite/declaração pertinente.
- Controles: Anexar/substituir/remover currículo, Enviar candidatura, Tentar novamente, Ver outras vagas/empresas; sucesso real e prevenção de duplicidade.
- Preservar honeypot/medidas antiabuso, sanitização e consentimento/aviso do fluxo. Não alegar certificação ISO apenas por citar número na política. Retenção de currículo deve refletir política e mecanismo efetivos, não promessa fixa sem validação.

### 10.5 Responsividade e inovação útil

- Celular: vaga em card; funil por etapa selecionada, com contadores e mudança acessível; candidato em tela cheia.
- Notebook: kanban dentro do conteúdo sem esmagar seis colunas; drawer mantém contexto.
- PC: funil amplo, ações em lote claras e candidato ao lado.
- Inovação proposta: “Próxima ação” por candidato/etapa quando houver dado objetivo; evitar ranking automático/opaco de pessoas como parte do redesign.
- Aceite: publicar/refletir no público, candidatar com arquivo/consentimento, mover etapa/lote, baixar currículo autorizado, contratar e abrir admissão sem duplicação.

## 11. Configurações — D/settings

Manter as seis áreas existentes; substituir mosaico incoerente por navegação de módulo/seções persistidas na URL. Links vindos de perfil, bloqueio e outras páginas abrem a seção certa.

### 11.1 Segurança e acesso

- Senha atual, nova senha, confirmação; mostrar/ocultar individual; requisitos e erro.
- Salvar/Alterar senha e cancelar/resetar edição quando implementado.
- Política de senha consistente com backend. A indicação de 10 caracteres não pode contradizer validação diferente em criação/reset de usuários/empresas.
- Explicar efeito sobre outras sessões conforme contrato real; não prometer encerramento global sem API.

### 11.2 Acessos de funcionários

- Busca por nome/matrícula; seleção do funcionário/vínculo.
- Nova senha temporária, confirmação e mostrar/ocultar; Redefinir; Cancelar.
- Unificar a mutação/modal com Usuários. Selecionar funcionário sem conta mostra orientação correta, não reset fictício.
- Permissão específica para reset; gestor/funcionário/consulta não recebem a função por acessar Configurações.

### 11.3 Financeiro e faturamento da empresa

- Situação da assinatura, plano, limite/consumo e pendências da empresa autenticada.
- Faturas: valor, vencimento, situação, link de pagamento e documentos fiscais disponíveis.
- Pagar fatura; Ver fatura; Alterar plano; escolher plano; Confirmar alteração; Cancelar troca.
- NF PDF e NF XML só quando há arquivos/dados realmente disponíveis e download autorizado.
- Mudança de assentos possui endpoint de servidor; expor controle aqui é **Novo**, condicionado a política e teste de preço/prorrata/limites. Não duplicar a cobrança global.
- Cobrança bloqueada tem caminho administrativo para resolver; cliente não recebe acesso ao financeiro de outras empresas.

### 11.4 Planos e limites

- Plano atual, recursos, limites e consumo com dados reais.
- Ver opções de planos e navegar para alteração onde permitido.
- Não confundir preço base com preço por usuário/adicionais; usar a mesma fonte de precificação do backend.
- Usuário sem direito financeiro vê informação permitida, não ação de mudar plano sem API autorizada.

### 11.5 Configurações da empresa

- Identidade: nome, razão social, CNPJ, contatos e e-mail/telefone conforme cadastro existente.
- Endereço: CEP, logradouro, número, complemento, bairro, cidade, estado.
- Inscrições municipal/estadual e dados de representante legal conforme formulário.
- Logo: URL/upload conforme mecanismo, prévia, substituir/remover e fallback.
- Salvar configurações, cancelar/restaurar rascunho quando implementado; validação e erro por campo.
- Informações de ponto/geofence/biometria/ciclo existentes em outros módulos devem ter um único editor canônico ou links contextualizados, não valores diferentes em dois formulários.
- Atualização de logo/nome reflete topbar, documentos e áreas públicas onde o contrato exigir.

### 11.6 Importação e exportação

- Exportações existentes: funcionários, pontos, férias e usuários em CSV conforme endpoint e autorização.
- Importação/modelo XLSX de funcionários: reutilizar o mesmo componente/fluxo da tela de importação.
- Selecionar dataset/período quando permitido, gerar/baixar, importar e acompanhar resultado.
- Exibir escopo e conteúdo do arquivo antes da exportação. Dados sensíveis exigem permissão; proteger CSV contra fórmula quando aplicável.

### 11.7 Responsividade e aceite

- Celular: seletor/índice de seis seções, formulário uma coluna e ações seguras.
- Notebook/PC: navegação de seção e conteúdo com largura confortável; não uma terceira sidebar global.
- Aceite: senha/reset, empresa/logo, importar/exportar, fatura e troca de plano; role correto em cada seção; URL profunda e retorno funcionando.

## 12. Suporte do cliente — D/support

### 12.1 Visão do cliente

- Resumo de situação dos chamados, busca por código/assunto/empresa/responsável quando autorizado e filtro de status.
- Lista: número, assunto, status, prioridade, autor, empresa, responsável e atualização.
- Ações: Abrir novo chamado, Atualizar, Abrir detalhes; limpar filtros quando implementado.
- Distinguir cliente e operação: o componente atual separa a experiência conforme perfil; preservar isolamento ao consolidar estilo.

### 12.2 Novo chamado — wizard

- Categorias existentes: acesso e senha; erro/instabilidade; financeiro e assinatura; sugestão de melhoria; outra dúvida.
- Prioridade/impacto: baixa, normal, alta, crítica, com descrição; servidor pode validar/reclassificar.
- Título, descrição e anexos; manter regras reais de tamanho/tipo/quantidade e explicar antes de anexar.
- Etapas: categoria/impacto → descrição/anexos → revisão/confirmar conforme estrutura atual; se reorganizar, preservar tudo.
- Controles: escolher categoria/prioridade, Avançar, Voltar, selecionar/remover anexo, Abrir chamado, Cancelar/Fechar.
- Erro preserva conteúdo/arquivos elegíveis; envio duplicado não gera dois tickets.

### 12.3 Detalhe e conversa

- Cabeçalho com número, assunto, empresa/status/prioridade e responsável.
- Histórico de mensagens, autor/data e anexos; reply em textarea.
- Enviar resposta; baixar anexo autorizado; Encerrar chamado com confirmação; Continuar atendendo; Reabrir; Abrir novo chamado; Fechar drawer.
- Anexos: Verificado, Em verificação, Bloqueado. Arquivo em quarentena não deve ser baixado como limpo só porque a UI não desabilitou; servidor é a barreira.
- Sem mostrar nota interna na visão do cliente.
- SLA só é informado com cálculo/contrato real; não prometer prazo inventado. Erro de conversa não deve perder resposta digitada.

### 12.4 Responsividade e aceite

- Celular: lista → detalhe tela cheia → resposta e anexos acessíveis com teclado aberto.
- Notebook/PC: lista e drawer/painel de conversa; largura sem headers gigantes.
- Aceite: abrir/responder/anexar/download limpo/encerrar/reabrir, autorização por empresa, notas internas invisíveis, fila operacional refletida.

## 13. Plataforma — P e todas as subpáginas

Plataforma é a operação global, não Configurações da empresa. Não mostrar controles globais a ADMIN/RH só porque o menu antigo permite um link. Os controladores examinados de Plataforma/Financeiro declaram DEV/CEO/COMERCIAL em determinadas leituras e restringem mutações por endpoint. A matriz precisa ser reconciliada em vez de generalizar um papel para todo o módulo.

### 13.1 Visão geral — P

- Indicadores reais de empresas, empresas ativas/suspensas/inadimplentes, usuários, funcionários e financeiro conforme fontes autorizadas.
- Fila operacional com pendências e atalhos por objeto: empresa, assinatura, cobrança, chamado ou contabilidade.
- Ações existentes de navegação para empresas, financeiro, inteligência, auditoria, suporte e demais áreas autorizadas.
- “Nova empresa” abre criação real ou navega com parâmetro que abre o formulário; hoje o destino de lista não deixa claro esse resultado.
- Atualizar dados; contexto global explícito; números sem dados não viram zeros de saúde.
- Evitar cabeçalho de marketing gigante; priorizar trabalho e problemas a tratar.

### 13.2 Empresas — P/companies

Listagem:

- Busca por nome/CNPJ/contexto; filtros de plano/status quando suportados; paginação e indicadores com escopo correto.
- Linha: nome/CNPJ, plano, faturamento/situação, limites/consumo de usuários e funcionários, módulos e datas relevantes quando fornecidos.
- Ação principal Nova empresa; detalhe e menu por empresa.

Todos os comandos existentes do menu:

1. Detalhes e resumo.
2. Editar empresa.
3. Usuários da empresa.
4. Assinatura e plano.
5. Acessar como cliente, apenas acesso assistido autorizado.
6. Suspender/Ativar.
7. Arquivar, distinguindo cancelamento lógico de exclusão.
8. Excluir definitivamente com confirmação reforçada, dependências e autorização real.

Criação:

- Nome, CNPJ/consulta cadastral, identificador/slug quando exigido, plano, limite de usuários e funcionários, administrador com nome/e-mail/senha conforme formulário.
- Lookup com progresso/erro, correção manual e política de senha coerente com backend; não usar label “8 caracteres” se a API exige mais.
- Criar empresa, Cancelar, Fechar, resultado e abertura da empresa criada.

Edição/consolidação:

- Existem modais de edição e gerenciamento parcialmente sobrepostos. Consolidar uma única ficha com Dados, Plano/limites, Módulos, Faturamento e Notas internas, preservando todos os campos.
- Nome/CNPJ, limites, plano, estado de cobrança, fim de teste, módulos ativos, referências externas autorizadas e notas internas conforme contrato atual.
- IDs Asaas só editáveis quando API/segurança permitirem; não expor como campo livre para todo operador.
- Gerar contrato PDF deve seguir o fluxo canônico de contratos, não criar contrato silenciosamente só para imprimir.
- Controles: Salvar empresa, Cancelar, selecionar seção, gerar/baixar documento e abrir links externos autorizados.

### 13.3 Ficha da empresa — P/[companyId]

- Header: empresa, CNPJ, plano/status, retorno para **Empresas** (corrigir retorno atual que vai para raiz de Plataforma).
- Seções de dados gerais, usuários, assinatura, faturas, auditoria, contratos e suporte de acordo com dados/controles existentes.
- Preservar seleção por `?tab=...`; validar valor desconhecido com fallback, sem tela vazia.
- Nova cobrança manual: valor, vencimento e descrição; gerar/enviar conforme política, Cancelar e Fechar.
- Gerar checkout: aparece só para papel autorizado; controlador examinado restringe o endpoint global de checkout a DEV.
- Copiar link de cobrança, Abrir cobrança, Ver planos/preços, Gerenciar contratos e Abrir suporte filtrado pela empresa.
- Usuários da empresa: listar, Novo usuário, Editar, Remover com confirmação; campos nome/e-mail/perfil/senha quando exigida/ativo conforme formulário, respeitando restrições de papel.
- Unificar criação/edição com biblioteca de Usuários, sem criar modal de senha/permissão com padrão divergente.
- Falha em suporte/contratos não apaga a ficha inteira; consultas independentes com estado e retry.

### 13.4 Financeiro global — P/finance

Resumo e filtros:

- MRR contratado, faturado, recebido, a receber e em atraso. Identificar período e definição de cada indicador.
- Busca por empresa/CNPJ, status, início/fim e paginação. Situação: em aberto, pago, vencido, cancelado, conforme enum.
- Distinção entre cobranças enviadas ao Asaas, locais e em revisão. Valor do banco/provedor não é inferido do frontend.

Cobranças e ações:

- Nova cobrança: empresa, valor, vencimento, descrição, tipo de cobrança e enviar ao Asaas ou local, conforme contrato.
- Salvar cobrança/Salvar alterações; Cancelar/Fechar.
- Abrir detalhe, Editar, Copiar link, Abrir cobrança, Excluir/cancelar conforme comportamento real, Reembolsar e Sincronizar.
- Reembolso exige alvo/valor/estado e confirmação; retry não pode duplicar reembolso. Não confundir excluir registro local com cancelar cobrança externa.
- Atualizar lista; Anterior/Próxima; estados por ação/linha.
- Exportar demonstrativo PDF/HTML e CSV. **Correção**: “Extrato bancário (CSV)” hoje não comprova extrato de banco; usar “Exportar cobranças (CSV)” ou nome que corresponda ao dataset.

Integração/auditoria:

- Lista de eventos webhook com pendente/falha/processado, dado de evento, data e erro permitido.
- Atualizar eventos; Reprocessar evento apenas para DEV conforme endpoint examinado, com confirmação e resultado.
- Auditoria financeira com atualizar, filtros/escopo conforme API; não expor segredos de payload ao cliente.
- Papel COMERCIAL não recebe Editar/Reembolsar por ter leitura do módulo. Conciliar controles com decorators de endpoint.

Fiscal:

- Cobrança/fatura não é nota fiscal. Listar número/arquivos fiscais existentes não equivale a emitir NFS-e.
- Emissão, alteração fiscal, cancelamento/substituição e envio fiscal são dependências próprias descritas em Contabilidade; não adicionar botão de sucesso sem integração.

### 13.5 Assinaturas — P/subscriptions

- Indicadores e ciclo operacional: teste, aguardando pagamento, ativo, em atraso, cancelado e outras situações retornadas.
- Busca por empresa/plano/contexto; filtro de status; Limpar filtros; Atualizar contexto.
- Detalhes: plano, preço/assentos, limites, próximo vencimento, consumo, vínculos Asaas e histórico/auditoria conforme dados.
- Ações existentes: Detalhes, Fechar, Abrir cliente no Asaas, Abrir empresa, Ver financeiro, Gerar cobrança quando autorizado.
- **Novo com endpoint existente**: Pausar/Retomar cobrança possui rotas de servidor para DEV/CEO; projetar confirmação, motivo/política e consequência sobre acesso antes de expor.
- Não confundir pausa da cobrança, suspensão do acesso e cancelamento da assinatura. Cada ação mostra o que muda.
- Remover títulos promocionais e textos longos que empurram a tabela para baixo; tornar o ciclo um resumo compacto.

### 13.6 Planos — P/plans

- Lista/cards com nome, preço/ciclo, limites, módulos, ativo/inativo, gratuito/oculto e número de vínculos quando retornado.
- Buscar; Mostrar/Ocultar inativos; Novo plano; Editar; Desativar; Reativar; Excluir conforme elegibilidade; Ver assinaturas.
- Formulário: nome, descrição, preço, ciclo, máximo de usuários/funcionários, gratuito, oculto e módulos contratáveis conforme campos atuais.
- Existem informações de preço base/adicional por usuário em versões do contrato. Reconciliar com o cálculo real antes de redesenhar cards ou prometer preço final.
- Salvar plano, Cancelar e Fechar; validação de limites/valores e conflito com assinaturas existentes.
- Não tratar desativação como exclusão de clientes; explicar manutenção das assinaturas vinculadas conforme regra.

### 13.7 Contratos — P/contracts

- Indicadores de ativos, encerrados, cancelados e receita contratada conforme dados; filtros de status e empresa quando suportados.
- Formulário existente: empresa, plano, assentos, valor acordado, início/fim, forma de pagamento, status, número externo, URL do documento e motivo/observações.
- Ações: Novo contrato, Salvar contrato/Salvar alterações, Limpar edição/Cancelar, Atualizar, Detalhes, Editar, Gerar/baixar PDF, Abrir documento, Excluir.
- Validar período, URL/documento, valores e observações obrigatórias conforme serviço.
- Documento externo, contrato comercial e cobrança são objetos diferentes. Não indicar assinatura digital concluída sem evidência.
- PDF autorizado e consistente com empresa/negociação; excluir com impacto e auditoria conforme contrato.

### 13.8 Propostas — três páginas

**Lista — P/proposals**

- Empresa, título, valor/plano, status e atualização conforme retorno.
- Nova proposta, Atualizar, Abrir detalhe; busca/filtro é nova se não existir comportamento correspondente.

**Nova — P/proposals/new**

- Empresa cliente, título, data de início, descrição, tipo de plano, mensalidade, limite de usuários e funcionários.
- Criar proposta, Cancelar/Voltar. Campos e preço coerentes com plano/negociação e papel autorizado.

**Detalhe — P/proposals/[id]**

- Conteúdo e estado da proposta, aceite/identidade/data quando retornados e link de pagamento.
- Enviar ao cliente; reenviar só se política permitir; Abrir pagamento; Voltar.
- Atualizar status real após envio/aceite. O aceite pelo cliente continua no `ProposalGate` com nome, e-mail e checkbox de termos, sem sucesso antecipado.

### 13.9 Configuração global — P/configuration

- Hub de operações globais com destinos existentes: empresas, planos, permissões, assinaturas, acessos, integrações, auditoria e respectivas pendências.
- Indicadores são links para resolver com filtro/contexto correto; não cards de decoração.
- Corrigir acentos e títulos; padronizar labels com os destinos reais.
- Não duplicar Configurações da empresa. Breadcrumb “Plataforma / Configuração global”.

### 13.10 Permissões globais — P/permissions

- Perfil selecionado, grupos de permissões e busca; rascunho distinto da versão salva.
- Checkboxes por permissão; marcar todas do grupo; limpar grupo; restaurar padrão; salvar; cancelar alterações.
- DEV somente quando contrato exigir. Nunca conceder esse editor a CEO/COMERCIAL por serem internos.
- Aviso de alterações pendentes e de impacto do salvamento; revisão antes de alteração que afete muitos usuários.
- Perfil `role` e permissão customizada têm origem única. Menu/guard/servidor refletirão política efetiva, sem manter arrays contraditórios.

### 13.11 Acessos — P/access

- Consulta de usuários/sessões/acessos online e últimos eventos conforme dados atuais.
- Busca por usuário, empresa ou perfil; identificadores/datas/status técnicos com labels legíveis.
- Não adicionar “derrubar sessão” ou bloquear conta em painel read-only sem endpoint e autorização próprios.
- Atualizar e filtro/paginação podem ser novos conforme suporte da API; indicar ausência de dados, não “todos offline” quando houve erro.

### 13.12 Cupons — P/coupons

- Lista de cupons com código, descrição, dias de teste, limite de uso, usos e validade/estado conforme retorno.
- Campos: código, descrição, dias de teste, máximo de resgates, início e expiração.
- Criar cupom, Editar, Salvar alterações, Limpar edição, Ativar/Desativar.
- Validar datas/limites/código duplicado; explicar efeito sobre resgates anteriores. Nunca transformar cupom de teste em desconto financeiro sem novo contrato.
- Corrigir “trial” para “período de teste” na escrita destinada ao cliente.

### 13.13 Auditoria — P/audit

- Filtros por empresa, evento/tipo, ator/busca e período conforme retorno; paginação.
- Dados: autor, ação, alvo, empresa, data/hora, IP/dispositivo e detalhes permitidos.
- Indicadores de eventos/falhas/alterações e termos conforme fonte, sem prova fictícia de auditoria completa.
- Atualizar/Tentar novamente, Exportar CSV, página anterior/próxima e abrir detalhes quando implementado.
- Logs são consulta, não editáveis. Dados sensíveis/segredos/payloads são minimizados; exportação autorizada e coerente com filtro.
- “Antes/depois” aparece somente se efetivamente registrado. Se falta, planejar ampliar a trilha no backend em tarefa explícita.

### 13.14 Inteligência operacional — P/intelligence

- Listar empresas, plano/situação e análises de risco/resumo via endpoints de IA existentes.
- Busca por empresa/CNPJ; Atualizar dados; Analisar risco; Reanalisar; Abrir empresa.
- Estados individuais: não analisada, analisando, análise disponível, indisponível/erro e informação desatualizada quando houver timestamp.
- **Correção**: empresas sem análise não podem ser somadas automaticamente como “saudáveis”. Mostrar “Não analisadas” separadamente.
- Exibir limites/contexto do resultado como auxílio de decisão, não garantia ou diagnóstico definitivo. IA não suspende cobrança/empresa automaticamente neste redesign.
- Remover bounce/pulse constante; tom semântico por resultado real, explicação e data quando disponíveis.

### 13.15 WhatsApp — P/whatsapp e D/whatsapp

Uma única implementação reutilizada, não dois chats.

- Estado de conexão, QR code, iniciar conexão, atualizar QR/status e desconectar com confirmação.
- Conversas: busca, Todos/Não lidas/Grupos; selecionar conversa; avatar/fallback, último texto, horário e contador.
- Thread: voltar à lista, histórico, mensagens/arquivos, compositor, anexar/remover arquivo, texto/legenda e Enviar.
- Regras de arquivo, autorização e confirmação de envio reais; erro preserva rascunho.
- O ícone de áudio/microfone sem handler não é uma função pronta: implementar com contrato ou retirar o affordance ativo, registrando no backlog.
- Celular: lista e conversa em telas sequenciais; notebook/PC: dois painéis, dentro da mesma shell.

### 13.16 Suporte operacional — P/support

- Visível apenas para papel operacional autorizado; no recorte atual o fluxo de notas internas é DEV.
- Abas/filas: Todos, Sem responsável, Críticos/altos, SLA em risco, Reabertos; contagens com fonte e escopo corretos.
- Busca por número/assunto/empresa; Atualizar; Tentar novamente; abrir ticket.
- Estados: Novo, Em triagem, Em atendimento, Aguardando cliente, Aguardando deploy, Resolvido, Fechado e Reaberto.
- Detalhe com dados do cliente/empresa, histórico, anexos, responsável e datas/SLA quando fornecidos.
- Resposta pública vs Nota interna claramente separadas; envio público não herda o flag interno de outro chamado.
- Ações: Enviar resposta pública, Salvar nota interna, anexar/remover/baixar arquivo autorizado, Assumir chamado, Resolver, Reabrir, mudar estado conforme fluxo, Fechar detalhe, Abrir empresa.
- **Correção de rota**: link atual da empresa não inclui tenant e usa `companies/[id]`, enquanto ficha existe em `P/[companyId]`. Usar helper canônico.
- Testar isolamento cliente/DEV e limpeza de estado ao trocar ticket; status e mensagens refletem na visão do cliente.

### 13.17 Responsividade e aceite de Plataforma

- Celular: navegação de módulo por grupos; lista e ficha sequenciais; dados essenciais sempre presentes, ações globais não somem para autorizado.
- Notebook: sem duas laterais largas; tabelas com scroll contido; header compacto; detalhes em drawer.
- PC: fila/lista + detalhe e gráficos operacionais; sem repetir banners de vendas em cada subpágina.
- Aceite por submódulo: operações acima testadas por endpoint/papel, contexto de empresa preservado, confirmação financeira, ausência de duplicidade e auditoria efetiva.

## 14. Contabilidade global — P/accounting

### 14.1 Objetivo e autorização

Visão de correções de todas as empresas, incluindo a própria Innovation quando cadastrada com identidade explícita. Acesso exclusivo **DEV e CEO**, tanto no menu e página quanto na API. Não dar acesso ao papel `CONTABIL` automaticamente: qualquer mudança exige decisão explícita do produto.

Contabilidade terá entrada própria no menu principal, apontando inicialmente para a rota existente. Não criar outra tela concorrente em `D/accounting` sem política de alias.

### 14.2 Existente e limites encontrados

- Existe visão geral por competência, busca/seleção de empresa, indicadores, lista de fechamentos e folhas e modais de correção com motivo.
- Endpoints examinados oferecem overview, fechamentos/folhas por empresa e ajustes de ponto/folha, restritos DEV/CEO.
- O espaço de faturamento hoje encaminha ao Financeiro. Não foi comprovado neste inventário um fluxo completo de emissão fiscal por empresa.
- Texto dizendo “valor anterior registrado” precisa ser confrontado com a trilha real: metadados de mudanças não garantem snapshot anterior completo de toda rubrica.
- Botões de foco que apenas mudam aba sem selecionar/filtrar empresa precisam abrir uma fila global efetiva ou orientar a seleção; não criar mudança invisível.

### 14.3 Visão geral e workspace por empresa

- Filtros: competência, empresa, tipo de pendência e situação quando houver dados.
- Indicadores: empresas, fechamentos em revisão, folhas pendentes, cobranças sem referência fiscal, valores a revisar conforme fonte.
- Fila de empresas: nome/CNPJ, pendências de ponto, folha, cobrança/fiscal, vencidos e estado.
- Ações: Abrir empresa, Revisar ponto, Revisar folha, Abrir financeiro da empresa, Atualizar, limpar/alterar filtros.
- Breadcrumb e cabeçalho persistente com empresa/competência; trocar empresa limpa seleção/rascunho incompatível e avisa alterações pendentes.
- Abas propostas: Visão geral, Ponto, Folha e valores, Cobranças, Fiscal e Histórico. Fiscal/Histórico completos são novos quando exigirem contratos adicionais.

### 14.4 Correção de ponto

- Listar fechamentos e respectivos estados/funcionários; abrir detalhe e identificar divergência.
- Rubricas existentes: minutos de horas extras 50/100, noturno, faltas/atrasos/saídas e salário/valores disponíveis no contrato; inventário contém os campos exatos usados hoje.
- Mostrar anterior → novo, motivo obrigatório, efeito sobre cálculo quando retornado e autor/data após salvar.
- Corrigir, Cancelar, Fechar, Salvar correção, Atualizar; abrir folha/ponto original com contexto.
- Fechamento aprovado/encerrado exige fluxo autorizado de reabertura/versionamento. O redesign não remove proteção para permitir editar.
- Evitar editar um número agregado sem deixar claro se altera a origem, ajuste ou só resumo. Reconciliação deve preservar documento/histórico.

### 14.5 Correção de folha e valores a pagar

- Campos atuais de correção: salário base, bruto, líquido, INSS, IRRF, FGTS, horas extras e adicional noturno.
- Listar funcionário, competência, estado, bruto/líquido e divergências identificadas por dados reais.
- Correção com rubrica, anterior, novo, motivo, revisão de impacto e confirmação.
- Não permitir que alterar líquido/bruto/desconto separadamente deixe totais incoerentes. Definir no backend quais campos recalculam, quais são ajustes manuais e qual regra valida a conciliação.
- Folha paga/aprovada/fechada segue restrição/versão e eventual reabertura autorizada; não apagar pagamento para facilitar edição.
- Registrar pagamento/valor a pagar não efetua transferência bancária. Integração de pagamento é outra entrega.
- Testar alteração concorrente, arredondamento, valor inválido, zero legítimo e dupla submissão.

### 14.6 Cobranças e mensalidades da própria Innovation

- Filtro explícito entre empresa operacional selecionada e receitas das mensalidades de clientes da Innovation.
- Mensalidade tem pagador, emissor/prestador, competência, valor, vencimento, pagamento, referência externa e documento fiscal quando houver.
- Reutilizar contratos/mutações de Financeiro: criar/editar cobrança, abrir/copiar link, sincronizar, cancelar/excluir/reembolsar conforme regras e autorização.
- Link para Financeiro usa tenant e filtro de empresa/competência; substituir destino relativo frágil.
- Identificar a empresa Innovation por cadastro/ID configurado, não por comparação textual com nome que pode mudar.
- Não misturar receita de mensalidade com salário/pagamento dos funcionários do cliente.

### 14.7 Fiscal: nova entrega, com dependências explícitas

O objetivo anterior inclui incluir/editar documentos por empresa e emitir nota. Este objetivo exige mais do que redesign. Antes de ativar “Emitir nota”, especificar:

1. Tipo de documento/operação fiscal e provedor suportado, sem presumir um único modelo para todas as empresas.
2. Empresa emissora/prestadora e tomadora/pagadora, dados cadastrais e inscrições/configuração exigida pelo provedor.
3. Credenciais/certificados em storage seguro do servidor; nada no JavaScript público ou no documento de planejamento.
4. Campos do serviço/itens, competência, valor, retenções/códigos e validação necessários ao contrato aprovado.
5. Fluxo de prévia/revisão, emissão idempotente, processamento, rejeição, autorização, download e envio, conforme suporte do provedor.
6. Cancelamento/substituição/correção fiscal de acordo com mecanismo realmente suportado; documento autorizado não é “editado” como formulário local.
7. XML/PDF, número, referência, protocolo/eventos e auditoria protegidos e vinculados à empresa/cobrança correta.
8. Ambiente de teste/homologação e critérios para operação real. Validar requisitos fiscais com responsável habilitado antes de produção; este plano não estabelece regras tributárias.

Incluir documento recebido/manual pode ser entrega separada: anexar arquivo, identificar empresa/tipo/número/data/valor, validar e salvar referência com trilha. Isso não pode ser rotulado como nota emitida pelo sistema.

Enquanto não houver integração concluída, comunicar “Emissão fiscal ainda não configurada” com orientação real, sem botão que só muda número local e mostra sucesso.

### 14.8 Responsividade e aceite

- Celular: fila de empresas → contexto escolhido → subaba → correção em tela cheia com anterior/novo e motivo.
- Notebook: lista e drawer ou workspace único; PC: fila + workspace, sem segunda sidebar.
- Aceite: DEV/CEO autorizados; demais papéis negados inclusive via URL/API; empresas isoladas nas consultas; campos/totais reconciliados; bloqueios de estado; trilha efetiva; mensalidades separadas; fiscal só declarado pronto após integração e homologação reais.

## 15. Portal do funcionário e páginas auxiliares

### 15.1 Portal — /[tenant]/portal e quatro subpáginas

- Início: cartões para Meu ponto, Férias, Holerites e Documentos, com informações próprias e links permitidos.
- `portal/ponto`: acesso à folha pessoal e Registrar ponto no destino canônico.
- `portal/ferias`, `portal/holerites`, `portal/documentos`: o recorte atual tem telas incompletas/estáticas; apresentar indisponibilidade honesta enquanto não integrar dados reais.
- Entrega proposta: usar os mesmos componentes do módulo correspondente com modo pessoal; período/saldo/status, download autorizado e solicitante vinculado.
- Holerites/documentos dependem da API e política de publicação; não preencher com arquivos/dados de demonstração.
- Portal terá identidade e UserMenu iguais à aplicação, com navegação reduzida por contexto, não por abandono do padrão.
- Corrigir Sair que apenas navega para login: executar logout real.

### 15.2 Fatura pendente — /[tenant]/fatura-pendente

- Situação, valor/vencimento/documento quando retornados e explicação do bloqueio.
- Pagar agora, Gerar link de pagamento, Já paguei/verificar e Sair da conta.
- Verificação só libera acesso após status confirmado no servidor; não ao clicar “Já paguei”.
- Erro, processando e link indisponível têm recuperação; repetição não gera cobranças indevidas.

### 15.3 Relatórios, desempenho, parceiros e rotas incompletas

Cobrir explicitamente: `D/reports`, `D/performance`, `D/partners`, `D/time-tracking`, `/[tenant]/clientes`, `/[tenant]/parceiros` e seus layouts.

- Relatórios: Exportar CSV sem fluxo real suficiente deve ser conectado ao dataset autorizado ou removido do estado ativo e registrado como pendência.
- Desempenho: Nova avaliação, Continuar avaliação e Ver detalhes precisam de integração real; confirmar conteúdo de demonstração e não apresentar como avaliação verdadeira.
- Parceiros: Adicionar parceiro aponta para uma criação não encontrada no manifesto; integrar/criar rota com contrato próprio ou oferecer indisponibilidade clara.
- Time-tracking legado: Bater ponto não cria um quarto fluxo; migrar para o destino canônico, preservando controle de função.
- Clientes/parceiros auxiliares: validar propósito, dados e público. Se forem módulos incompletos, não expor ações sem handler como concluídas.
- Backlog novo desses módulos terá decisão de produto; o objetivo imediato é não quebrar/duplicar o projeto ao aplicar layout comum.

## 16. Páginas públicas e autenticação

Todas herdam tokens, escrita, formulário e botões; não herdam sidebar do dashboard.

### 16.1 Site inicial e planos

Rotas: `/` e `/planos`.

- Header/logo, Benefícios, Solução, Planos, Perguntas, Acessar, Criar empresa; menu móvel equivalente.
- Conteúdo de benefícios/solução, preços reais, FAQ abrir/fechar e rodapé com Privacidade, Termos e Suporte.
- CTA Criar empresa → cadastro; Acessar → login; planos → escolha/cadastro com contexto quando suportado.
- Botão demonstrativo “Autenticar e bater ponto” sem handler não representa registro real: tornar demonstração claramente não operacional ou destino de acesso apropriado.
- Não inserir métricas, depoimentos/certificações ou alegações de eficácia inventadas. Conteúdo comercial precisa ser factual e aprovado.
- Preços da home, /planos, cadastro e alteração de assinatura usam fonte coerente; não hardcode de valores contraditórios.

### 16.2 Login — /login

- E-mail, senha, mostrar/ocultar, lembrar-me conforme implementação real.
- Acessar plataforma, Esqueci a senha, Criar conta e Voltar para o site.
- Loading, erro sem exposição de credencial, retorno autorizado ao destino original, sessão expirada e bloqueio.
- Checkbox “Lembrar-me” sem política implementada deve receber contrato efetivo, não só aparência.

### 16.3 Cadastro — /cadastro e alias /criar-conta

- Nome do responsável, empresa, CNPJ, telefone/WhatsApp, e-mail, senha/visibilidade, plano, quantidade de usuários e cupom opcional.
- Seleção de plano com preço/ciclo e recursos coerentes; criar empresa e ir para próximo estado confirmado, não dashboard antes de proposta/cobrança exigida.
- Cadastrar empresa, Fazer login e retorno; validar dados, senha, limites/cupom e resultado.
- Não exigir dados duplicados em login/cadastro sem razão; erros preservam cadastro.

### 16.4 Recuperação de acesso

Rotas: `/esqueci-senha`, `/forgot-password`, `/reset-password`.

- Consolidar uma entrada canônica em português e preservar aliases/links recebidos por e-mail.
- Solicitação por e-mail: enviar, loading, resposta não enumeradora e voltar ao login; preservar honeypot/antiabuso.
- Fluxo existente de código do gestor/identificação: e-mail, código de seis dígitos, início do CPF e matrícula conforme mecanismo atual; Validar identidade, erro e próximo passo.
- Redefinição: token/código válido, nova senha, confirmação, Salvar senha e voltar ao login; expirado/usado/invalidado com recuperação apropriada.
- Link/token de teste local não deve aparecer em produção. Política de segurança não é alterada só para reduzir etapas.
- A coexistência dos dois mecanismos é decisão de contrato: documentar público/uso e endpoints, não eliminar token enviado ao usuário sem compatibilidade.

### 16.5 Suporte público — /suporte

- Nome, e-mail, categoria, assunto e descrição; proteção antiabuso existente.
- Enviar chamado, feedback de sucesso real, Abrir outro, Voltar ao login e Ir para meus chamados se autenticado.
- **Correção**: link `/dashboard/support` não contém tenant. Resolver empresa pela sessão ou direcionar ao login com retorno seguro.
- Não mostrar arquivos/notas privadas nem presumir ticket relacionado à empresa autenticada a partir de e-mail público.

### 16.6 Termos, privacidade e erro

- `/termos`, `/privacidade`: leitura responsiva, título/data/versão quando existentes, links e retorno; mesma tipografia acessível.
- Revisão de texto não modifica obrigação jurídica/retenção/consentimento sem análise específica; corrigir codificação e clareza com rastreabilidade.
- `not-found.tsx`: voltar a contexto seguro/início e suporte; não inventar rota existente.
- Acrescentar estado de erro global/por módulo é novo quando faltar; retry sem apagar trabalho e sem expor stack/segredos.

### 16.7 Acesso assistido — /auth/ghost e /auth/ghost-init

- Iniciar/validar contexto conforme endpoint de acesso assistido; loading, erro e Fechar.
- Se `window.close` não funcionar, oferecer retorno seguro, não deixar um único botão sem saída.
- Somente papel autorizado inicia; token sensível não vai para logs/inventário ou links públicos; expiração e encerramento conforme contrato.
- Ao entrar, shell mostra empresa acessada e modo assistido; logout/saída não devem apagar ou misturar indevidamente a sessão original.

## 17. Aliases: compatibilidade sem redesign duplicado

Cobrir os arquivos de página a seguir como rotas auxiliares/reexportações existentes e verificar o destino exato no código durante a migração:

| Família | Arquivos/rotas a preservar | Destino/objetivo de consolidação |
| --- | --- | --- |
| Funcionários/RH | `D/colaboradores`, `D/rh` | Módulo correspondente existente, preservando parâmetros e intenção de acesso |
| Escalas | `D/escala` | Visão de Escalas canônica |
| Ponto | `D/ponto`, `D/time-track` | Folha de ponto/visão correspondente em Escalas |
| Fechamento | `D/time-track/closing` | Fechamento canônico |
| Ocorrências/regras | `D/time-track/occurrences`, `D/time-track/rules` | Subabas canônicas de Escalas |
| Notificações | `D/notifications` | Comunicados/notificações no contexto autorizado |
| Financeiro | `D/finance` | Financeiro global ou empresa conforme política e fluxo existente |
| Comunicação | `D/chat`, `D/media`, `P/whatsapp` | Implementação única de comunicação/WhatsApp ou comportamento de redirecionamento previsto |
| Cadastro | `/criar-conta` | `/cadastro` |

Essa tabela define consolidação pretendida, não comprovação de todos os redirects atuais. Inspecionar cada alias, query, papel e retorno; preservar URL compartilhada, link de e-mail e ID do objeto. Os 86 arquivos de página permanecem rastreados pelo manifesto do inventário.

## 18. Matriz de autorização a fechar antes da migração

Não adotar uma matriz nova por palpite. As diferenças encontradas entre arrays de navegação, `role`/`profile`, guards e decorators viram tarefa explícita.

| Área | Requisito para execução |
| --- | --- |
| Empresa e pessoas | Escopo de empresa/equipe/pessoal conforme API; GESTOR e CONSULTA não equivalem a ADMIN |
| Ponto pessoal | Perfil elegível e vínculo válido; geofence/biometria e estado respeitados |
| Usuários/permissões | Separar visualizar, criar, alterar perfil, reset, bloquear e excluir; proteger conta própria/crítica |
| Financeiro da empresa | Controlador examinado restringe a ADMIN/DEV; acesso à seção não autoriza RH automaticamente |
| Plataforma global | Leituras e mutações por endpoint; menu atual inclui papel que pode não ter API correspondente |
| Cobrança global | Criar/editar/reembolsar possuem restrições próprias; checkout global examinado DEV |
| Webhook/reprocessamento | DEV conforme endpoint; não disponível por herança genérica do módulo |
| Contabilidade | DEV e CEO exclusivamente, inclusive URL/API; CONTABIL não incluído |
| Suporte | Cliente só tickets próprios/empresa autorizada; nota interna/fila operacional restritas |
| PDFs/exportações | Autorização do documento/dataset; esconder botão não protege download |
| Acesso assistido | Endpoint/papel explícitos e auditoria; não um seletor livre de empresa |

Testar DEV, CEO, COMERCIAL, CONTABIL, ADMIN, RH, GESTOR, FUNCIONARIO e CONSULTA nos cenários relevantes, incluindo módulos desativados e bloqueio de cobrança. Permissão customizada não pode burlar uma restrição fixa exigida pelo servidor/produto.

## 19. Relações entre módulos que exigem teste cruzado

| Origem/alteração | Consumidores a reconciliar |
| --- | --- |
| Empresa/plano/módulo/limite | Menu, usuários, cadastro, assinatura, bloqueios e financeiro |
| Logo/nome/contexto | Topbar, portal, carreiras e documentos que usam identidade da empresa |
| Candidato contratado | Funcionário em admissão, processo de admissão e ASO |
| Funcionário admitido/desligado | Escalas, ponto, férias, acesso, folha e indicadores |
| Escala/exceção/feriado | Calendário, ponto, cálculo, fechamento e documentos |
| Troca/ocorrência aprovada | Jornada, ponto, saldo e fechamento |
| Fechamento ajustado/aprovado | Folha, documentos, Dashboard e Contabilidade |
| Folha corrigida/paga | Totais financeiros operacionais, holerite se publicado e trilha contábil |
| Cobrança paga/cancelada | Assinatura, acesso/bloqueio, financeiro e mensalidades |
| Ticket respondido/resolvido | Fila global, visão do cliente e notificações autorizadas |
| Comunicado/termo respondido | Gate, lista de respostas e documento oficial |

Essas relações são cenários de verificação; não assumir que o backend já propaga tudo automaticamente. Contrato faltante vira tarefa, não uma atualização artificial só no navegador.

## 20. Ordem de implementação: lotes pequenos e verificáveis

### Etapa 0 — Baseline e preservação

- Registrar estado do Git, arquivos modificados e referência de comparação, sem exibir credenciais do remote.
- Rever os 16 arquivos já alterados antes deste planejamento; preservar mudanças legítimas e separar reparos de codificação inacabados.
- Não executar `scripts/repair-portuguese-encoding.cjs` automaticamente nem restaurar diretórios em bloco.
- Levantar erros atuais de lint/typecheck/build e distinguir baseline de regressão; screenshot dos fluxos relevantes por papel/largura com dados de teste seguros.
- Consolidar mapa rota → política → API e cobertura dos controles do inventário.

Saída: baseline documentado e lista de correções de contrato/rotas/texto; nenhuma alteração alheia descartada.

### Etapa 1 — Português, tokens e controles básicos

- Reparar encoding em trechos rastreados com diff, não conversão cega do arquivo inteiro.
- Revisar strings de navegação, cabeçalhos, formulários, status, toasts, PDF/template e mensagens do servidor que chegam ao cliente.
- Consolidar tokens, variantes e Button/IconButton/Field/Modal/Drawer/ConfirmDialog/DataState.
- Corrigir classes faltantes e colisões de formato CSS; validar build Tailwind real.
- Documentar exemplos com ação funcional, loading, erro, disabled e foco.

Saída: base legível e componentes comuns testados; nenhuma alegação de correção completa do produto ainda.

### Etapa 2 — Shell, navegação e conta

- Registro único de rotas/autorização, sidebar responsiva, ModuleNav, topbar, avatar/UserMenu e barra inferior.
- Busca de páginas/ações com atalho real; tema persistente; logout real; gates preservados.
- Corrigir links sem tenant/rotas inexistentes e retirar navegação duplicada de Plataforma.

Saída: casca única em todas as telas, três disposições coerentes e testes por papel/largura.

### Etapa 3 — Piloto: Funcionários + Dashboard

- Migrar listagem/dossiê/importação/cadastro completo; usar como referência das demais páginas operacionais.
- Migrar Dashboard e variantes, filtros, alertas, gráficos e atalhos corretos.
- Conferir cada ação dos arquivos e overlays do inventário; validar PDF e alterações cruzadas.

Saída: duas experiências completas aprovadas; ajuste da biblioteca antes de multiplicar padrão.

### Etapa 4 — Escalas e registro de ponto

- Migrar visão geral, calendário, ponto, equipe, trocas, ocorrências, regras, fechamento e documentos, nesta ordem aproximada de dependência.
- Extrair componentes do calendário; unificar mutações/estado de trocas e atribuição.
- Registro de ponto/geofence/biometria e fechamento recebem lote de testes próprios, não só screenshot.

Saída: jornada completa consistente, sem perda de regra ou documento.

### Etapa 5 — Férias e Gestão

- Férias/recibos/lote/avisos; depois Agenda, ASO, Comunicados e Folha.
- Conectar Admissão ao controlador existente; extras sem contrato ficam em backlog.
- Validar ASO/admissão, saldo, fechamento/folha e gates de ciência.

Saída: subabas completas com ações reais e fronteira clara para novos recursos.

### Etapa 6 — Usuários e Configurações

- Usuários, criação, quatro abas, reset, bloqueio/exclusão e vínculo correto.
- Seis seções de Configurações; reutilizar importação/reset/financeiro da empresa.
- Testar matriz de autorização e política de senha consistente.

Saída: administração da empresa uniforme, sem aumento involuntário de permissões.

### Etapa 7 — Vagas e carreiras

- Vagas, formulário, funil, candidato, lote e contratação.
- Hub público, empresa, vaga e candidatura com upload/antiabuso/aviso adequado.
- Testar transição para funcionário/ASO/admissão, links públicos e isolamento.

Saída: recrutamento conectado, com mesmo padrão e comportamento por dispositivo.

### Etapa 8 — Suporte completo

- Cliente/público/wizard/detalhe/arquivos/encerramento/reabertura.
- Fila operacional/respostas/notas/atribuição/SLA conforme fonte; o estilo comum não reduz as barreiras de acesso.

Saída: suporte utilizável ponta a ponta, não apenas lista bonita.

### Etapa 9 — Plataforma operacional

- Visão geral, empresas/ficha/usuários, planos, assinaturas, financeiro e contratos.
- Propostas, configuração global, permissões, acessos, cupons, auditoria, inteligência e WhatsApp.
- Separar correção visual de nova ação (ex.: pausar cobrança); homologar ações críticas com API.

Saída: todos os submódulos no mesmo padrão, sem segunda sidebar e com escopo claro.

### Etapa 10 — Contabilidade e backlog fiscal

- Fila/empresa/competência, correções de ponto e folha, reconciliação/trilha e mensalidades.
- Fiscal manual e emissão integrada são lotes distintos, após contrato/provedor/ambiente de teste e validação própria.

Saída: correções reais DEV/CEO; emissão só ganha status de pronta após cumprir dependências e testes específicos.

### Etapa 11 — Portal, público e legados

- Portal pessoal e documentos publicados; autenticação/recuperação/fatura pendente; site/planos/termos/privacidade/erro.
- Revisar aliases, páginas-esqueleto, handlers sem destino, dados de demonstração e navegações auxiliares.
- Nada fica visualmente “pronto” com botão morto; pendência tem mensagem honesta/backlog.

Saída: cobertura das 86 páginas e layouts auxiliares, sem experiências abandonadas.

### Etapa 12 — Homologação e publicação autorizada

- Testes completos, comparação visual, revisão de textos e cobertura de ações; checklists abaixo.
- Preparar release com diff específico, migrations se realmente necessárias, rollback e smoke test.
- Commit/push/deploy somente como tarefa de publicação autorizada; este pedido atual entrega planejamento, não publica aplicativo.

## 21. Plano de testes e critérios concretos

### 21.1 Matriz de telas/dispositivos

Testar 320, 360 e 390 px (celular), 768 px (tablet), 1024 e 1366 px (notebook), 1440 e 1920 px (PC). Incluir 1366 × 768, tela baixa, orientação horizontal, zoom 200%, teclado virtual e texto/nome longo.

- Mesmas labels e ações em todas as larguras.
- Nenhuma rolagem horizontal da página por bug; tabela/kanban comparativo pode rolar dentro do componente.
- Nenhum botão fora da tela, fonte comprimida para caber, overlay sem saída ou rodapé cobrindo conteúdo.
- Celular não exige mouse/hover/drag; notebook compacto não depende de adivinhar ícone.
- Chrome/Edge/Firefox em desktop e Safari iOS/Chrome Android nos fluxos relevantes. Compatibilidade declarada deve corresponder ao que foi testado.

### 21.2 Matriz de estados e dados

- Loading, refetch, lista vazia, filtro sem resultado, erro 4xx/5xx, timeout, offline, sessão expirada e acesso negado.
- Empresa com módulo desativado e cobrança bloqueada; primeira utilização e alto volume/paginação.
- Nomes/descrições longos, caracteres acentuados, moeda e valores grandes/zero; data sem fuso, virada de dia/mês/ano e competência futura.
- Upload válido, extensão inválida, tamanho excedido, quarentena/rejeição, falha de download e reset do mesmo arquivo.
- Clique duplo, submit Enter, retry, conflito por outra pessoa, seleção que ficou inelegível e sucesso parcial de lote.
- Máscaras e PDFs/exportações, privacidade/consentimento e ausência de dados de demonstração em produção.

### 21.3 Testes já disponíveis para reaproveitar

Há scripts de lint/typecheck/build, Vitest (unitário, contrato, segurança, integração) e Playwright no repositório. Não criar uma suíte paralela sem necessidade.

Comandos existentes a usar na etapa de execução, com infraestrutura/dependências apropriadas:

```powershell
npm run lint:web
npm run typecheck:web
npm run build:web
npm run test:contract
npm run test:security
npm run test:unit
npm run test:e2e
```

Quando mudar servidor, incluir build/testes de API e suites específicas. Integração/E2E precisam de ambiente/banco de teste; não executar reset/seed em banco de produção. Esses comandos foram levantados, não executados como verificação do redesign neste trabalho de planejamento.

Expandir projetos Playwright hoje focados em desktop/mobile para notebook e cenários visualmente críticos. Reutilizar testes de jobs, suporte, PDFs, usuários, financeiro, fechamento e isolamento de tenant existentes.

### 21.4 Rastreabilidade de cada botão/campo

Criar durante execução `COBERTURA-CONTROLES.md` com uma linha por controle contextual do inventário:

```text
arquivo + A/F/C | fluxo/contexto | destino/API | política | novo componente
| cenário de teste | resultado | largura validada | pendência/justificativa
```

Mapas dinâmicos exigem conferir cada opção em runtime, não só a ocorrência estática. Formulário e botão submit são testados juntos, sem inflar contagem de funcionalidades.

Critério: não liberar módulo com controle funcional existente sem destino mapeado ou com regressão conhecida de acesso/dado crítico. Pendência nova é documentada sem prometer recurso pronto.

## 22. Português e codificação: checklist transversal

- Navegação: Dashboard, Funcionários, Escalas, Férias, Gestão, Vagas, Usuários, Configurações, Suporte, Plataforma, Contabilidade.
- Títulos e textos de ajuda dentro de todas as subabas, filtros, placeholder, labels e opções.
- Menus de ações, tooltip, nome acessível, modal, drawer, confirmação e sucesso/erro.
- Status exibidos em português sem alterar enum da API.
- Termos recorrentes: funcionário, usuário, matrícula, admissão, desligamento, período, competência, aprovação, rejeição, configuração, férias, salário, cobrança e nota fiscal.
- Templates de PDF, CSV/modelo importável, notificações/e-mails e mensagens do backend que chegam ao usuário, quando dentro do módulo migrado.
- Strings novas em UTF-8, busca por sintomas de mojibake e replacement character, com revisão humana/diff. Não converter arquivo inteiro por regex baseada apenas em presença de acento.
- Alterações de texto técnico/jurídico não são automaticamente alterações de regra; revisão específica quando mudar o significado.

## 23. Publicação futura no Git e VPS

No final da implementação autorizada, não no planejamento:

1. Revisar diff, incluir só alterações intencionais e executar gates aplicáveis.
2. Separar commit de base visual, módulos e novas integrações quando isso facilitar revisão/rollback.
3. Não publicar arquivos de dump, cópia `innovation/`, tokens, `.env` ou reparos não revisados indiscriminadamente.
4. Confirmar branch/remoto sem imprimir credenciais; push do release autorizado.
5. Na VPS, confirmar serviço/banco/configuração, backup e estado local antes de atualizar. Uma atualização visual normalmente não exige migration; nova integração pode exigir.
6. Usar o fluxo já adotado pelo projeto, com pull seguro se não houver alterações locais conflitantes:

```bash
cd /var/www/innovation
git status --short
git pull --ff-only origin main
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100
```

7. Validar health/endpoints e abrir login/dashboard/módulos críticos; build e containers em execução não comprovam persistência ou botão funcionando.
8. Plano de rollback antes da publicação; não apagar volumes/banco, não `reset --hard` nem sobrescrever alterações locais sem aprovação.

## 24. Definição de pronto do projeto inteiro

- Um sistema de tokens/componentes e uma shell; nenhum módulo novo inventa outro botão, outro avatar ou outra navegação principal.
- Todas as páginas/aliases do manifesto receberam classificação e cobertura; esqueleto não é apresentado como funcional.
- Cada funcionalidade existente preservada ou alterada com justificativa e decisão explícita quando muda produto.
- Cada ação crítica testada em contrato e interação, com autorização e estado correto.
- Mesma informação e capacidade de ação em celular/notebook/PC, com disposição adaptada e nome constante.
- Português/codificação revisados além do menu, incluindo modais e feedback.
- Empresa, pessoa, competência, sessão e papel nunca se confundem; sem vazamento entre tenants.
- Correções de ponto/folha/cobrança têm proteção, reconciliação e trilha efetiva.
- Fiscal não é confundido com cobrança; dependência incompleta fica explicitamente pendente.
- Relatório final com arquivos alterados, testes realmente executados, screenshots e pendências; Git/VPS só declarados atualizados com evidência da publicação.
