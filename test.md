# Innovation — plano consolidado v2

Data: 02/10/2026. Repositório: eduardo09e32y4rhf/innovation.
Base examinada: main, commit 40abdd34.
Escopo desta entrega: revisão estática e planejamento; nenhuma alteração no código, banco, cobrança ou produção. Testes e build não foram executados; dependências não estavam instaladas.
Este documento consolida o plano anterior e acrescenta CEO, primeiro acesso, senhas provisórias, assinatura, facial e liberação sem cobrança.

## 1. Resultado pretendido e limites

- Novas empresas conseguem se cadastrar pelo login e contratar planos.
- COMERCIAL vende, faz orçamentos/propostas, cria empresas/acessos autorizados e acompanha suas comissões. Não recebe acesso irrestrito a folhas, biometria ou segredos técnicos.
- CONTABIL atende todas as empresas no escopo contábil: folhas, cálculos, correções e chamados, com histórico.
- DEV mantém controle da plataforma e passa a ter as funcionalidades de RH, Comercial e Contábil.
- CEO é um perfil interno global, criado somente pelo DEV. Tem visão e gestão operacional semelhantes às do DEV, sem poder comprometer o controle do DEV.
- Usuários e Funcionários compartilham o mesmo provisionamento de acesso, sem duplicação de pessoas/contas.
- A senha definitiva pertence ao usuário e nunca é recuperável ou exibida pela aplicação.
- CEO cadastra a facial, preenche seus próprios dados e assina a versão exata do contrato emitido pelo DEV; PDF disponível em Notificações → Contratos.
- DEV/CEO controlam facial e liberação de acesso. Cobrança e acesso são estados independentes.
- Interface responsiva em todo o sistema; dashboard inicial enxuto por perfil.

Premissas explícitas:
1. CEO, COMERCIAL e CONTABIL são internos da plataforma; ADMIN/RH/GESTOR/FUNCIONARIO/CONSULTA continuam vinculados às empresas clientes.
2. “Pausar pagamentos” significa pausar a cobrança da assinatura do software, não salários, pagamentos de fornecedores ou comissões.
3. Desabilitar a facial de uso cotidiano não dispensa automaticamente a assinatura facial inicial do CEO. Uma alternativa de assinatura exigirá decisão explícita do DEV e validação jurídica/técnica.
4. O CEO é da empresa responsável pela plataforma, não um novo dono de cada empresa cliente.
5. Ser CEO no sistema não transfere quotas societárias. Participação, poderes e obrigações dependem do instrumento jurídico e das formalidades aplicáveis.

## 2. Achados que orientam a implementação

| Área | Evidência da revisão | Consequência |
| --- | --- | --- |
| Cadastro público | Login aponta para /criar-conta, formulário sem integração; /cadastro tem o fluxo funcional. | Corrigir link e redirecionar a rota antiga. |
| Perfis | COMERCIAL existe; CEO e CONTABIL não estão no enum. | Migração aditiva e atualização de todos os tipos/DTOs/menus/seeds. |
| Autorização | Catálogos frontend/backend divergem; RolesGuard não aplica integralmente permissões globais salvas. | Centralizar política e validar recurso/empresa na API. |
| Usuários | createWithEmployeeSync só conecta Employee já existente; cria conta com forcePasswordChange=false. | Provisionamento comum, primeiro acesso obrigatório e pré-cadastro quando faltam dados trabalhistas. |
| Funcionários | syncPanelAccess usa DEFAULT_EMPLOYEE_PASSWORD para novas contas; operações não formam uma única transação. | Senha individual aleatória; remover senha compartilhada; provisionamento transacional. |
| Senhas | Edição geral de usuário aceita password; reset recebe senha escolhida pelo administrador. | Separar edição de cadastro, troca pessoal e emissão de nova provisória. |
| Sessões | Guard bloqueia quase tudo durante troca obrigatória; troca de senha não retorna nova sessão. | Fluxo restrito de onboarding e renovação coerente de sessão após trocar senha. |
| Facial examinada | FaceIDOverlay captura selfie e envia []; time-track aceita descritores do cliente e registra livenessOk=true. Vetores vazios iguais podem resultar em distância zero. | Não usar esse fluxo como prova biométrica/assinatura do CEO; corrigir antes de habilitar. |
| Termos | PrivacyConsent é aceite de privacidade; não é contrato societário. | Separar consentimento, reconhecimento facial e assinatura contratual. |
| Contratos | ManualContract é orientado a planos/cobrança; endpoints DEV/COMERCIAL recebem IDs sem política de destinatário consistente no controller. | Contrato do CEO precisa de tipo/ACL próprios, sem exposição ao Comercial. |
| Financeiro | Login, JwtAuthGuard, TenantGuard e SubscriptionActiveGuard verificam estados financeiros separadamente. | Uma política efetiva de acesso, aplicada em todos esses caminhos. |
| Vendas | commercialOwnerId indica responsável atual, não a autoria histórica de cada venda. | Livro de vendas e comissões com snapshots e eventos idempotentes. |
| Folha | PayrollService usa constantes de 2024; time-track possui motor mais completo e tabelas versionadas. | Consolidar cálculo; não presumir que valores atuais estão juridicamente corretos. |
| UI | Logo fixa de até 400px; dashboard extenso e indicador fixo “Períodos abertos: 1”. | Logo responsiva, dados reais e resumo por perfil. |

Os achados são do código inspecionado, não de um teste de invasão ou de execução em produção.

## 3. Perfis e proteção do DEV

| Perfil | Escopo operacional | Limites principais |
| --- | --- | --- |
| DEV | Plataforma, todas as empresas, RH, Comercial, Contábil, auditoria e configurações | Senhas definitivas nunca visíveis; acesso sensível auditado. |
| CEO | Gestão global, empresas, RH, Comercial, Contábil, cobrança e contratos autorizados | Não cria DEV/CEO; não modifica nem assume a identidade do DEV; não acessa meios técnicos de removê-lo. |
| COMERCIAL | Carteira autorizada, planos, propostas, vendas, criação de empresas/acessos e suas comissões | Sem folhas globais, contratos societários, biometria bruta ou controle técnico. |
| CONTABIL | Folhas e chamados contábeis de todas as empresas, com contexto explícito | Sem administração global de usuários, vendas ou credenciais. |
| ADMIN | Administração da própria empresa | Sem perfis internos ou dados de outros clientes. |
| RH | Pessoas, ponto, documentos, férias e folha da própria empresa | Sem poderes reservados à plataforma. |
| GESTOR | Equipe e aprovações autorizadas | Sem dados e usuários fora da equipe. |
| FUNCIONARIO / CONSULTA | Próprio uso / leitura autorizada | Sem administração. |

Aplicação obrigatória no backend:
- Identificar o DEV proprietário por ID estável protegido, não apenas pelo e-mail editável PLATFORM_OWNER_EMAIL. Migrar a configuração existente sem criar outro proprietário ou retirar o acesso atual.
- Avaliar regras de proteção ANTES de qualquer atalho de superusuário. Negação explícita tem prioridade sobre customPermissions e permissões globais.
- CEO não altera/exclui/desativa/rebaixa DEV, troca seu e-mail/empresa, redefine/revela sua credencial, revoga suas sessões, troca sua facial/MFA, bloqueia seu tenant ou concede a si mesmo poder equivalente.
- Cobrir Usuários, Funcionários, importações, operações em lote, suporte/impersonação, exclusão de empresa, cascatas do banco e alterações de configuração.
- CEO não edita sua própria função, escopo, participação societária ou controles que lhe concedam acesso reservado. Cadastro pessoal é uma operação separada, com lista de campos permitidos.
- Somente DEV atribui CEO, inclusive em promoções, importação, convite e API direta. Cadastro público nunca aceita papéis internos.
- Proposta conservadora: gestão de credenciais/ativação de outros CEOs fica com DEV; CEO altera seus dados pessoais e senha pelo fluxo próprio.
- CEO visualiza informações operacionais, não chaves de infraestrutura, segredos JWT/Asaas, hashes, senhas ou biometria bruta. Console SQL/shell/exportação de credenciais, se existirem, não são herança automática de permissões.
- A proteção vale dentro da aplicação. Controle de hospedagem, banco e repositório deve continuar com o DEV; permissões do software não protegem contra um administrador externo da infraestrutura.

