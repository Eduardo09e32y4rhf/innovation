# Backlog de Encerramento da Plataforma

Baseline atual validado: `52d6183d`  
Builds verificados nesta base: `build:api` e `build:web`

Este backlog foca apenas na aba **Plataforma** e nos pontos de risco que ainda impedem o sistema de ser tratado como backoffice financeiro/comercial confiavel.

## P0

### Financeiro
- Remover qualquer calculo aproximado de faturamento, recebido e MRR.
- Garantir que valores venham do backend com origem clara.
- Corrigir a acao de editar/cancelar/sincronizar/reprocessar fatura.
- Gerar PDF de extrato no backend, com snapshot imutavel e hash.
- Exibir falhas de webhook, tentativas e ultima sincronizacao real.
- Implementar conciliacao Innovation x Asaas com divergencias visiveis.
- Garantir reembolso/estorno com regra e prazo claros.

### Contratos
- Trocar a tela atual por um fluxo de contrato com rascunho, revisao, aceite e ativacao.
- Gerar PDF contratual no backend.
- Impedir edicao silenciosa de contrato ativo.
- Criar revisao/aditivo em vez de sobrescrever contrato aprovado.
- Vedar contrato sem vinculacao com cobranca ou assinatura quando a regra exigir.

### Configuracao
- Separar configuracoes de plano, acesso, permissao, integracao e segredos.
- Salvar e refletir de fato edicoes de permissao e perfil.
- Garantir que segredos nao aparecam completos no frontend.
- Criar teste de conexao para Asaas, WhatsApp e IA.
- Registrar auditoria de antes/depois em alteracoes sensiveis.

### Seguranca operacional
- Garantir que reset de senha, bloqueio e troca forcada persistam e recarreguem o estado correto.
- Impedir que o usuario veja feedback visual de sucesso quando o backend falhar.
- Remover qualquer estado fixo que simule operacao concluida sem confirmacao do servidor.

## P1

- Reduzir redundancia visual e botões repetidos na aba Plataforma.
- Separar a aba em tres blocos claros: Financeiro, Contratos e Configuracao.
- Melhorar mobile e evitar layouts que quebram em telas menores.
- Padronizar tabelas, funis e menus de acao por linha.
- Colocar permissao e risco em cada acao sensivel.
- Substituir `alert()` por toast e feedback persistente.
- Criar historico por empresa e por acao no console da plataforma.
- Mostrar estados "pendente", "falha", "parcial" e "operacional" com data real.

## P2

- Melhorar branding, favicon e consistencia visual da plataforma.
- Ajustar cores e hierarquia de cards para reduzir cansaco visual.
- Refinar labels tecnicos para termos mais claros para negocio.
- Melhorar pagina vazia, loading e skeleton.
- Quebrar modais grandes em etapas menores.
- Adicionar filtros persistentes por URL e pesquisa mais rapida.

## Itens ja adaptados no estado atual

- Reset de senha de usuarios corrigido no backend e no fluxo da UI.
- Build da API e do frontend validado na base atual.
- Layouts principais de Plataforma, Usuarios e Carreiras ja receberam simplificacao visual anterior.

## Regra de corte

Um item so pode sair do backlog quando:
- existir fluxo completo;
- houver retorno visivel para o usuario;
- houver auditoria;
- o comportamento estiver coberto por teste ou validacao manual;
- o dado exibido vier do backend e nao de estimativa local.
