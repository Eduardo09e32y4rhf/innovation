# O que falta para o Innovation RH entrar em produção

Última auditoria técnica: 21/07/2026  
PR de implementação: #450

O diagnóstico anterior foi confrontado com a `main` após a conclusão do plano de recuperação. Vários itens descritos como ausentes já estavam implementados; as lacunas de código comprovadas foram corrigidas na PR #450.

## Estado do código

| Área | Estado auditado |
| --- | --- |
| Build e CI | Concluído: TypeScript e ESLint bloqueiam o build, minificação restaurada, Prisma validado, schema aplicado em PostgreSQL de teste, testes e builds obrigatórios. |
| Login e sessão | Concluído: empresa real, tenant real, timeout de 15 segundos, cliente HTTP central, sessão normal e Ghost Mode separados, links de cadastro e retorno ao site. |
| Cadastro público | Concluído: plano, licenças e cupom chegam ao backend; sessão é persistida e o usuário segue para o pagamento interno. |
| Pagamento automático | Concluído no código: contrato unificado, cobrança aberta reutilizada, `autoCheckout=1`, polling, botão “Já paguei” e liberação após confirmação. |
| Preço e licenças | Concluído: backend calcula em centavos, ciclo semestral suportado, aumento imediato, redução agendada para renovação e memória do cálculo na fatura. |
| Webhook Asaas | Concluído no código: evento persistido por ID único, resposta após enfileiramento durável, worker assíncrono, retry, falha registrada e idempotência de notificações. |
| Permissões financeiras | Concluído: mutações e estornos exclusivos do DEV; COMERCIAL limitado às próprias empresas; ADMIN limitado ao financeiro do tenant. |
| Mobile | Concluído no código e coberto por smoke test em navegador desktop/mobile. |
| Plataforma administrativa | Concluído: empresas, assinaturas, financeiro, propostas, cupons, contratos, planos, acessos, WhatsApp, auditoria e KPIs reais. |
| Trial | Concluído no código: cupom único, expiração automática e proposta de conversão gerada cinco dias antes do término. |
| Segurança | Concluído no repositório: CodeQL, Dependabot, métricas, logs estruturados e verificações de inconsistência financeira/webhook/WhatsApp. |
| Compliance | Documentação técnica criada e afirmações absolutas de conformidade removidas da landing page. |
| Testes E2E | Ativo na CI: landing, login, cadastro, campos comerciais, compliance e ausência de overflow em desktop/mobile. |

## Gates automáticos obrigatórios

Cada PR para `main` executa:

- validação do workspace;
- `prisma validate` e `prisma generate`;
- aplicação do schema atual em PostgreSQL vazio;
- lint do frontend;
- typecheck da API e do frontend;
- testes automatizados da API;
- build da API e do frontend;
- smoke E2E com Playwright em desktop e mobile;
- análise CodeQL.

Execuções antigas do mesmo PR são canceladas automaticamente para evitar fila e resultados obsoletos.

## Pendências externas antes do primeiro deploy pago

Estas ações não podem ser concluídas somente alterando o Git:

1. Criar um backup verificável do banco atual e executar um teste de restauração.
2. Rotacionar credenciais de VPS, PostgreSQL, Redis, JWT, Asaas, WhatsApp, Loki e demais provedores.
3. Ativar proteção da `main`, Secret Scanning e exigir os checks da CI nas configurações do GitHub.
4. Baselinear o histórico de migrations no banco de staging. A sequência histórica começa referenciando tabelas legadas `companies/users` que não são criadas pelas migrations versionadas; por isso, um banco totalmente vazio deve usar o schema atual e receber um baseline formal antes de `prisma migrate deploy`.
5. Aplicar a nova migration de licenças/snapshot primeiro em staging e validar rollback.
6. Homologar no sandbox Asaas: cobrança inicial, recorrência mensal/trimestral/semestral/anual, atraso, estorno, chargeback, duplicidade e retry de webhook.
7. Conectar o número oficial do WhatsApp e comprovar envio, retry e alerta de falha.
8. Configurar alertas no Loki/monitoramento para os eventos `OPERATIONAL_ALERT` e ausência de `CRON_HEARTBEAT`.
9. Executar teste funcional de RH com dados controlados: escala, ponto, intervalos, feriados, banco de horas, ajustes, fechamento, reabertura e PDF.
10. Obter revisão jurídica sobre Portaria 671, documentos de ponto, retenção, exclusão e política LGPD.
11. Configurar o provedor de deploy. Falhas atuais da Vercel por limite de builds da conta não representam erro de compilação, mas impedem publicação automática.

## Critério objetivo de liberação

O MVP pago só deve ser publicado quando houver evidência em staging para:

- cadastro → cobrança → webhook → liberação;
- inadimplência → pagamento → reativação;
- trial → proposta → pagamento ou bloqueio;
- compra e redução de licenças;
- ponto → revisão → fechamento → PDF;
- login, menu, ponto e pagamento em celular;
- backup restaurável e alertas operacionais recebidos.

Enquanto uma pendência externa não tiver evidência, ela não deve ser marcada como concluída.
