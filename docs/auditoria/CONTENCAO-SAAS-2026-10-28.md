# Primeira entrega de contenção SaaS — 28/10/2026

Base: `29fbbf5b6355475f480e10f9ab14cae553aee48c`. Referência: plano Innovation de SaaS de grande porte de 28/10/2026. Escopo autorizado: começar correções, sem trabalhar na integração WhatsApp.

## Alterações desta entrega

- Cadastro recebe o ator autenticado e verifica a permissão no serviço. RH não atribui ADMIN, inclusive na confirmação de importação. Todos os papéis solicitados na importação são verificados antes de gravar a primeira linha.
- Cadastro e edição verificam conflitos de acesso antes de gravar o funcionário. Isso contém os conflitos conhecidos, mas **não fornece atomicidade transacional** em falhas posteriores de banco, ASO ou credencial.
- Criação, edição, vínculo, desvínculo, desligamento e exclusão verificam o perfil atual da conta atingida e a proteção do proprietário. As rotas de acesso do CEO usam sua permissão de administração de contas sem lhe conceder leitura do dossiê individual.
- Listagem e ficha do GESTOR retornam uma lista explícita de campos profissionais. Dossiê completo de GESTOR retorna 403 antes de consultar documentos e saúde ocupacional; o contrato completo do dossiê dos perfis autorizados permanece intacto. PDFs continuam limitados pelas rotas existentes a RH/ADMIN/DEV.
- Identificação da própria ficha usa empresa + `userId`. E-mail não concede vínculo. Cadastros legados sem `userId` precisam de vínculo administrativo explícito.
- Vínculo de gestor é validado na empresa e não aceita autogestão.
- Paginação inválida retorna 400; padrões são 1 e 50, com máximos de 1.000.000 e 100. Lote de acesso é limitado a 100 itens, com UUID por item no DTO.
- DTOs recusam salário negativo/acima de Decimal(12,2), nome vazio/excessivo, textos excessivos e datas inválidas nos campos ajustados. Edição passa a aceitar ONBOARDING.
- Importação só gera/devolve senha quando realmente cria a credencial. Campos auxiliares da planilha não são enviados como colunas de Employee. O tratamento de usuário já existente e a concorrência da importação ainda exigem a evolução abaixo.
- Locks retornam token UUID por aquisição, têm TTL e são liberados por comparação/exclusão atômica Lua. Redis indisponível gera 503 no caminho de ponto; crons sem coordenação são adiados. Cache continua opcional. Um proprietário antigo não apaga o lock sucessor.
- Smoke Docker recebe DATABASE_URL exclusivamente de teste para carregar o módulo da API.

## Evidências

- `npm run prisma:generate`: aprovado.
- `npm run build:api`: aprovado.
- `npm run test:unit`: 226 arquivos; 2.745 testes aprovados e **56 falhas esperadas ainda abertas**. Falha esperada não é prova de correção.
- Novos testes unitários cobrem ator ausente, conta protegida, permissões atuais, projeção de campos, dossiê e vínculo de gestor.
- Novos testes em `tests/integration/employees/authorization-http.spec.ts` usam JWT e guards reais, ValidationPipe, HTTP e PostgreSQL; `tests/integration/redis/lock-ownership.spec.ts` usa duas conexões Redis reais. São executados pelo job de integração do CI. Não foram executados localmente: este ambiente não possui PostgreSQL/Redis/Docker.
- Os casos corrigidos S-01, S-03, S-05, S-06, S-08, S-09, Q-02, Q-07, Q-08, Q-11, Q-20 e QA-01 passaram a regressões normais. Parte dos casos agrupados incorretamente sob Q-03 também virou regressão; o restante permanece aberto.

A entrega está em branch para revisão e CI. Não equivale a instalação na VPS nem publicação de uma nova interface no Sites. Nenhum arquivo da integração WhatsApp foi alterado.

## Próximas entregas e limites

1. DAT-01/02/04/08: fronteira transacional para funcionário/ASO/usuário/credencial/vínculo, operação durável de importação, deduplicação concorrente, limites de licenças concorrentes e lotes com relatório reconciliado. Capturar erros dentro da transação única continua sendo problema aberto.
2. SEC-04/07: revisar todo o escopo multiempresa, CPF/e-mail, isolamento no banco, relações e contexto transacional. A unicidade global de CPF ainda não foi migrada.
3. Locks são leases: tarefas que ultrapassem o TTL ainda precisam de proteção no banco/fencing ou renovação adequada. Esta correção não certifica exclusão mútua de efeitos após expiração, nem entrega financeira exatamente uma vez.
4. INT-01/02/03/04: inbox/outbox, prazos de HTTP, reconciliação financeira, intenções de assinatura/estorno e envio real pelo worker de e-mail.
5. QUA/PLT: resolver os E2E da base, atualizar Next.js com migração própria, limites distribuídos, pools, objetos privados, réplicas, observabilidade, backup e restauração.
6. Rotação de segredos, infraestrutura de produção e decisões legais/comerciais dependem do ambiente/responsáveis; não foram declaradas concluídas.
7. Executar carga e estabilidade com 350/1.000 empresas na infraestrutura registrada. **Não há certificação de capacidade para mais de 300 empresas nesta entrega.**

WhatsApp permanece fora do escopo por solicitação do usuário.
