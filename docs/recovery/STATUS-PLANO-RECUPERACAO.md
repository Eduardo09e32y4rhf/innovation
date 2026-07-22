# Estado auditado do plano de recuperação

Branch de trabalho: `recovery/300-commits`  
PR de validação: #448  
Última revisão técnica: 21/07/2026

## Fechamento por bloco

| Bloco | Estado | Evidência principal |
| --- | --- | --- |
| 00 — Segurança e recuperação | Código concluído; operação externa pendente | `SECURITY.md`, segredos fora do Git e documentação de recuperação. Backup/restauração, rotação de credenciais e proteção da `main` dependem do ambiente de produção. |
| 01 — Arquitetura | Concluído | Legado removido e arquitetura oficial preservada. |
| 02 — CI e builds | Concluído no código | CI valida workspace, Prisma, lint, TypeScript, testes e builds com PostgreSQL 16 e Redis. |
| 03 — Autenticação e tenant | Concluído | Empresa real no login, sessão normal persistente, Ghost Mode isolado por aba e acesso suspenso tratado por perfil. |
| 04 — Cadastro público | Concluído | Plano/licenças obrigatórios, validações fortes, sessão criada e pagamento interno com cotação do backend. |
| 05 — Billing | Concluído no código | Cobrança inicial separada da recorrência, estado financeiro consistente, polling e expiração automática. |
| 06 — Webhook Asaas | Concluído no núcleo crítico | Token seguro, registro idempotente, estados de processamento, retry de falhas e cobertura de pagamento, estorno, chargeback e NFS-e. A homologação real depende do sandbox Asaas. |
| 07 — Planos e preços | Concluído | Preço centralizado em centavos, assinatura com licenças e testes determinísticos de cálculo. |
| 08 — Cupom e trial | Concluído no código | Hash HMAC do documento, resgate transacional, unicidade e painel DEV para cupons. |
| 09 — Contrato manual | Concluído | Cadastro, ativação, auditoria, assinatura manual e encerramento automático. |
| 10 — WhatsApp global | Concluído no código | Sessão global da plataforma, fila com retry e log marcado como enviado somente após sucesso do provedor. Número e sessão reais dependem do ambiente. |
| 11 — Importação Excel | Concluído | Template, validação, preview, token temporário, confirmação transacional e interface funcional. |
| 12 — Empresa e geolocalização | Concluído | Campos estruturados e proteção contra alteração pública de coordenadas, tema e tolerância. |
| 13 — Usuários e licenças | Concluído | Hierarquia, limite faturável, erro estruturado, histórico de senha e proteção contra autoexclusão. |
| 14 — Módulos RH | Recuperado e integrado | Módulos existentes preservados; importação de funcionários corrigida. Homologação funcional completa requer base de staging. |
| 15 — Mobile | Concluído no código | Drawer, overlay, fechamento na navegação e comportamento responsivo. Testes em aparelhos físicos são externos. |
| 16 — Painel da plataforma | Concluído | Navegação DEV, empresas, assinaturas, financeiro, cupons, contratos, acessos, WhatsApp, auditoria, arquivamento sem perda de histórico e KPIs operacionais. |
| 17 — Compliance | Documentação técnica concluída | Guias de Portaria 671 e LGPD sem alegação indevida de certificação. Validação jurídica formal permanece externa. |

## Validações automatizadas

O workflow do PR executa:

- validação da fundação do workspace;
- `prisma validate` e `prisma generate`;
- lint do frontend;
- typecheck da API e do frontend;
- testes automatizados da API;
- build da API e do frontend.

O PR só deve ser integrado à `main` com todos esses gates verdes.

## Ações que não podem ser concluídas apenas pelo repositório

- criar, restaurar e comprovar backup do banco de produção;
- rotacionar credenciais da VPS, banco, Redis, Asaas e WhatsApp;
- configurar proteção obrigatória da branch `main`;
- aplicar migrations primeiro em staging e depois em produção;
- homologar cobrança e webhooks no sandbox Asaas;
- conectar o número oficial do WhatsApp;
- executar revisão jurídica trabalhista e de privacidade;
- testar visualmente em dispositivos físicos.

Nenhuma dessas ações é marcada como concluída sem evidência do ambiente correspondente.

## Integridade do documento de origem

A cópia de `plano_recuperacao.md` disponível no repositório está truncada no início do Bloco 17 e contém literalmente o marcador `<truncated 11439 bytes>`. Este fechamento cobre integralmente os Blocos 00–16 legíveis e o conteúdo recuperável do Bloco 17; qualquer requisito existente apenas na parte ausente precisa ser comparado com uma cópia íntegra antes do deploy definitivo.