Catálogo compartilhado de capacidades, adaptando a base existente: users.manage, users.provision, users.temporary_password.reveal, users.temporary_password.reissue, platform.ceo.create, platform.owner.manage, facial.policy.manage, billing.pause, access.override, contracts.issue/read/sign/archive, sales.manage, commissions.read/manage, payroll.read/calculate/adjust, accounting.tickets.
Capacidade + perfil + empresa/carteira/equipe + sujeito + estado do recurso. O frontend usa a mesma decisão para apresentar controles, mas a API continua sendo a autoridade.

## 4. Usuários ↔ Funcionários e senha provisória

Criar um único serviço de provisionamento, reutilizado por criação em Usuários, Funcionários, Comercial e resets administrativos. Manter cadastro público separado: quem cria sua própria senha definitiva não terá essa senha exposta a administradores.

Regras de identidade e vínculo:
- Normalizar e-mail; manter as restrições de unicidade atuais. Não unir pessoas de empresas diferentes por e-mail/CPF sem autorização e conferência.
- Dentro do mesmo tenant, vincular Employee existente ao User correto, após validação do vínculo e do ator. Depois usar IDs estáveis; mudança de e-mail não pode transferir uma conta a outra pessoa.
- Criação pela aba Funcionários com acesso habilitado cria/vincula User; criação em Usuários cria o perfil pessoal e conecta Employee existente.
- Se Usuários não tiver os campos trabalhistas obrigatórios, gerar pré-cadastro pessoal, apresentado na aba Funcionários como pendente/sem vínculo. Só criar/ativar Employee quando houver dados reais de admissão, cargo e departamento.
- CEO/sócio não entra automaticamente na folha, ponto, ASO ou contrato CLT. Um vínculo de emprego, se houver, é cadastrado separadamente.
- Proposta mínima: UserProfile vinculado 1:1 ao User para dados pessoais e completude; manter Employee.userId como vínculo trabalhista. Não criar uma segunda credencial no perfil.
- Propagar campos compartilhados permitidos entre as telas. Editar um cadastro não gera nem redefine senha.
- Transação para conta, vínculo, credencial provisória e auditoria; idempotência para duplo clique/reenvio; verificação de limite de licenças sem corrida de concorrência. E-mails/eventos externos somente após commit, com repetição segura.
- Desativação, reativação e desligamento seguem regra explícita; reativar não concede papel superior nem cria outra conta.

Senha provisória:
1. Gerar no servidor por fonte criptograficamente segura, exclusiva por emissão, obedecendo à política de senha. Remover a senha compartilhada de ambiente.
2. forcePasswordChange=true em toda conta provisionada por terceiros. Sugestão inicial de validade: 24 horas, configurável. Expirada, emitir outra; não exibir indefinidamente.
3. Login com provisória entrega sessão limitada à troca de senha. Depois, continuar o onboarding apropriado ao perfil.
4. Para permitir a visualização solicitada, guardar SOMENTE a provisória em registro separado, com criptografia autenticada e chave fora do banco. O hash continua sendo usado para autenticar.
5. A senha definitiva tem somente hash; nunca texto puro nem cópia reversível. Não existe endpoint “ver senha atual”.
6. Revelar provisória exige endpoint próprio, autorização por alvo, reautenticação, limite de tentativas e auditoria de ator/alvo/data — sem registrar a senha.
7. Não incluir segredo em listagens, logs, analytics, URLs, exportações, mensagens de erro, cache ou localStorage. Resposta de revelação com no-store.
8. Troca/expiração/reemissão revoga a provisória anterior. Na troca, apagar o segredo cifrado da base ativa na mesma transação e invalidar a possibilidade de revelá-lo. Restringir backups e retenção; não prometer apagar cópias que alguém já tenha visto.
9. Reset administrativo emite outra provisória, não revela a definitiva antiga. Exigir motivo e autorização; revogar sessões antigas.
10. Renovar a sessão após troca, com controle de versão de credenciais consistente em JWT/refresh. Evitar a comparação atual vulnerável a diferenças de precisão entre iat em segundos e timestamp em milissegundos.

Proposta de escopo para visualizar/reemitir provisórias, sujeita às permissões aprovadas:

| Ator | Alvos permitidos |
| --- | --- |
| DEV | Contas administradas por ele, incluindo CEO; não há revelação de senha definitiva. |
| CEO | Contas operacionais autorizadas, nunca DEV nem outros CEOs pela política conservadora. |
| ADMIN | Perfis gerenciáveis da própria empresa, excluindo todos os internos da plataforma. |
| RH | Perfis que pode administrar na própria empresa; não ADMIN/DEV/CEO/COMERCIAL/CONTABIL. |
| GESTOR | Funcionários da própria equipe com delegação explícita; não outros gestores ou administradores. |
| COMERCIAL | Acessos de clientes da carteira cuja criação/gestão lhe foi autorizada; nunca perfis internos. |

Não conceder essas capacidades em massa apenas por aparecer na tabela. Aplicar também hierarquia, relação com o alvo e estado da credencial. Toda leitura deve revalidar se a provisória ainda existe e não foi consumida.

## 5. Primeiro acesso do CEO

Fluxo alvo:
1. DEV cria CEO em Usuários com identificação mínima e e-mail confirmado pelo processo de convite. O papel e a empresa interna são definidos no servidor.
2. CEO recebe o acesso provisório, entra e define sua senha pessoal. Até lá não pode acessar funções administrativas.
3. Mostrar finalidade e informações sobre biometria antes da coleta; registrar a base legal/consentimento quando aplicável.
4. CEO cadastra a facial com validação real. Não reaproveitar uma selfie sem verificação como “facial validada”.
5. IMEDIATAMENTE depois, o próprio CEO preenche seus dados pessoais/contratuais. Campos obrigatórios dependem do modelo jurídico aprovado. Não inventar dados do DEV ou do CEO.
6. Validar completude e identidade do signatário por processo aprovado. Reconhecer a mesma face em duas capturas não comprova, sozinho, que o CPF informado pertence à pessoa.
7. Montar a minuta com dados verificados do DEV/empresa e do CEO. Cláusulas, poderes, participação e condições vêm do documento autorizado pelo DEV; o CEO não os altera unilateralmente.
8. CEO lê o documento completo e manifesta aceite da versão exata. Realizar NOVA verificação facial, ligada exclusivamente à assinatura dessa versão.
9. Registrar as assinaturas/aceites exigidos do DEV e do CEO, sem simular assinatura do DEV. Se a oferta já vier assinada por ele, verificar essa evidência.
10. Gerar o PDF definitivo e disponibilizá-lo em Notificações → Contratos; somente então liberar as permissões amplas do CEO, conforme os requisitos de ativação aprovados.

