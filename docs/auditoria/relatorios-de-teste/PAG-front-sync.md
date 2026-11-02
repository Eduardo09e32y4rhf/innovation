# PAG-front-sync: telas de pagamento precisam pedir a conciliação

**Origem:** relatório `PAG-onda0.md` (o GET `/finance/company/status` deixou de gravar a baixa). **Gravidade:** alta (sem isso o cliente que acabou de pagar pode ficar preso na tela "Confirmando pagamento" até o webhook chegar).

## Problema
Depois da correção PAG-A2, `GET /finance/company/status` só lê. A baixa vem do webhook assinado ou de `POST /finance/company/sync-payment`. As telas `pagamento/retorno` e `[tenant]/fatura-pendente` esperavam o GET gravar e nunca chamavam o POST.

## Documentação
- HTTP (RFC 9110, seção 9.2.1): GET é método seguro, não deve ter efeito colateral. https://www.rfc-editor.org/rfc/rfc9110#name-safe-methods (regra conhecida; a página não foi aberta nesta sessão: **NÃO VERIFICADO**).
- Documentação interna: `docs/auditoria/relatorios-de-teste/PAG-onda0.md`.

## Correção
- `lib/api.ts`: `companyBilling.syncPayment()` (POST `/finance/company/sync-payment`).
- `pagamento/retorno`: chama a conciliação na 1ª consulta e a cada 4 (≈10 s) antes de `status()`.
- `fatura-pendente`: chama no clique manual, na 1ª consulta e a cada 4 automáticas (≈32 s); evita martelar o gateway.
- Falha da conciliação não derruba a tela (`catch` ignora e segue para o status).

## Testes (saída real)
- `tests/contract/billing-return-sync.spec.ts`: 3 casos. Com o código novo: 3 passam. Revertendo a tela de retorno: 1 falha (prova que o teste pega a regressão).
- `npm run typecheck:web`: sem erros.

## Sobra
- Não testado no navegador contra o Asaas real. Validar com um pagamento de sandbox: pagar, voltar ao sistema e ver o painel abrir.
