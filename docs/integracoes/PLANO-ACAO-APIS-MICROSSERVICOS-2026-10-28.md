# Innovation — execução rápida com APIs e serviços separados

Pesquisa: 28/10/2026. Continuação do plano de terceirização e do PR #702. Preferência do usuário: aproveitar soluções prontas, priorizar gratuidade e separar processamento. WhatsApp fora do escopo.

## Decisão executável

Começar com a infraestrutura já existente, um worker de e-mail independente e conectores por domínio. Liberar cada fornecedor somente após confirmar autorização, condições comerciais e testes. Não foi encontrada evidência suficiente de uma API gratuita que entregue, de imediato, toda a folha brasileira e o ponto regulamentado para 300+ empresas. A ausência de evidência não significa que nenhum fornecedor possa oferecer condições específicas.

Gratuito para testar, cota gratuita em produção e software de licença aberta são categorias diferentes. Hospedagem, suporte, domínio, certificado e operação podem continuar tendo custo. Uma API documentada ainda precisa ser homologada com a Innovation e com os casos reais dos clientes.

## Matriz de escolha

| Área / candidato | Gratuidade e prontidão verificadas | Decisão para a Innovation |
| --- | --- | --- |
| Cobrança — Asaas | Sem mensalidade fixa, com cobrança pelos serviços utilizados. Sandbox separado, sem movimentar valores reais. | Preservar a integração existente; testar e corrigir conciliação. Não chamar de operação financeira gratuita. |
| E-mail — Resend | Página de preços informa plano gratuito de 3.000 e-mails/mês e 100/dia; domínio e conta precisam estar configurados. | Primeiro piloto de notificações. Limite diário exige dimensionamento; 300 empresas recebendo um e-mail cada num mesmo dia já excedem 100. |
| Fiscal — Nuvem Fiscal | Documentação publicada informa 1.000 eventos fiscais/mês em produção e 100 em sandbox no plano grátis, com empresas ilimitadas. O consumo é compartilhado pela conta e inclui operações além da emissão. | Candidata a piloto, somente se o emissor atual deixar uma lacuna. Confirmar cotas no console, município, regime, certificado e padrão utilizado. Sem dupla emissão. |
| Financeiro — Omie | A página da API menciona plano gratuito com limite diário, mas o site comercial informa ERP pago com teste de 7 dias. Isso não comprova ERP gratuito permanente; mensalidades podem exigir pacote de APIs. | Priorizar clientes já habilitados. Confirmar contrato, eventual elegibilidade gratuita, operações, quota, direitos de oferta e autenticação. Fora da lista de gratuidade permanente comprovada para 300 empresas. |
| Financeiro — Conta Azul | Conta de desenvolvimento com 30 dias, prorrogável; documentação não oferece sandbox dedicado nem webhooks. Produção gratuita permanente não foi comprovada. | Conectar apenas clientes que já utilizem o produto e tenham acesso compatível; sincronizar conforme limites documentados. |
| Ponto — Pontotel | API contratada separadamente. Integra cadastros, jornadas, pontos, afastamentos e banco de horas. | Candidata técnica ao piloto, mas fora da ativação imediata com custo zero. Exigir proposta/cobertura multiempresa e documentação aplicável ao ponto. |
| Folha — TOTVS RM | Integrações SOAP/DataServer e REST; REST não cobre todas as funcionalidades. Uso exige ambiente e permissões do produto. Oferta gratuita pronta não comprovada. | Usar prioritariamente quando cliente/contador já tiver ambiente licenciado e implantado. Demonstrar cálculo, fechamento e obrigações que serão utilizados. |
| Folha — Calculato | API em preview; autenticação para folha com marca própria consta em desenvolvimento. Integração conectada depende de conta do cliente e autorização. | Piloto conectado, após condições comerciais e aprovação; sem vender folha embarcada completa como pronta e gratuita. |
| Alternativa aberta — ERPNext / Frappe HR | Frappe HR é GPL-3.0 e o framework oferece REST. Existem folha configurável e recursos financeiros; essa evidência não comprova eSocial, folha CLT completa ou REP-P brasileiro prontos. | Avaliar como alternativa autogerenciada de ERP/cadastros. Não substitui automaticamente os motores brasileiros; pode exigir mais implantação e manutenção que reaproveitar um sistema já contratado. |

Os limites são a fotografia da documentação consultada; confirmar no cadastro/console antes de ativar. As páginas da Nuvem Fiscal retornaram 502 na abertura direta; a tabela foi recuperada pelo índice de pesquisa oficial e corroborada pelo suporte oficial. Não foi feita consulta autenticada às cotas da conta. Na Omie, a menção técnica a plano gratuito não coincide com a oferta comercial de ERP pago com teste de 7 dias; tratar como gratuidade não comprovada até esclarecer elegibilidade. O conteúdo de autenticação indexado e a página aberta apresentam fluxos diferentes: prevalecerá a documentação e a credencial do aplicativo efetivamente contratado; nenhum conector Omie foi ativado nesta entrega.