Estados propostos: INVITED → PASSWORD_CHANGE → FACE_ENROLLMENT → PROFILE_REQUIRED → CONTRACT_PENDING → ACTIVE. Falha, interrupção ou assinatura incompleta não pulam etapa. A aplicação retoma do último estado confirmado.
O backend autoriza cada transição; acessar uma URL ou alterar localStorage não conclui onboarding. Permitir apenas rotas exatas de sessão, etapa atual, suporte e saída, sem atalhos por substring de URL.
Se houver espera por aprovação/assinatura do DEV, mostrar o motivo e manter sessão limitada. Reemissão de convite/contrato invalida desafios e versões anteriores ainda não assinadas.

## 6. Facial: política, segurança e privacidade

- Separar captura de imagem, cadastro biométrico, identificação inicial e verificação de assinatura; são funções diferentes.
- Identidade biométrica ligada ao User, não obrigatoriamente ao Employee. Migrar vínculos existentes com conferência; amostras vazias/inválidas exigem recadastro, não conversão para “válidas”.
- Verificação por solução técnica validada, preferencialmente com prova de vida e evidência verificável no servidor. Escolher fornecedor/solução antes de prometer reconhecimento confiável; custos e tratamento de dados precisam de aprovação.
- Não confiar em livenessOk, matched, descriptor ou fallback enviados pelo navegador. Rejeitar vetores vazios, formatos/dimensões inválidos, valores não finitos e evidências de origem não verificável.
- Usar desafio de uso único, com expiração, vinculado a userId, finalidade e contractVersionId/hash. Impedir repetição, troca de documento e uso da mesma prova para assinar outro contrato.
- Cadastro/troca de facial exige sessão autenticada e confirmação reforçada; não permitir substituir o rosto de outra pessoa por conhecer seu ID.
- DEV/CEO alteram a política de facial na aba Usuários, com motivo e auditoria; CEO nunca altera a do DEV. Separar login/uso cotidiano, ponto e assinatura para não transformar uma opção genérica em bypass.
- Desabilitar facial rotineira não significa apagar biometria, invalidar assinatura anterior nem dispensar assinatura inicial. Mostrar isso na interface. Retenção/exclusão biométrica segue processo próprio.
- Câmera negada, indisponível ou incompatível deve ter mensagem e recuperação/suporte, sem validar automaticamente. Alternativa acessível de assinatura precisa de política aprovada; não inventar assinatura facial como fallback.
- Biometria é dado pessoal sensível: finalidade, base legal, necessidade, retenção, criptografia, acesso mínimo e trilha de auditoria precisam estar definidos. Não colocar templates biométricos ou selfie bruta por padrão no PDF, logs ou painel administrativo.

## 7. Contratos em Notificações → Contratos

Adicionar subaba e rota coerentes com a navegação existente, reutilizando notificações e infraestrutura de PDF. O contrato deve continuar acessível mesmo após marcar a notificação como lida ou arquivá-la.

Modelo recomendado, nomes sujeitos aos padrões do repositório:
- ExecutiveAgreement: DEV emissor, CEO destinatário, empresa da plataforma, tipo, status e versão atual.
- AgreementVersion: conteúdo/dados das partes congelados, versão do modelo jurídico, participação/poderes, hash e PDF privado.
- AgreementSignature: signatário, versão/hash, data do servidor, método, referência da verificação e evidências mínimas protegidas.
- AuditLog: emissão, leitura, assinatura, nova versão, cancelamento, arquivamento e tentativas recusadas.

Não transformar ManualContract de assinatura comercial em contrato societário sem separar tipo e ACL. Reutilizar renderer/armazenamento/auditoria existentes quando apropriado. Toda listagem, download, alteração e assinatura valida ator, destinatário, tenant e tipo, inclusive por ID direto.

| Situação do contrato | Atualizar | Excluir |
| --- | --- | --- |
| Rascunho | Editar antes da emissão, com histórico. | DEV/responsável autorizado pode excluir conforme política. |
| Emitido, não assinado | Nova versão invalida o convite/desafio anterior. | Cancelar emissão; exclusão física apenas pela política aplicável. |
| Assinado | Aditivo/nova versão e nova assinatura quando exigida; original intacto. | Cancelar/arquivar na interface, preservando prova e retenção necessária. |

Esta é uma salvaguarda proposta para atender à atualização/exclusão sem adulterar documentos assinados. Exclusão física de provas não deve ser uma ação administrativa livre; estabelecer retenção e eliminação juridicamente adequadas.

Participação societária:
- Não presumir percentual, tipo societário, capital, remuneração ou poderes de representação.
- Se houver participação, exigir percentual explícito inferior a 100%, com precisão definida e validação da soma das participações. Não pressupor 49%, 50% ou qualquer outro valor.
- CEO não muda sua própria participação; alterações dependem da autorização e formalidades do instrumento aprovado.
- O documento precisa distinguir nomeação como administrador/CEO de aquisição de quotas. Validar minuta e procedimento com advogado societário antes de uso real.
- Assinatura eletrônica precisa comprovar autoria e integridade; uma foto inserida no PDF não basta como desenho técnico. Não afirmar que a assinatura substitui todos os atos societários/registro.

## 8. Facial, cobrança e acesso: controles independentes

Na aba Usuários, DEV/CEO veem a política facial da pessoa e um painel de cobrança da EMPRESA vinculada. O segundo deve deixar claro quais usuários serão afetados; assinatura SaaS não é uma cobrança individual de cada funcionário.

| Controle | Alcance | Efeito |
| --- | --- | --- |
| Exigir facial | Usuário + finalidade | Exige ou dispensa verificação cotidiana autorizada. |
| Pausar novas cobranças | Assinatura da empresa | Suspende geração futura no provedor; não quita nem apaga dívida. |
| Liberar acesso sem cobrança | Empresa, com motivo e vigência | Ignora somente a restrição financeira autorizada. |
| Suspender por segurança | Conta/empresa | Continua bloqueando mesmo que a cobrança esteja dispensada. |

Implementação:
- Política efetiva única: autenticação válida + conta autorizada + onboarding concluído + escopo + condição financeira OU exceção financeira vigente. Exceção financeira nunca supera bloqueio de segurança, desativação explícita ou proteção do DEV.
- Separar estado financeiro do provedor, política de geração de cobrança, estado operacional da empresa e exceção de acesso. Não usar “PAID” ou “ACTIVE” falsos para contornar guards.
- Asaas permite atualizar assinatura para INACTIVE, parando novas cobranças; cobranças já geradas permanecem. Para reativar, enviar ACTIVE e um novo nextDueDate.
- Estender o cliente Asaas existente para esse contrato; não usar exclusão de assinatura como sinônimo de pausa.
- Mostrar faturas abertas antes de confirmar. Parar cobranças já existentes, devolver pagamentos ou perdoar dívida são ações separadas e explícitas; nunca acontecer por efeito colateral do botão de pausa.
- Confirmar a alteração no provedor; se falhar, mostrar pendência/erro e permitir repetição segura. Registrar solicitante, motivo, período, identificadores e resultado, sem expor credenciais.
- Tratar webhooks, cron de inadimplência e retomada de modo idempotente; evento repetido/atrasado não pode revogar exceção válida nem criar cobranças/comissões duplicadas.
- A liberação pode funcionar mesmo com falha na pausa do provedor, mas a UI deve informar que cobranças ainda podem ser emitidas. Nunca exibir “cobrança pausada” sem confirmação.
- Expiração/retomada exige regra explícita e data informada; não faturar retroativamente períodos dispensados sem autorização.
- Períodos gratuitos/pausados não geram receita ou comissão fictícia. Dívidas e comissões anteriores mantêm sua própria regra/histórico.

## 9. Requisitos anteriores preservados

