# Plano mestre do redesign — Innovation RH

Data: 03/10/2026. Situação: **planejamento entregue; redesign ainda não aplicado**.

## Os dois planos

1. [Plano 1 — Sistema visual e responsividade](PLANO-01-SISTEMA-VISUAL.md): identidade, layout comum, celular/tablet/notebook/PC, menu, topbar, logo/avatar, componentes, botões, formulários e acessibilidade.
2. [Plano 2 — Páginas e execução](PLANO-02-PAGINAS-E-EXECUCAO.md): módulos e subabas, ações/campos, telas incompletas, dependências, fases, testes e publicação futura.

Referências para não perder controles:

- [Inventário legível](INVENTARIO-CONTROLES.md): manifesto de todas as páginas e controles por arquivo/linha.
- [Snapshot estruturado completo](inventario-ui.json): textos longos, handlers, propriedades, opções, componentes e chamadas reconhecidas.

O inventário tem 86 arquivos de página e 144 arquivos TSX examinados; 670 ocorrências de ação/formulário, 340 campos nativos e 223 componentes com propriedades de campo/rótulo. Não são contagens de funcionalidades únicas nem prova de funcionamento. Componentes rotulados incluem indicadores; mapas dinâmicos geram opções que ainda precisam de teste em runtime.

## Escopo de produto

- Dashboard e variantes por função.
- Funcionários: lista, dossiê, cadastro completo e importação.
- Escalas: visão, calendário, ponto, equipe, trocas, ocorrências, regras, fechamento e documentos; registro de ponto.
- Férias: solicitações, decisões, lote, histórico, avisos e recibos.
- Gestão: agenda, ASO, comunicados, folha e admissão.
- Usuários: criação, edição, permissões, senha, segurança e vínculo.
- Vagas: lista/formulário, funil/candidato, contratação e carreiras públicas.
- Configurações: seis áreas existentes.
- Suporte: cliente, público e operação DEV, incluindo conversa e anexos.
- Plataforma: empresas, ficha, financeiro, assinaturas, planos, contratos, propostas, configuração global, permissões, acessos, cupons, auditoria, inteligência e WhatsApp.
- Contabilidade DEV/CEO: revisão global, ajustes de ponto/folha, mensalidades e dependência fiscal explícita.
- Conta/identidade, portal, autenticação, site, telas auxiliares e aliases.

## Decisões de partida

- Um design system e uma shell. As diferenças entre dispositivos são de disposição, não de significado ou autorização.
- Padrão claro com marca roxa e superfícies leves; tema escuro preservado com tokens próprios e contraste testado.
- PC com lateral expandida; notebook com lateral compacta/expansível; celular/tablet com drawer e navegação inferior autorizada.
- Uma biblioteca Button/IconButton; formulários e overlays compartilhados; nenhum botão sem destino/handler declarado.
- Uma fonte de navegação/política consumida por todas as versões; servidor continua autorizando cada operação.
- Contabilidade continua exclusiva DEV/CEO. Fiscal precisa de integração/homologação própria; não é renomear cobrança.
- Não trocar framework nem ampliar permissões como parte implícita da mudança visual.

## Estado de trabalho a respeitar

No momento do planejamento havia 16 arquivos rastreados modificados e arquivos não rastreados anteriores. Os novos documentos não substituem esses arquivos. A etapa zero precisa revisar e preservar o trabalho existente, incluindo reparos inacabados de português/codificação.

Não executar o script de reparo amplo de encoding automaticamente; não restaurar diretórios em bloco; não trabalhar na cópia não rastreada `innovation/` em lugar da aplicação principal. Não publicar dumps, secrets ou alterações não revisadas.

Arquivos antigos de blueprint podem conter direções diferentes, como sidebar escura. Para executar **este pedido**, os dois planos desta pasta são a referência proposta. Decisões de produto ou regra de negócio novas ainda exigem validação específica.

## Checklist de progresso para a próxima execução

- [ ] 0. Baseline, diff preservado e contratos de rota/autorização.
- [ ] 1. Português/encoding, tokens e componentes básicos.
- [ ] 2. Shell, navegação, topbar, usuário, busca, tema e gates.
- [ ] 3. Piloto de Funcionários e Dashboard.
- [ ] 4. Todas as subabas de Escalas e registro de ponto.
- [ ] 5. Férias e Gestão, incluindo admissão real.
- [ ] 6. Usuários e seis áreas de Configurações.
- [ ] 7. Vagas, funil, contratação e carreiras públicas.
- [ ] 8. Suporte cliente/público/operacional.
- [ ] 9. Todas as subpáginas de Plataforma.
- [ ] 10. Contabilidade, reconciliação e backlog fiscal separado.
- [ ] 11. Portal, autenticação, público, páginas auxiliares e aliases.
- [ ] 12. Homologação, relatório e publicação quando autorizada.

Cada item só é marcado completo após testes/evidências e cobertura dos controles, não após alteração do JSX. Não marcar fiscal pronto junto com a revisão visual se a integração continuar pendente.

## Pedido copiável para iniciar a implementação depois

```text
Implemente o redesign do Innovation RH seguindo estes documentos locais:
docs/ui-ux/PLANO-01-SISTEMA-VISUAL.md
docs/ui-ux/PLANO-02-PAGINAS-E-EXECUCAO.md
docs/ui-ux/INVENTARIO-CONTROLES.md
docs/ui-ux/inventario-ui.json

Leia integralmente os dois planos antes de editar. Comece pela etapa 0 e pela
base comum, sem redesenhar todas as páginas ao mesmo tempo. Preserve o diff
existente e não execute reparo amplo de codificação nem git restore em bloco.
Trabalhe na aplicação principal apps/web e apps/api, não na cópia innovation/.

Unifique menu, topbar, avatar/conta, cores, botões, formulários e overlays.
Celular, notebook e PC devem ter os mesmos nomes, ações e autorizações,
adaptando apenas a disposição. Não perca nenhuma ação/campo do inventário.

Não amplie permissões por conveniência; confirme guard e API. Não simule
dados nem sucesso. Diferencie existente, correção, esqueleto e recurso novo.
Contabilidade é DEV/CEO; emissão fiscal exige integração/homologação própria.

Crie a cobertura por controle e atualize este checklist com evidências.
Faça lotes pequenos, valide lint/typecheck/build e testes proporcionais ao
risco, incluindo interação, papéis, tenant, loading/erro/vazio e as larguras
do plano. Declare somente os testes realmente executados.

Entregue alterações e relatório por etapa, com pendências explícitas.
Não faça commit, push ou deploy na VPS sem um pedido de publicação.
```

O pedido acima inicia implementação da base; a autorização de publicar é separada. Uma execução posterior pode selecionar uma etapa específica mantendo as mesmas regras e o mesmo inventário.
