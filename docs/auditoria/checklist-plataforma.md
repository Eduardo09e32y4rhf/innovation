# Checklist de Validacao por Modulo

Baseline atual validado: `52d6183d`

Use este checklist para homologar a aba **Plataforma** antes de liberar em producao.

## Financeiro

- [ ] O valor faturado vem do backend.
- [ ] O valor recebido vem do backend.
- [ ] O valor a receber nao usa formula aproximada no frontend.
- [ ] O MRR e separado por regra real de assinatura/contrato.
- [ ] A fatura pode ser criada, editada e cancelada.
- [ ] A fatura pode ser sincronizada com Asaas.
- [ ] O reprocessamento de webhook existe e registra tentativa.
- [ ] O PDF de extrato e gerado no backend.
- [ ] O extrato possui hash, data de emissao e usuario emissor.
- [ ] O historico por fatura mostra origem, alteracoes e eventos.
- [ ] A conciliacao Innovation x Asaas mostra divergencias.
- [ ] Acoes restritas respeitam permissao e tenant.

## Contratos

- [ ] Contrato possui rascunho, revisao, aceite, ativo e encerrado.
- [ ] Editar contrato ativo cria versao/aditivo.
- [ ] PDF contratual e gerado no backend.
- [ ] O contrato nao muda silenciosamente apos ativacao.
- [ ] Existe vinculacao com cobranca ou assinatura quando aplicavel.
- [ ] O historico mostra quem alterou e quando.
- [ ] A lista exibe plano, valor, vigencia e status real.
- [ ] Acoes sem permissao nao aparecem nem executam.

## Configuracao

- [ ] Configuracoes de plano, permissao, acesso e integracao estao separadas.
- [ ] Alteracao de perfil salva de fato no backend.
- [ ] Alteracao de permissao salva de fato no backend.
- [ ] Segredos nao sao expostos completos.
- [ ] Existe teste de conexao para Asaas/WhatsApp/IA.
- [ ] Existe feedback de sucesso e falha com contexto.
- [ ] Mudancas sensiveis exigem confirmacao.
- [ ] Existe auditoria de antes/depois.
- [ ] Existe indicacao de alteracoes nao salvas.

## Usuarios

- [ ] Criar usuario nao gera erro 500.
- [ ] Reset de senha atualiza o estado visivel.
- [ ] O usuario bloqueado/desbloqueado reflete o novo status.
- [ ] A edicao de perfil e permissao realmente persiste.
- [ ] A lista nao cria barra de rolagem desnecessaria em telas normais.
- [ ] Acoes de menu exibem apenas o que a permissao permite.

## Suporte

- [ ] O chamado mostra autor, status, prioridade e responsavel.
- [ ] Anexos e imagens aparecem quando existem.
- [ ] O fluxo de abrir, responder, concluir e reabrir muda o estado real.
- [ ] Falhas de webhook e tentativas ficam auditadas.
- [ ] O usuario ve claro se o chamado esta aberto, pendente ou fechado.

## Vagas e Carreiras

- [ ] O portal carrega em desktop e mobile sem quebrar layout.
- [ ] Logo e favicon aparecem corretamente.
- [ ] Cada candidatura guarda seu proprio snapshot.
- [ ] O upload aceita apenas formatos esperados.
- [ ] Consentimento fica persistido no fluxo da candidatura.
- [ ] Contratacao nao aceita payload vazio.
- [ ] O candidato nao sobrescreve historico de outras candidaturas.

## Ponto, Escala e Ferias

- [ ] A regra e calculada no backend e nao duplicada na UI.
- [ ] Ocorrencias mostram previsto x realizado.
- [ ] Atestado parcial nao vira atestado de dia inteiro.
- [ ] Ferias seguem periodo aquisitivo real.
- [ ] Fim de ferias, fracionamento e pagamento seguem regra valida.
- [ ] PDFs oficiais saem do backend e batem com a tela.

## Critério de aprovacao

A plataforma so pode ser considerada fechada quando:
- todas as acoes sensiveis responderem com estado real;
- nenhum indicador critico depender de estimativa local;
- o PDF oficial vier do backend;
- a auditoria estiver presente;
- o comportamento estiver consistente entre desktop, mobile e VPS.