Login/cadastro:
- /login direciona para /cadastro; /criar-conta redireciona. Não criar outro fluxo de contratação.
- Unificar layouts de autenticação e validar senha frontend/backend pela mesma política atual: mínimo de 10 caracteres e requisitos existentes de composição.
- Manter plano, quantidade de usuários, criação da empresa, cobrança e tela de pagamento pendente; tratar erro/reenvio/duplicação sem perder dados.
- Cadastro público escolhe senha própria não revelável; verificação de e-mail e prevenção de abuso fazem parte do aceite. Perfil público não é parâmetro confiável.

Comercial e comissão:
- Reutilizar planos, propostas e contratos comerciais; criar empresa/acessos somente no escopo autorizado.
- CommercialSale registra vendedor estável, autor da operação, cliente/empresa, proposta, plano/ciclo em snapshot, data, valor contratado, recorrência, confirmação/cancelamento e vínculo ao pagamento.
- CommissionEntry registra venda, beneficiário, base, regra/percentual congelado, valor e status PENDING/ELIGIBLE/PAID/CANCELED/REVERSED, com datas e referência de pagamento.
- Valores monetários em Decimal/centavos conforme padrão do projeto; não usar float para apurar comissão.
- Alterar commercialOwnerId não reatribui vendas antigas. Registrar ajustes/estornos como eventos; não sobrescrever a história.
- Referência de cadastro /cadastro?ref=CODIGO validada no backend; não confiar em sellerId livre do navegador.
- Tornar comissão elegível após confirmação de recebimento e regras aprovadas; evitar duplicação por invoice/evento. Devolução gera reversão rastreável.
- DEV e CEO autorizado acompanham todas as vendas/comissões; Comercial vê as suas. Baixa de comissão exige evidência/motivo e ator; não confundir venda recebida com comissão já paga.
- Percentual, primeira venda versus recorrência, descontos e estornos dependem de decisão comercial. Não inventar valores.

Contábil:
- CONTABIL acessa folhas de todas as empresas autorizadas, com seleção explícita de tenant/competência e auditoria; não recebe bypass geral sobre outros módulos.
- Reutilizar PayrollCalculationService/TimeClosing como base do motor oficial após testes de equivalência. TimeClosing orquestra o fechamento; não duplicar matemática num novo módulo accounting.
- Retirar constantes antigas após migração e validação; versionar tabelas/regras por competência e salvar snapshot das entradas e regras utilizadas. Validar regras fiscais/trabalhistas com responsável contábil.
- Cálculo automático, recálculo, ajustes manuais, comparação antes/depois, exportação e chamados. “Agente contábil” significa inicialmente usuário profissional; IA autônoma não foi solicitada nem faz parte desta fase.
- PayrollAdjustment: empresa, folha/fechamento, campo/verba, valor anterior/novo, motivo, responsável e data. A alteração deve afetar cálculo e PDF de forma rastreável.
- Folha fechada só muda por reabertura/ajuste autorizado, mantendo versões; controlar concorrência para não perder alterações.
- Reutilizar SupportTicket para chamados contábeis quando o modelo atender, com categoria/vínculo à folha, responsável, status e retorno ao solicitante. Não construir outro help desk completo.

Mobile e dashboard:
- Logo com largura máxima de 100%, proporção preservada e dimensão responsiva; remover dependência visual de 400x400.
- Dashboard por perfil: cabeçalho/filtro, até quatro indicadores prioritários, “Requer atenção”, atalhos e uma lista curta; detalhes em telas próprias.
- DEV/CEO: empresas, receita e alertas prioritários. Comercial: propostas/vendas/comissão. Contábil: folhas/correções/chamados. RH: pessoas/ponto/férias/pendências.
- “Tela única” significa visão inicial objetiva, não comprimir todas as funções em um viewport. Permitir rolagem vertical acessível quando necessário.
- Dados reais, sem indicadores fixos. Carregar apenas informações necessárias ao perfil e à tela; reduzir chamadas redundantes.
- Revisar login, cadastro, usuários, funcionários, menus, formulários, modais, facial, contratos/PDF, folhas e financeiro.
- Testar 320, 375, 390, 768 e 1440px; teclado virtual, zoom, foco, toque, contraste, drawer, estados vazios/erro e câmera. Tabelas devem ter visualização móvel ou rolagem localizada, sem overflow da página.

## 10. Ordem de execução com critérios de saída

| Lote | Entrega | Condição para avançar |
| --- | --- | --- |
| P0 | Link/cadastro/login mobile e testes que reproduzem falhas de provisória/facial/autorização | Cadastro correto; caminhos inseguros identificados e cobertos por testes; CEO ainda não liberado. |
| P1 | CEO/CONTABIL, catálogo de permissões, proteção do DEV e escopos | Testes de API negam criação de CEO fora do DEV, acesso cruzado e alteração direta/indireta do DEV. |
| P2 | Provisionamento comum, vínculo pessoal/trabalhista, provisória e sessão restrita | Ambos os cadastros conectam a mesma conta; segredo deixa de ser revelável após uso; sem duplicações. |
| P3 | Verificação facial real, cadastro pessoal do CEO, contrato versionado e PDF | Fluxo completo validado; sem bypass; solução biométrica e minuta aprovadas antes da liberação real. |
| P4 | Controles separados de facial/acesso/cobrança e integração Asaas | Pausa/retomada testadas em sandbox; faturas antigas preservadas; exceção financeira consistente. |
| P5 | Comercial, vendas e comissão | Autoria histórica e valores corretos; webhook repetido não duplica venda/comissão; estorno rastreável. |
| P6 | Contábil, motor único e correções/chamados | Casos de referência aprovados; ajustes auditados; folha fechada não é silenciosamente sobrescrita. |
| P7 | Dashboard por perfil, revisão responsiva global e regressão | Build/typecheck/testes/E2E executados e resultados registrados; navegação por papel validada. |

Executar lotes pequenos, sem reescrever a arquitetura Next.js + NestJS + Prisma + PostgreSQL + JWT + Asaas. Instalar dependências pelo lockfile existente; não atualizar frameworks incidentalmente. Cada lote entrega código, migração quando necessária, testes e resumo das decisões.
Mudanças no contrato legal/fornecedor biométrico podem bloquear P3 sem bloquear os demais lotes. Usar feature flag para impedir ativação incompleta do CEO.

## 11. Testes obrigatórios

1. CEO não nasce via cadastro público, Comercial, RH, importação ou API sem DEV; permissões customizadas não burlam a regra.
2. CEO não altera DEV direta/indiretamente: User, Employee, reset, facial, empresa, exclusão em cascata, sessão, impersonação e configuração.
3. CEO pendente não usa APIs administrativas; etapas fora de ordem, URLs diretas, múltiplas abas e retorno após interrupção não liberam acesso.
4. Usuários/Funcionários criados simultaneamente não duplicam conta, vínculo ou licença; e-mail de outra empresa não é apropriado.
5. Cada provisória é diferente; vencimento/reemissão funcionam; após troca o endpoint recusa revelação e a senha definitiva não aparece em nenhuma resposta/log.
6. Revelação de provisória respeita empresa/equipe/carteira e hierarquia; CEO não revela a do DEV; usuário sem permissão não obtém segredo pela API.
7. Troca de senha revoga sessões antigas e mantém uma sessão nova válida para seguir o onboarding, inclusive no mesmo segundo.
8. Facial rejeita [], amostra inválida, imagem/requisição repetida, prova vencida, prova de outro usuário/documento e liveness forjado. Falta de câmera não equivale a sucesso.
9. CEO preenche seus dados; DEV não consegue “assinar pelo CEO” somente por conhecer a provisória. A verificação de identidade/assinatura precisa distinguir o signatário real.
10. Mudança no contrato invalida desafio da versão anterior; assinatura concorrente é idempotente; PDF baixado corresponde ao hash/versionamento assinados.
11. Comercial/outro cliente não baixa contrato societário por adivinhar ID/URL; notificação lida não apaga o contrato; assinado não é alterado em lugar.
12. Cobrança pausada + exceção de acesso vigente permite uso; suspensão de segurança ainda bloqueia; webhook/cron não desfaz exceção indevidamente.
13. Falha Asaas não aparece como pausa concluída; reativação usa data explícita; faturas existentes não são marcadas pagas/canceladas por acidente.
14. Comissão não duplica com evento repetido nem existe sem base elegível; troca de vendedor atual não altera o histórico.
15. Folha automática/manual/PDF usam as mesmas regras e arredondamentos; ajuste exige motivo; regressões cobrem as competências relevantes.
16. E2E por papel em mobile/desktop: cadastro, convite, troca de senha, CEO, câmera negada, contrato/PDF, financeiro e navegação.