## Arquitetura para começar

| Serviço / componente | Responsabilidade | Estado nesta entrega |
| --- | --- | --- |
| API Innovation | Identidade, permissões, tenant, aprovações e acompanhamento | Existente; continua sendo corrigida no PR #702 |
| Worker de e-mail | Consumir `email-send`, chamar provedor, registrar aceitação/ID e falhar quando o envio não for aceito | Implementado; execução independente opcional preparada, ainda não instalada |
| Worker de integrações | Sincronizar fornecedores e conciliar resultados a partir de operações duráveis | Planejado; não existe ainda como serviço produtivo completo |
| Conectores de ponto/folha/ERP/fiscal | Traduzir IDs e contratos de cada fornecedor; usar credencial e escopo corretos por empresa | Dependem de acesso e homologação; não declarados implementados |
| PostgreSQL / inbox / outbox | Autoridade das operações e proteção contra duplicação | PostgreSQL existente; inbox/outbox comum e migração de operações ainda pendentes |
| Redis / Bull | Distribuir trabalhos entre API e workers | Existentes; reutilizados nesta primeira separação |

Reutilizar NestJS/Bull já instalados permite separar processos sem adquirir outro produto de mensageria. Primeiro separar trabalhos com limites claros; depois extrair os domínios cujo volume ou isolamento justifique serviço e armazenamento próprios. Esta etapa compartilha a infraestrutura atual e não constitui autonomia completa de todos os domínios.

Cada operação futura deve conter empresa, ator, tipo, chave interna, hash do conteúdo, executor selecionado, IDs externos e estado: recebida, em execução, concluída, falha ou resultado incerto. Tenant e credencial derivam do vínculo autorizado no servidor. Timeouts de pagamento não autorizam nova cobrança; consultar e conciliar primeiro. O mesmo princípio vale para nota e fechamento de folha.

## O que já foi feito nesta rodada

- Worker `email-send` usa MailService; não retorna sucesso por apenas escrever log.
- Aceitação guarda provedor e ID retornado no resultado do job. Aceitação não é confirmação de entrega nem tratamento de bounce.
- Resend recebe `Idempotency-Key` estável por empresa e job. Sua janela documentada é 24 horas; jobs com mais de 23 horas exigem revisão antes do envio.
- Falhas de SMTP/SES desabilitam retry automático do job por não haver garantia de idempotência comprovada nesses adaptadores. Queda do processo após envio ainda é um risco de entrega ao menos uma vez; ledger durável e conciliação continuam pendentes.
- Payload de e-mail exige empresa UUID, destinatário válido e limites de tamanho. Logs do worker não incluem destinatário nem corpo da mensagem.
- Processo independente `email-worker` usa somente MailModule e Bull; não importa API, banco, crons ou WhatsApp.
- API mantém o consumidor por padrão. Há configuração explícita para passar o consumo ao processo externo, preservando a implantação atual.
- Corrigido o fixture HTTP de conta DEV para usar e-mail normalizado, mantendo a exigência de 403 e a verificação de que nada foi alterado. Acrescentado caminho positivo de cadastro autorizado.
- Smoke Docker passou a receber configuração de produção de teste com segredos aleatórios efêmeros, sem enfraquecer a validação de produção.

Os fluxos que já chamam MailService diretamente ainda não foram todos transferidos à fila. A separação não altera envio síncrono existente nem cria uma rota pública para disparar e-mails.

## Ativação do worker, depois da homologação

1. Configurar uma conta e remetente autorizados de Resend, SES ou SMTP no ambiente. Usar o plano gratuito de Resend somente dentro das cotas. Nenhuma conta foi criada nem assinatura contratada nesta execução.
2. Construir a mesma imagem da API que contém `apps/api/dist/email-worker.js`.
3. Usar `EMAIL_WORKER_EXTERNAL=true` e o profile `email-worker` juntos. No Compose, iniciar API e worker na mesma atualização:

```bash
EMAIL_WORKER_EXTERNAL=true docker compose -f docker-compose.prod.yml --profile email-worker up -d --build api email-worker
```

4. Executar um job sintético autorizado e confirmar resultado `accepted`, provedor/ID e estado de falha quando o provedor recusa. Jobs antigos sem tenant exigem revisão.
5. Monitorar fila, falhas, cotas e atraso. Proteger Redis e restringir acesso aos payloads; a retenção configurada é de até um dia para concluídos e sete dias para falhos, com limites de quantidade. A limpeza é acionada pelo processamento da fila, não uma garantia de eliminação imediata no prazo.
6. Para voltar ao consumo pela API, remover o modo externo, recriar a API e parar o worker independente. Não há migração de banco nesta extração.

