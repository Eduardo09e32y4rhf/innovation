# Innovation RH Connect

Plataforma completa para gestão de pessoas, departamento pessoal, jornada, férias, folha, comunicação e recrutamento.

## Site oficial

**[innovationia.com.br](https://innovationia.com.br/)**

Conheça a solução, solicite uma apresentação e fale com a equipe comercial.

## Proposta do produto

O Innovation RH Connect transforma rotinas operacionais de RH em um único sistema web, com acesso por empresa, perfis de responsabilidade e histórico auditável.

A plataforma reduz planilhas e retrabalho reunindo:

- colaboradores, usuários, permissões e documentos;
- ponto, escalas, ocorrências, banco de horas e fechamento;
- férias, ausências e exames ocupacionais;
- folha com regras versionadas e snapshot do cálculo;
- chamados, notificações e comunicação interna;
- vagas, candidaturas e recrutamento Kanban;
- propostas, empresas, assinaturas, cobrança e comissões;
- contratos, PDFs, auditoria e operação da plataforma.

## Benefícios

- **Sistema único:** RH, gestores, colaboradores, contabilidade, comercial e operação trabalham no mesmo ambiente.
- **Operação simples:** ações resumidas, filtros, calendários, importações e históricos organizados.
- **Acesso em qualquer tela:** layout responsivo para celular, tablet, notebook e desktop.
- **Segurança por responsabilidade:** cada ação é validada por perfil, empresa, carteira, equipe e estado do recurso.
- **Escala para SaaS:** empresas e usuários isolados por tenant, com auditoria e políticas de acesso.

## Módulos

### Pessoas e acessos

Cadastro de funcionários, usuários vinculados, convites, senha provisória individual, troca obrigatória no primeiro acesso, perfis, permissões, documentos, ASO e desligamento com preservação de histórico.

### Jornada e ponto

Registro de entrada, saída e intervalos, escalas, regras, ajustes com motivo, aprovações, banco de horas, ocorrências, fechamento e relatórios. O fluxo facial é separado e só deve ser habilitado com validação técnica aprovada.

### Férias e ausências

Solicitação, aprovação, saldo, períodos aquisitivos, conflitos, calendário e documentos relacionados.

### Folha e contabilidade

Cálculo por competência, tabelas versionadas, snapshot da regra usada, ajustes auditáveis e chamados contábeis por empresa.

### Agenda, notificações e suporte

Agenda operacional, central de notificações, chamados, anexos, mensagens, histórico e SLA.

### Recrutamento

Vagas, portal público de carreiras, candidaturas, documentos, pipeline Kanban, publicação, pausa e encerramento.

### Comercial e plataforma

Planos, propostas, empresas clientes, carteira comercial, vendas idempotentes, comissões, assinaturas, cobrança, eventos financeiros, console DEV, contratos e auditoria.

## Perfis

| Perfil | Escopo |
| --- | --- |
| **DEV** | Controle global, configurações, auditoria e administração técnica. |
| **CEO** | Gestão operacional global autorizada, sem poder comprometer o DEV. |
| **COMERCIAL** | Propostas, vendas, empresas, carteira e comissões autorizadas. |
| **CONTABIL** | Folha, cálculos, correções e chamados contábeis. |
| **ADMIN** | Administração da própria empresa cliente. |
| **RH** | Pessoas, jornada, documentos, férias e folha da própria empresa. |
| **GESTOR** | Equipe, aprovações e indicadores delegados. |
| **FUNCIONARIO** | Uso próprio, ponto, documentos e solicitações autorizadas. |
| **CONSULTA** | Visualização autorizada, sem administração. |

Perfis internos não são atribuídos pelo cadastro público. A API é a autoridade final de autorização.

## Experiência visual

- Cores oficiais da marca preservadas.
- Cards, botões, campos e modais com bordas arredondadas.
- Uma ação principal por contexto.
- Estados de carregamento, vazio, erro, sucesso e sem permissão.
- Foco visível, navegação por teclado e alvos de toque adequados.
- Tabelas adaptadas para cards ou listas em telas estreitas.
- Portal público de vagas com identidade própria e acessibilidade consistente.

## Arquitetura

### Frontend

Next.js 14 com App Router, React, TypeScript, Tailwind CSS, Lucide Icons, Recharts e componentes compartilhados.

### Backend

NestJS, Node.js, TypeScript, API REST, JWT, guards de autenticação/tenant/assinatura/permissões, rate limiting, Helmet, auditoria e DTOs validados.

### Dados e infraestrutura

PostgreSQL, Prisma ORM, migrations aditivas, Redis, filas, Docker Compose e geração controlada de PDFs/documentos.

## Requisitos

- Node.js 20 ou superior.
- npm.
- Docker e Docker Compose.
- PostgreSQL e Redis, locais ou gerenciados.

## Instalação local

~~~bash
git clone https://github.com/Eduardo09e32y4rhf/innovation.git
cd innovation
npm install
docker compose -f docker-compose.yml up -d postgres redis
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
~~~

Preencha o .env com os valores do ambiente antes de iniciar os serviços:

~~~bash
npm run dev:api
npm run dev:web
~~~

Frontend: http://localhost:3000
API: http://localhost:3333

## Configuração

Nunca publique segredos no Git. Consulte .env.example, .env.test.example e .env.prod.example.

A produção normalmente exige:

- PostgreSQL e Redis;
- segredo forte do JWT;
- origens permitidas;
- e-mail;
- credenciais e webhook de cobrança;
- armazenamento de arquivos;
- chave de documentos, quando habilitada;
- fornecedor facial aprovado, quando aplicável.

## Comandos

~~~bash
npm run dev:web
npm run dev:api
npm run lint:web
npm run typecheck:web
npm run build:api
npm run build:web
npm run validate
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:studio
npm run test:unit
npm run test:integration
npm run test:contract
npm run test:security
npm run test:e2e
npm run test:all
~~~

## Deploy e instalação em produção

O modo recomendado é uma VPS ou servidor Linux com Docker Compose, domínio, HTTPS, PostgreSQL e Redis protegidos.

Fluxo:

1. Instalar Docker e Docker Compose.
2. Clonar uma versão revisada do repositório.
3. Criar .env a partir de .env.prod.example.
4. Configurar domínio e HTTPS.
5. Fazer backup do banco.
6. Validar a versão em staging.
7. Executar migrations aprovadas.
8. Subir os serviços.
9. Conferir API, login, filas, PDFs, cobrança e logs.

~~~bash
cp .env.prod.example .env
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
~~~

Atualizações devem usar commit ou tag aprovada, backup e janela de mudança. Não execute db:deploy em produção sem validação e autorização operacional.

## Segurança e privacidade

- Senhas definitivas ficam somente como hash.
- Senhas provisórias são individuais, temporárias e auditadas.
- Biometria não é aceita no endpoint de aceite de privacidade.
- Facial, cadastro biométrico e assinatura são fluxos separados.
- Dados sensíveis exigem finalidade e permissão compatíveis.
- Acesso multiempresa é validado no backend.
- Operações relevantes geram auditoria.
- Anexos suspeitos ficam em quarentena quando o antivírus não está disponível.
- A aplicação não substitui a proteção do servidor, banco, hospedagem ou repositório.

O produto não é parecer jurídico, contábil ou certificação biométrica. Essas decisões dependem de validação profissional e do fornecedor contratado.

## Estado atual

O repositório contém os lotes P0 a P7, a base de redesign responsivo e o histórico de evidências em test.md.

Validações recentes em checkout temporário:

- 38 arquivos e 253 testes unitários aprovados;
- 5 arquivos e 38 testes de contrato aprovados;
- 5 arquivos e 35 testes de segurança aprovados;
- build da API, typecheck e build web aprovados;
- E2E público validado em desktop e mobile.

Ainda exigem autorização explícita: migrations em produção, cobranças reais, liberação facial do CEO sem fornecedor validado e deploy operacional.

Plano detalhado: [test.md](test.md).

## Licença e contato

Este software é proprietário. Uso, cópia, modificação ou distribuição dependem de autorização do proprietário.

Para apresentação comercial, acesse **[innovationia.com.br](https://innovationia.com.br/)**.