Migração/segurança operacional:
- Backup e ensaio de restauração antes da implantação; migrações aditivas e compatíveis com rollout coordenado API/web/enum.
- Vincular usuários existentes somente após validação; preservar IDs, contratos, folhas, cobranças e hashes atuais. Não regenerar senhas de todos em massa.
- Segredos de criptografia fora do banco/código; rotação e retenção de backups definidas. Não inserir dados pessoais reais em fixtures.
- Desabilitar novas funções por feature flag para rollback de aplicação; não apagar enums/dados históricos como rollback automático.
- Não chamar Asaas de produção, disparar convites ou alterar dados reais em testes. Deploy e migrações de produção exigem autorização própria.

## 12. Mapa do código para evitar nova varredura completa

Raiz local examinada: /workspace/scratch/1c71b8d61426/innovation
Na próxima execução, resolver a raiz real do checkout; os caminhos abaixo identificam os arquivos atuais, não garantem que o workspace temporário persistirá.

| Área | Arquivos de partida |
| --- | --- |
| Dados/perfis | /workspace/scratch/1c71b8d61426/innovation/apps/api/prisma/schema.prisma ; /workspace/scratch/1c71b8d61426/innovation/apps/api/src/common/types/auth.types.ts |
| Permissões | /workspace/scratch/1c71b8d61426/innovation/apps/api/src/common/guards/roles.guard.ts ; /workspace/scratch/1c71b8d61426/innovation/apps/api/src/modules/platform/global-permissions.service.ts ; /workspace/scratch/1c71b8d61426/innovation/apps/web/app/lib/permissions.ts |
| Contas/vínculos | /workspace/scratch/1c71b8d61426/innovation/apps/api/src/modules/users/users.service.ts ; /workspace/scratch/1c71b8d61426/innovation/apps/api/src/modules/users/users.repository.ts ; /workspace/scratch/1c71b8d61426/innovation/apps/api/src/modules/employees/employees.service.ts |
| Login/sessões/acesso | /workspace/scratch/1c71b8d61426/innovation/apps/api/src/modules/auth/auth.service.ts ; /workspace/scratch/1c71b8d61426/innovation/apps/api/src/common/guards/jwt-auth.guard.ts ; /workspace/scratch/1c71b8d61426/innovation/apps/api/src/common/guards/tenant.guard.ts ; /workspace/scratch/1c71b8d61426/innovation/apps/api/src/common/guards/subscription.guard.ts |
| Facial/termos | /workspace/scratch/1c71b8d61426/innovation/apps/web/app/components/FaceIDOverlay.tsx ; /workspace/scratch/1c71b8d61426/innovation/apps/api/src/modules/time-track/time-track.service.ts ; /workspace/scratch/1c71b8d61426/innovation/apps/api/src/modules/privacy/privacy.service.ts |
| Contratos/PDF | /workspace/scratch/1c71b8d61426/innovation/apps/api/src/modules/manual-contracts/manual-contracts.controller.ts ; /workspace/scratch/1c71b8d61426/innovation/apps/api/src/modules/manual-contracts/manual-contracts.service.ts ; /workspace/scratch/1c71b8d61426/innovation/apps/web/app/[tenant]/dashboard/management/notifications/page.tsx |
| Cobrança | /workspace/scratch/1c71b8d61426/innovation/apps/api/src/modules/finance/asaas.service.ts ; /workspace/scratch/1c71b8d61426/innovation/apps/api/src/modules/finance/platform-finance.service.ts |
| Folha | /workspace/scratch/1c71b8d61426/innovation/apps/api/src/modules/payroll/payroll.service.ts ; /workspace/scratch/1c71b8d61426/innovation/apps/api/src/modules/time-track/payroll-calculation.service.ts ; /workspace/scratch/1c71b8d61426/innovation/apps/api/src/modules/time-track/time-closing.service.ts |
| Login visual | /workspace/scratch/1c71b8d61426/innovation/apps/web/app/login/page.tsx ; /workspace/scratch/1c71b8d61426/innovation/apps/web/app/cadastro/page.tsx ; /workspace/scratch/1c71b8d61426/innovation/apps/web/app/criar-conta/page.tsx ; /workspace/scratch/1c71b8d61426/innovation/apps/web/app/components/auth/AuthLayout.tsx ; /workspace/scratch/1c71b8d61426/innovation/apps/web/app/components/auth-split-layout.tsx |
| Telas de acesso | /workspace/scratch/1c71b8d61426/innovation/apps/web/app/[tenant]/dashboard/users/page.tsx ; /workspace/scratch/1c71b8d61426/innovation/apps/web/app/[tenant]/dashboard/users/_components/user-create-modal.tsx ; /workspace/scratch/1c71b8d61426/innovation/apps/web/app/[tenant]/dashboard/employees/page.tsx |

## 13. Decisões a confirmar antes dos respectivos lotes

- Participação exata do CEO, tipo do vínculo, cláusulas/poderes, dados do DEV/empresa e minuta societária aprovada. Não bloqueia P0–P2, mas impede emissão de contrato real.
- Solução de identidade, prova de vida e assinatura; custo, armazenamento, retenção e alternativa acessível. Não implantar uma integração paga sem aprovação.
- Prazo final de provisória (proposta: 24h), delegação ao Gestor/Comercial e política de gestão de outros CEOs.
- Se desabilitar facial deve alcançar também ponto/login; a assinatura societária permanece regra separada por padrão.
- Se “pausar pagamentos” inclui faturas já emitidas. O plano padrão pausa novas cobranças e permite acesso, sem apagar dívidas.
- Regras de comissão: percentual/base, primeira venda ou recorrência, estorno e quem aprova/paga.

## 14. Memória objetiva para a próxima execução

REPO: eduardo09e32y4rhf/innovation. BASE REVISADA: main@40abdd34.
ESTADO: somente plano/revisão; código não alterado; sem testes/build executados.
STACK: manter Next.js, NestJS, Prisma, PostgreSQL, JWT e Asaas.

META: cadastro público funcional; CEO e CONTABIL; COMERCIAL completo; DEV com RH/Contábil/Comercial; vendas/comissões rastreáveis; provisória individual; Users/Employees sincronizados; CEO com dados próprios/facial/contrato/PDF; pausa de cobrança sem bloqueio; UI mobile mínima.