O comando é um procedimento para o operador, não evidência de instalação. O worker usa o mesmo Redis; isso não cria redundância contra queda desse servidor. Para produtores de jobs, usar IDs únicos por evento e preservar payload imutável. Não reutilizar uma chave para uma nova mensagem de negócio.

## Sequência de ação e aprovação técnica

| Ordem | Ação | Prova para liberar |
| --- | --- | --- |
| 1 — agora | Fechar falhas do PR #702 e homologar o worker isolado com dados sintéticos | Testes normais passam; integração HTTP+PostgreSQL e Redis passa; imagem inicia com configuração apropriada |
| 2 | Implementar operação durável, inbox/outbox, escopo por empresa e limites por provedor | Repetição simultânea produz um efeito lógico; queda e retomada não perdem evento aceito |
| 3 | Homologar Asaas existente e Resend dentro da cota | Cobrança simulada conciliada; envio aceito, rejeição e repetição observáveis |
| 4 | Piloto fiscal Nuvem Fiscal se necessário; um ERP por cliente habilitado | Credenciais autorizadas, cota confirmada, empresa correta, consulta de estado e documentos reconciliados |
| 5 | Escolher ponto e folha pelo que o cliente já possui ou por proposta específica | Endpoints e direitos comprovados; plano gratuito elegível ou custo aprovado; cases críticos demonstrados |
| 6 | Piloto de 3–5 empresas e dois fechamentos de folha | Horas, rubricas, valores e documentos conciliados; férias, 13º e rescisão também testados |
| 7 | Migrar por lotes; um executor oficial por domínio/empresa | Histórico preservado, plano de retorno, suporte e capacidade medidos |

A preparação técnica pode avançar agora. Integração externa depende de conta, credencial e autorização; operação remunerada depende das condições aceitas pelo usuário. Não foram enviados dados de clientes a novos fornecedores, realizados pagamentos, emitidas notas ou desligados motores atuais. Não há certificação para 300+ empresas sem ensaio de carga.

## Inclusão de autenticação e chamados

A avaliação de Supabase Auth / Keycloak e Jira Service Management / Zammad está em [AUTH-CHAMADOS-MIGRACAO-2026-10-28.md](./AUTH-CHAMADOS-MIGRACAO-2026-10-28.md). Para piloto rápido, avaliar Supabase Auth + Jira Free com limites e isolamento comprovados. Para ausência de assinatura de software, avaliar Keycloak + Zammad com operação própria. Os conectores ainda não foram ativados. Foi fechada nesta rodada uma lacuna local de referências de outras empresas na abertura de chamados por CEO/CONTABIL.

## Fontes oficiais consultadas

- Pontotel: https://suporte.pontotel.com.br/pt-br/article/o-que-e-a-api-da-pontotel-e-como-ela-pode-integrar-outros-sistemas-14qmtem/
- Asaas, modelo de cobrança: https://central.ajuda.asaas.com/hc/pt-br/articles/31406236404763-O-Asaas-%C3%A9-gratuito
- Asaas, sandbox: https://docs.asaas.com/docs/sandbox
- Resend, preços: https://resend.com/pricing
- Resend, idempotência e janela de 24 horas: https://resend.com/docs/dashboard/emails/idempotency-keys
- Nuvem Fiscal, cotas: https://dev.nuvemfiscal.com.br/docs/limites/
- Nuvem Fiscal, esclarecimento oficial das cotas: https://suporte.nuvemfiscal.com.br/t/duvidas-sobre-os-limites-do-plano/2251
- Omie, API: https://api.omie.com.br/docs
- Omie, oferta comercial e teste: https://www.omie.com.br/blog/sistema-erp-gratuito-como-funciona-o-teste-do-omie/
- Conta Azul: https://developers.contaazul.com/aboutapis
- TOTVS RM: https://centraldeatendimento.totvs.com/hc/pt-br/articles/37535317324823-RH-RM-FOP-Como-identificar-e-consumir-DataServer-e-API-dispon%C3%ADveis-nos-produtos-de-RH
- Calculato: https://desenvolvedores.calculato.com.br/docs/introducao e https://desenvolvedores.calculato.com.br/docs/autenticacao
- Frappe HR e licença: https://github.com/frappe/hrms
- Frappe REST: https://docs.frappe.io/framework/user/en/api/rest
- ERPNext, escopo contábil/localização: https://docs.frappe.io/erpnext/accounting-introduction
- NestJS, filas e processos: https://docs.nestjs.com/techniques/queues
- Bull, entrega ao menos uma vez: https://docs.bullmq.io/bull/important-notes
- MTE, enquadramento do registro de ponto: https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/fiscalizacao-do-trabalho/rep
