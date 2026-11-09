# Cadastro de recrutamento e teste gratis

O cadastro publico continua restrito ao plano `RS`. Na entrada, o usuario escolhe:

- **Empreendedor / pequena empresa (EMPLOYER):** divulga vagas e acompanha os candidatos da propria empresa.
- **Recrutador / consultoria (RECRUITER):** usa a conta de recrutamento para seus processos e contratos com clientes.
- **Candidato:** entra no portal separado e gratuito; nao cria empresa, assinatura ou cadastro no provedor de pagamento.

A escolha de uso e salva em `Company.recruitmentAccountType`. Nao e um novo papel de permissao: o responsavel continua `ADMIN` da propria empresa. Os controles existentes de tenant, permissoes e delegacao continuam obrigatorios.

## Empresa e assinatura

1. Informar nome do negocio/profissional, CPF/CNPJ valido, nome, e-mail e senha.
2. Escolher o plano R&S e a quantidade de vagas. A tela consulta o preco real pela API antes de concluir; falhas de cotacao impedem concluir com um preco nao confirmado.
3. Criar a empresa, administrador e assinatura. O teste usa `TRIAL_DAYS_DEFAULT` (30 dias por padrao), com uso unico por documento. Cupons de teste podem ampliar o prazo, conforme a regra existente.
4. Preparar somente o cadastro do cliente no provedor financeiro configurado. Com Asaas, vincular o identificador a empresa e assinatura; com Mercado Pago, o pagador e identificado no checkout. O cliente nao precisa abrir uma conta bancaria no provedor.
5. Uma indisponibilidade financeira devolve `billingSetupPending=true`, mantendo o acesso ao teste. A rotina existente de conciliacao pode reparar a integracao depois. Nenhuma fatura ou recorrencia e criada pela nova preparacao do cadastro financeiro.
6. Abrir diretamente Vagas e recrutamento, com orientacao para conferir o cadastro, criar uma vaga, publicar e compartilhar seu link. A conta do candidato pode ser reutilizada entre empresas, mantendo as candidaturas isoladas. A pagina da vaga oferece cadastro gratuito com retorno a mesma vaga.

## Final do teste

As regras ja existentes de avisos, cancelamento, primeira fatura, recorrencia e liberacao apos pagamento continuam no financeiro. O teste nao solicita cartao no cadastro. Uma assinatura que ja usou o teste vai para pagamento, com mensagem explicita, em vez de receber outro periodo gratuito.

## Implantacao e verificacao

Aplicar a migration `20261109170000_recruitment_account_type` antes de publicar a API. Ela adiciona somente a escolha de uso, com `EMPLOYER` para cadastros existentes.

Testes cobrem: acesso ativo na primeira sessao do teste, persistencia da escolha sem elevar permissoes, configuracao do prazo, falha do provedor sem perder a conta, vinculo financeiro sem cobranca e reutilizacao do cadastro em tentativas repetidas/concorrentes na mesma instancia. Nao houve criacao de contas ou cobrancas reais durante a validacao.

As tabelas de contratos/delegacoes/faturas de recrutamento declaram no Prisma os defaults de UUID e atualizacao que ja existem nas migrations SQL. Os lancadores E2E usam o script do workspace web para resolver o Next.js instalado ali.