INVARIANTES:
1. Só DEV cria/atribui CEO. CEO tem gestão global, nunca pode remover, alterar, assumir ou bloquear DEV direta/indiretamente; não herda segredos/infraestrutura.
2. Autorização = capacidade + escopo + alvo + estado, no backend. CustomPermissions não sobrepõem proteção do proprietário. Internos não podem ser criados em cadastro público.
3. Um provisionador para Usuários/Funcionários; vínculo por IDs, transação/idempotência e pré-cadastro sem emprego fictício. Perfil CEO não entra automaticamente na folha.
4. Terceiros criam acesso com provisória aleatória e troca obrigatória. Provisória cifrada temporariamente, revelação auditada e restrita; após troca/expiração ela deixa de ser revelável. Definitiva só hash, nunca exposta. Reset gera outra provisória.
5. CEO: convite → senha pessoal → informação de privacidade → facial real → seus dados → versão do contrato aprovada pelo DEV → nova verificação/assinaturas → PDF em Notificações/Contratos → ativação. Cada etapa validada na API.
6. Facial atual não é prova confiável: FaceIDOverlay envia [], serviço aceita descritor do cliente e fixa livenessOk. Corrigir e validar identidade/prova de vida antes de liberar contrato real. Nunca aceitar fallback automático como assinatura.
7. Contrato assinado é imutável: atualizar por nova versão/aditivo; cancelar/arquivar com retenção. Percentual CEO explícito e inferior a 100%; perfil não transfere quotas por si só. Minuta e método exigem revisão profissional.
8. Facial, acesso e cobrança independentes. Pausa é da assinatura da empresa; Asaas INACTIVE só para novas cobranças; retomada ACTIVE com nextDueDate. Não marcar dívida paga, não sobrepor suspensão de segurança.
9. Venda guarda vendedor/data/empresa/plano/valor e snapshots; comissão separada, idempotente e baseada na regra aprovada. commercialOwnerId não é histórico de venda.
10. Contábil usa motor único da folha, regras versionadas por competência, ajuste com motivo/antes/depois e chamado. Não duplicar motor nem assumir tabelas antigas corretas.
11. /login → /cadastro; /criar-conta redireciona. Logo responsiva; dashboard até 4 indicadores e pendências, detalhes fora; testar todo o projeto no celular.

ORDEM: P0 login + testes de falhas; P1 perfis/autorização/DEV; P2 contas/provisória; P3 facial/CEO/contratos; P4 cobrança/acesso; P5 vendas/comissões; P6 contábil/folha; P7 dashboard/mobile/regressão.
COMEÇAR: ler este plano, conferir git status/commit e diferenças desde a base; abrir apenas arquivos do lote. Preservar alterações do usuário. Não repetir a auditoria completa nem reescrever a arquitetura. Implementar e testar um lote por vez, registrando resultado e bloqueios. Não executar produção/cobrança real sem autorização.

## 15. Fontes oficiais consultadas em 02/10/2026

- LGPD, arts. 5º II, 6º e 11: biometria vinculada à pessoa é dado sensível; avaliar finalidade, necessidade, base legal e salvaguardas. https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- MP 2.200-2, art. 10: autoria e integridade de documentos eletrônicos; admite outros meios aceitos pelas partes além da certificação ICP-Brasil. Não determina que uma simples selfie seja suficiente. https://www.planalto.gov.br/ccivil_03/mpv/antigas_2001/2200-2.htm
- Código Civil, especialmente arts. 985, 997 e regras do tipo societário aplicável: perfil de software não substitui instrumento societário/formalidades. A configuração concreta requer advogado. https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm
- Asaas, atualização de assinatura: INACTIVE interrompe novas cobranças, mantém as existentes; ACTIVE exige nova nextDueDate na retomada. https://docs.asaas.com/reference/atualizar-assinatura-existente

## 16. Acompanhamento da execucao - atualizado em 02/10/2026

Esta secao registra o estado real apos a execucao do primeiro recorte do lote P0. O plano original continua sendo a especificacao de destino.

### 16.1 Entregas realizadas

- `/login` agora aponta para `/cadastro`.
- `/criar-conta` agora redireciona para `/cadastro`, evitando dois fluxos de cadastro concorrentes.
- A senha do cadastro publico foi alinhada com a API: minimo de 10 caracteres, maiuscula, minuscula, numero e simbolo.
- Foi incluida orientacao visual e validacao HTML (`minLength`) para a politica de senha.
- Foi adicionado teste E2E para o redirecionamento legado e para a orientacao de senha.
- O redirecionamento legado passou a preservar `planId`, `seats` e `ref`.
- P1 iniciado: `CEO` e `CONTABIL` adicionados ao enum Prisma, tipos, DTOs e catalogo de permissoes.
- Criada migracao aditiva `20261002000100_add_internal_platform_roles`.
- Criada protecao inicial para que perfis internos nao sejam criados por administradores de empresas; a identidade do DEV pode usar `PLATFORM_OWNER_USER_ID`, com fallback de migracao pelo e-mail existente.
- Adicionados testes unitarios para negar criacao de CEO/CONTABIL fora do DEV proprietario.
- Seed de permissoes globais ajustado para inserir apenas papeis ausentes, sem apagar customizacoes existentes.
- Controllers e menu de plataforma passaram a reconhecer CEO nas operacoes globais permitidas; exclusao/expurgo e permissoes globais continuam reservados ao DEV.
- Configuracao do Vitest ajustada para nao depender do binding SWC bloqueado no OneDrive; import legado de `bcryptjs` corrigido.
- O caminho do executavel Next no Playwright foi corrigido para o layout atual de dependencias na raiz.

Arquivos alterados:

- `apps/web/app/login/page.tsx`
- `apps/web/app/criar-conta/page.tsx`
- `apps/web/app/cadastro/page.tsx`
- `tests-e2e/tests/public-flow.spec.ts`
- `tests-e2e/playwright.config.ts`

### 16.2 Validacoes realizadas

- Typecheck do frontend: aprovado com `npm --prefix apps/web run typecheck`.
- Build da API: aprovado com `npm run build:api`.
- Typecheck do frontend apos os novos perfis: aprovado com `npm run typecheck:web`.
- Testes unitarios de usuarios/autorizacao: 2 arquivos e 8 testes aprovados.
- Revalidacao apos o seed aditivo: build da API, typecheck do frontend e `git diff --check` aprovados.
- Revalidacao do P1: build da API, typecheck do frontend e 5 testes unitarios de usuarios aprovados.
- Validacao consolidada P1/P2: schema Prisma valido, build da API, typecheck web e 8 testes unitarios aprovados.
- P2 iniciado: novas contas criadas pelo fluxo de Funcionarios/ASO recebem senha aleatoria individual gerada no servidor; a senha compartilhada `DEFAULT_EMPLOYEE_PASSWORD` deixou de ser usada nesses caminhos.
- Provisionamentos administrativos por Users/Platform passaram a iniciar com `forcePasswordChange=true`; cadastro publico continua sendo o unico fluxo que define senha definitiva diretamente.
- Criado `TemporaryCredential` com migracao aditiva, expiracao, consumo, revogacao e segredo cifrado usando `KMS_MASTER_KEY` fora do banco.
- Adicionados endpoints separados de revelacao e reemissao de provisoria, com escopo por ator/alvo, auditoria e `Cache-Control: no-store`; senha definitiva nao e retornada.
- Registro cifrado integrado aos provisionamentos de Employee, ASO e Platform; todos mantem troca obrigatoria e usam segredo individual.
- Revelacao/reemissao de provisoria limitada a 3 chamadas por minuto e troca definitiva remove a credencial provisoria na mesma transacao.
- P3 iniciado: facial incompleta agora fica bloqueada por `FACIAL_VERIFICATION_ENABLED`; o frontend nao envia mais descritor vazio, e a API rejeita vetores diferentes de 128 valores ou com numeros nao finitos.
- O caminho antigo nao pode promover imagem simples a facial validada; `livenessOk` nao e mais marcado como verdadeiro automaticamente.
- Aceite de privacidade foi separado da biometria: endpoint de termos rejeita selfie/descritor e nao coloca selfie bruta no PDF.
- `git diff --check`: aprovado.
- Dependencias E2E: instaladas pelo lockfile existente.
- E2E e build: nao concluidos. O Next ficou parado em `Starting...` no checkout dentro do OneDrive e o Playwright expirou aguardando o servidor.
- Nenhuma chamada de producao, Asaas, convite real ou migracao de banco foi executada.
- Os artefatos historicos do Playwright foram restaurados apos a tentativa interrompida.

