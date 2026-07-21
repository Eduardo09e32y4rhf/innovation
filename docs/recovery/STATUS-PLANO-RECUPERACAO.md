# Estado auditado do plano de recuperação

Branch de trabalho: `recovery/300-commits`  
PR de validação: #448

## Concluído ou recuperado

- arquitetura oficial e remoção do legado;
- gates de CI para Prisma, lint, TypeScript, testes e builds;
- contrato de autenticação com empresa real e tenant;
- sessão normal em localStorage e Ghost Mode isolado por aba;
- cadastro público com plano, licenças, validação de documento e senha forte;
- cobrança inicial separada de renovação e tela interna de pagamento;
- registro idempotente dos eventos Asaas;
- precificação central em centavos;
- assinatura com quantidade de licenças;
- cupom de trial único por hash do documento;
- hierarquia de usuários, senha forte e limite de licenças faturáveis;
- drawer mobile do dashboard;
- documentação inicial de segurança, Portaria 671 e LGPD.

## Ainda exige validação operacional externa

- rotação das credenciais e proteção da branch principal;
- backup e restauração do banco de produção;
- aplicação das migrations em staging antes de produção;
- webhooks e cobrança no sandbox Asaas;
- WhatsApp global com número real;
- revisão trabalhista e de privacidade;
- testes visuais em dispositivos físicos.

## Regra de fechamento

Nenhum item externo deve ser marcado como concluído sem evidência do ambiente correspondente.