Estado atual: cinco arquivos de codigo/teste estao modificados pelo recorte P0; arquivos locais nao rastreados preexistentes foram preservados; nenhum commit foi criado.

## 17. Plano para concluir a solicitacao

Executar cada lote isoladamente, mantendo feature flags para impedir ativacao incompleta do CEO. Registrar neste arquivo o resultado, os testes e os bloqueios de cada lote. Nao avancar sem cumprir o criterio de saida da secao 10.

### Fase 0 - fechar o P0

1. Diagnosticar o travamento do Next no OneDrive; preferir checkout ou diretorio temporario fora da sincronizacao, sem apagar arquivos do usuario.
2. Reexecutar `tests-e2e/tests/public-flow.spec.ts` em desktop e mobile.
3. Cobrir senha invalida/valida, preservacao de `planId`, `seats` e `ref`, e overflow nos breakpoints definidos.
4. Criar testes de reproducao para os riscos conhecidos de provisoria, facial e autorizacao, sem liberar CEO ou facial como assinatura.

Saida: cadastro publico funcional, testes executaveis e riscos de seguranca documentados.

### Fase 1 - P1: perfis e protecao do DEV

1. Mapear enum, DTOs, seeds, menus e guards.
2. Adicionar `CEO` e `CONTABIL` por migracao aditiva.
3. Centralizar capacidades e escopos no backend.
4. Fixar o DEV por ID estavel e proteger alteracao, exclusao, reset, sessao, facial, tenant, importacao, impersonacao e cascatas.
5. Garantir que somente DEV possa criar ou atribuir CEO, inclusive por API direta.

Saida: testes de API negam CEO fora do DEV, acesso cruzado e qualquer alteracao direta ou indireta do DEV.

### Fase 2 - P2: provisionamento e senha provisoria

1. Criar servico transacional unico para Usuarios, Funcionarios, Comercial e reset administrativo.
2. Vincular User, UserProfile e Employee por IDs estaveis, com idempotencia e pre-cadastro sem emprego ficticio.
3. Remover senha compartilhada e gerar provisoria criptograficamente aleatoria, com validade configuravel.
4. Guardar somente a provisoria cifrada temporariamente; definitiva somente em hash.
5. Restringir revelacao e reemissao por alvo, hierarquia, escopo, reautenticacao, limite e auditoria.
6. Implementar troca obrigatoria, revogacao de sessoes e renovacao segura.

Saida: nenhuma duplicacao de conta, vinculo ou licenca; provisoria deixa de ser revelavel apos uso ou expiracao.

### Fase 3 - P3: onboarding do CEO, facial e contrato

1. Implementar estados validados pela API: `INVITED`, `PASSWORD_CHANGE`, `FACE_ENROLLMENT`, `PROFILE_REQUIRED`, `CONTRACT_PENDING`, `ACTIVE`.
2. Separar captura, cadastro biometrico, identificacao e assinatura.
3. Aprovar solucao de prova de vida/identidade antes do uso real; nunca confiar em `descriptor`, `matched` ou `livenessOk` enviados pelo navegador.
4. Criar dados do CEO, contrato versionado, hash, desafio de uso unico, assinatura e PDF privado em Notificacoes > Contratos.
5. Liberar permissoes amplas somente apos versao correta e assinaturas exigidas.

Saida: fluxo retomavel sem bypass, contrato imutavel por versao e PDF correspondente ao hash assinado.

### Fase 4 - P4: acesso, facial cotidiana e cobranca

1. Separar estados de facial, acesso e cobranca.
2. Implementar pausa e retomada com sandbox Asaas, preservando faturas antigas e bloqueios de seguranca.
3. Aplicar uma politica efetiva unica no login, JWT, tenant e assinatura.

Saida: falha externa nao aparece como pausa concluida; pausa nao marca divida como paga nem libera bloqueio de seguranca.

### Fase 5 - P5: Comercial e comissoes

1. Criar livro historico de vendas com vendedor, autor, cliente, plano, ciclo, valor e snapshots.
2. Criar comissao separada, idempotente e baseada em regra aprovada.
3. Implementar elegibilidade, pagamento, cancelamento, reversao e webhook repetido sem duplicacao.

Saida: troca do vendedor atual nao altera vendas antigas e nenhuma comissao nasce sem base elegivel.

### Fase 6 - P6: Contabil e folha

1. Reutilizar `PayrollCalculationService` e `TimeClosing` como motor oficial.
2. Versionar regras por competencia e salvar snapshot das entradas.
3. Implementar ajustes com motivo, antes/depois, responsavel e auditoria.
4. Reutilizar `SupportTicket` para chamados contabeis quando aplicavel.

Saida: calculo, ajuste e PDF usam as mesmas regras; folha fechada nao e sobrescrita silenciosamente.

### Fase 7 - P7: interface, regressao e entrega

1. Revisar dashboard por perfil, logo responsiva, estados vazios/erro, acessibilidade e tabelas moveis.
2. Validar 320, 375, 390, 768 e 1440px, teclado, zoom, foco, toque e camera.
3. Executar typecheck, lint, build, testes unitarios, contrato, seguranca e E2E por papel.
4. Fazer backup e ensaio de restauracao antes de migracoes.
5. Revisar diff, preservar arquivos locais do usuario, registrar decisoes e somente depois preparar commit/deploy autorizado.

## 18. Criterio de conclusao

A solicitacao somente sera considerada concluida quando P0-P7 tiverem saida comprovada, os 16 testes obrigatorios estiverem cobertos, build/typecheck/testes/E2E tiverem resultados registrados, as decisoes juridicas, biometricas e comerciais pendentes estiverem aprovadas e nao houver chamada de producao sem autorizacao explicita.

## 19. Status por ordem de facilidade - atualizado em 02/10/2026

### 19.1 Feito

1. Login: link de criacao de conta corrigido para `/cadastro`.
2. Rota legada: `/criar-conta` redireciona para `/cadastro`.
3. Senha publica: frontend alinhado com a API, exigindo 10 caracteres, maiuscula, minuscula, numero e simbolo.
4. Orientacao de senha: mensagem visivel e `minLength` adicionados ao formulario.
5. Teste E2E: cobertura do redirecionamento legado e da orientacao de senha adicionada.
6. Playwright: caminho do Next ajustado para as dependencias instaladas na raiz.
7. Typecheck do frontend executado com sucesso.
8. `git diff --check` executado com sucesso.
9. Nenhuma operacao de producao, Asaas, convite real ou migracao de banco executada.

### 19.2 Falta - ordem recomendada

1. **Fechar a validacao do P0**: fazer o Next iniciar corretamente fora do bloqueio do OneDrive e passar os testes E2E publicos em desktop e mobile.
2. **Completar testes simples do cadastro**: senha invalida/valida, overflow e breakpoints de 320 a 1440px. A preservacao de `planId`, `seats` e `ref` ja foi implementada e coberta por teste E2E.
3. **Adicionar testes de seguranca existentes**: registrar testes de reproducao para senha provisoria, facial e autorizacao, sem ativar essas funcionalidades.
4. **P1 - perfis**: adicionar `CEO` e `CONTABIL` no enum, DTOs, seeds, menus e tipos compartilhados. Enum, DTOs, tipos compartilhados e permissoes ja foram atualizados; ainda faltam menus, seeds e revisao completa dos controllers.
5. **P1 - protecao do DEV**: fixar o DEV por ID e bloquear alteracoes diretas/indiretas por CEO, imports, lotes, impersonacao, sessoes, facial, tenant e cascatas. A identificacao por ID/configuracao foi iniciada; a cobertura de todos os caminhos ainda falta.
6. **P1 - autorizacao**: centralizar capacidade, perfil, escopo, alvo e estado no backend; impedir CEO fora do DEV e perfis internos no cadastro publico.
7. **P2 - provisionamento**: unificar Usuarios e Funcionarios, ligar User/UserProfile/Employee por IDs e garantir transacao/idempotencia.
8. **P2 - senha provisoria**: remover senha compartilhada, gerar provisoria aleatoria, cifrar temporariamente, auditar revelacao e revogar apos uso/expiracao. Users, Employee, ASO e Platform ja gravam a provisoria cifrada; rate limit e remocao apos troca foram implementados. Ainda falta reautenticacao reforcada e ajustar o reset administrativo para sempre gerar uma nova provisoria.
9. **P2 - sessao**: obrigar troca, revogar sessoes antigas e emitir sessao coerente para continuar o onboarding.
10. **P3 - onboarding do CEO**: implementar estados validados pela API, sem liberar acesso administrativo fora da etapa correta.
11. **P3 - facial**: substituir o fluxo inseguro por verificacao real aprovada; rejeitar vetor vazio, liveness forjado, repeticao e prova de outro usuario. O bloqueio de seguranca, a validacao estrutural e a separacao do aceite foram implementados; ainda falta integrar fornecedor/prova de vida real e desafios de uso unico.
12. **P3 - contrato**: criar versao imutavel, desafio unico, assinaturas, hash e PDF privado em Notificacoes > Contratos.
13. **P4 - cobranca/acesso**: separar facial, acesso e cobranca; validar pausa/retomada em sandbox Asaas sem apagar dividas ou liberar bloqueio de seguranca.
14. **P5 - Comercial**: criar historico de vendas e comissoes idempotentes com snapshots e estornos rastreaveis.
15. **P6 - Contabil**: consolidar o motor da folha, versionar regras, auditar ajustes e reutilizar chamados existentes.
16. **P7 - interface**: revisar dashboards por perfil, logo, acessibilidade, tabelas moveis, estados vazios e camera.
17. **P7 - regressao final**: executar lint, typecheck, build, testes unitarios, contrato, seguranca e E2E por papel.
18. **Entrega**: revisar diff, preservar arquivos locais, fazer backup/ensaio de restauracao, registrar decisoes e somente entao preparar commit e deploy autorizado.

### 19.3 Bloqueios e decisoes pendentes

- O servidor Next nao concluiu `Starting...` no checkout sincronizado pelo OneDrive; a validacao E2E depende de um diretorio local/temporario estavel.
- Ainda precisam de aprovacao: minuta e poderes do CEO, fornecedor de identidade/prova de vida, retencao biometrica, prazo da senha provisoria, regras de comissao e politica final de pausa de cobranca.
- O CEO e a assinatura facial nao devem ser liberados antes dessas aprovacoes e dos testes de seguranca.

## 20. Atualizacao de execucao - 02/10/2026

- Validacao apos facial e onboarding: `prisma:generate`, `build:api`, `typecheck:web` e testes unitarios direcionados passaram.
- Onboarding do CEO agora tem enum e migracao aditiva, inicia em `PASSWORD_CHANGE` quando provisionado, avanca para `FACE_ENROLLMENT` apos troca de senha e retorna o estado em login, `/me` e no contexto autenticado.
- O guard JWT deixou de aceitar qualquer URL contendo `change-password`; as rotas de troca e `/me` sao comparadas de forma exata.
- O estado de onboarding acompanha o usuario autenticado no backend e frontend, mas as telas/API de facial, perfil, contrato, assinatura e transicao para `ACTIVE` ainda nao foram implementadas.
- Ultima validacao: build da API aprovado, typecheck web aprovado, 2 arquivos/8 testes unitarios aprovados.
- Nenhuma migracao foi aplicada em banco e nenhuma operacao externa/de producao foi executada.

### 20.1 Auditoria dos lotes seguintes

- P4: a base ja possui estados de assinatura, guard e fluxo Asaas, mas nao foi encontrada uma operacao completa de pausar/retomar assinatura com idempotencia e teste de sandbox; lote permanece aberto.
- P5: ha propostas e auditoria de propostas, mas nao ha livro historico de vendas nem modelo idempotente de comissoes; lote permanece aberto.
- P6: `PayrollCalculationService` e `TimeClosingService` ja existem e os testes atuais passaram (2 arquivos/11 testes), mas ainda falta provar que folha, ajustes, fechamento e PDF usam um snapshot versionado unico; lote permanece aberto.
- P7: typecheck e builds direcionados passaram, mas E2E, lint, build web de producao e regressao por papel ainda nao foram concluídos.

- P4 avancou: assinatura ganhou estado `billingPaused`, timestamps e ator da pausa, com migracao aditiva; endpoints DEV/CEO de pausa e retomada mantem `billingStatus` e acesso independentes, auditam eventos e sao idempotentes quando ja estao no estado solicitado. A integracao externa nao foi chamada nesta execucao.
- P5 avancou: modelos de venda/comissao foram validados com relacoes inversas, migracao aditiva, modulo API, snapshot da venda, chave idempotente por referencia, restricao de carteira do Comercial e transicoes PENDING/ELIGIBLE/PAID/CANCELED/REVERSED. Testes do modulo: 2 aprovados; build e `prisma validate` aprovados.
- P6 avancou: `PayrollService` passou a usar `PayrollCalculationService` e tabelas tributarias da competencia, persistindo `calculationVersion` e `taxTableSnapshot` em migracao aditiva. Build API, typecheck web e 11 testes de calculo/fechamento passaram; ainda falta cobrir a rota de folha e validar PDF/regressao ponta a ponta.
- P7 avancou: lint web passou com warnings nao bloqueantes; build web passou em checkout temporario fora do OneDrive; testes unitarios completos passaram (38 arquivos/253 testes), contratos (5/38) e seguranca (5/35). E2E publico passou em desktop e mobile (10/10) no checkout temporario com Chromium 1228. O checkout principal ainda trava no Next por causa do OneDrive.
- P3 avancou na parte não biometrica: criados perfil próprio do CEO, contrato imutavel por versao/hash, PDF via `GeneratedDocument`, desafio com expiracao/uso unico e notificacao/rota de onboarding. A assinatura continua explicitamente bloqueada enquanto nao houver fornecedor/prova facial validada no servidor; nenhuma transicao automatica para `ACTIVE` foi criada.
- P3 acrescentou migracao de `CEOProfile`/`CEOContract`, emissao exclusiva pelo DEV, entrega em Notificacoes e endpoints de estado/perfil/contrato/desafio. API compilou e typecheck web passou; falta teste de integracao com banco e a decisao/integração do fornecedor facial.

Este plano é especificação técnica e organizacional, não minuta de contrato nem parecer jurídico/contábil.
