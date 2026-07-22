# O que falta para o Innovation RH ficar pronto

Para ser considerado **um SaaS pago pronto para produção**, o projeto ainda não está pronto. Minha estimativa técnica é:

```text
Funcionalidades existentes: aproximadamente 70%
Integração entre funcionalidades: aproximadamente 50%
Confiabilidade para produção: aproximadamente 40%
```

O maior problema não é falta de telas. É que os fluxos principais ainda não fecham de ponta a ponta.

# 1. Fazer o build realmente validar o projeto

Hoje o Next.js ignora erros de TypeScript e ESLint, e ainda desativa a minificação:

```js
typescript: {
  ignoreBuildErrors: true,
},

eslint: {
  ignoreDuringBuilds: true,
},

config.optimization.minimize = false;
```

A CI apenas instala, executa um “typecheck” limitado e compila API e web. Não executa testes, lint real, Prisma Validate, migrations em banco de teste ou E2E.

O `package.json` ainda possui scripts do Agent Canvas que não pertencem à arquitetura atual, e o chamado `typecheck:root` executa apenas `workspace-lint.cjs`.

**Para ficar pronto:**

```text
Ativar erros de TypeScript
Ativar ESLint
Reativar minificação
Validar Prisma
Executar testes da API
Executar testes E2E
Impedir merge com CI vermelha
Remover scripts antigos
```

---

# 2. Concluir o login e a sessão

O login ainda possui timeout de somente três segundos:

```ts
signal: AbortSignal.timeout(3000)
```

E ainda cria uma empresa falsa:

```ts
const nextCompany = {
  id: authData.user.companyId,
  name: 'Innovation RH System',
};
```

A tela também ainda não possui:

```text
Criar minha empresa
Voltar para o site
```

Ela termina somente com a recuperação de senha.

**Para ficar pronto:**

```text
Backend retornar empresa real
Frontend salvar id, nome e slug reais
Timeout de 15 segundos
Usar cliente HTTP central
Adicionar Criar minha empresa
Adicionar Voltar para o site
Separar sessão normal de Ghost Mode
Testar login em duas abas
```

---

# 3. Concluir o cadastro pela landing page

O cadastro lê a quantidade de usuários escolhida, mas não a envia ao backend:

```ts
// TODO: Passar seatQuantity para a API
// seatQuantity: Number(initialSeats),
```

Depois, recebe a sessão criada, mas não a salva. Ele redireciona diretamente ao Asaas ou volta para o login.

O DTO do backend ainda aceita apenas `planId`. Não possui `seatQuantity` nem `couponCode`.

**Para ficar pronto:**

```text
Enviar seatQuantity
Adicionar cupom opcional
Salvar token, usuário e empresa
Preservar sessão
Ir para tela interna de pagamento
Evitar duplo cadastro
Mostrar mensagens reais de CNPJ e e-mail duplicados
```

Fluxo final:

```text
Landing
→ plano
→ usuários
→ cadastro
→ sessão criada
→ pagamento interno
→ Asaas
→ confirmação
→ dashboard
```

---

# 4. Corrigir o pagamento automático

O frontend espera esta resposta:

```ts
{
  active,
  paymentUrl,
  invoice
}
```

Mas o status financeiro do backend retorna:

```ts
{
  company,
  plan,
  subscription,
  currentInvoice,
  usage
}
```

Ele não retorna `active`, `paymentUrl` nem `invoice`.

A tela depende de:

```ts
if (result.active)
```

para liberar o acesso. Portanto, frontend e backend ainda estão usando contratos incompatíveis.

A página também não lê o parâmetro:

```text
autoCheckout=1
```

Ela apenas verifica o status a cada 30 segundos e espera o ADMIN clicar para gerar ou abrir o pagamento.

**Para ficar pronto:**

```text
Unificar CompanyBillingResult
Restaurar autoCheckout
Reutilizar cobrança aberta
Impedir cobrança duplicada
Atualizar status automaticamente
Atualizar sessão após pagamento
Redirecionar ao dashboard
Manter botão Já paguei
```

---

# 5. Corrigir o cálculo por usuários

O motor de preço existe, mas a cobrança ainda utiliza:

```ts
company.maxUsers || 1
```

como quantidade faturada.

Isso está errado. `maxUsers` é limite técnico; não deve representar licenças compradas.

É necessário criar:

```text
CompanySubscription.seatQuantity
```

Exemplo:

```text
Licenças contratadas: 10
Usuários ativos: 8
Licenças disponíveis: 2
```

A criação do usuário número 11 deverá exigir compra de licença adicional.

Também falta aceitar o ciclo semestral. Hoje a assinatura só reconhece:

```ts
MONTHLY
QUARTERLY
YEARLY
```

Qualquer outro valor cai no mensal.

**Para ficar pronto:**

```text
Criar seatQuantity
Parar de usar maxUsers para cobrança
Backend ser fonte oficial do preço
Corrigir desconto duplicado
Suportar SEMIANNUALLY
Criar upgrade de licenças
Criar redução na próxima renovação
Salvar memória do cálculo na fatura
```

---

# 6. Tornar o webhook realmente idempotente

O webhook atual valida o token com comparação segura, atualiza a cobrança, ativa a empresa e salva NFS-e. Essa base é boa.

Porém, ele processa tudo diretamente durante a requisição. Não existe uma tabela persistindo o `payload.id` do evento antes do processamento.

Atualmente, eventos repetidos podem atualizar novamente a cobrança e disparar novamente notificações. O `asaasPaymentId` evita duplicar a fatura, mas não garante que o evento inteiro seja processado somente uma vez.

**Para ficar pronto:**

```text
Criar AsaasWebhookEvent
Chave única pelo ID do evento
Responder HTTP 200 rapidamente
Processar em fila
Retry controlado
Registrar falha
Impedir WhatsApp duplicado
Impedir notificação duplicada
Impedir liberação repetida
```

---

# 7. Fechar as permissões financeiras

O controller financeiro inteiro permite:

```ts
@Roles('DEV', 'COMERCIAL')
```

Isso inclui:

```text
Criar cobrança
Editar cobrança
Sincronizar
Excluir cobrança
Gerar cobrança manual
```

Isso é perigoso.

**Para ficar pronto:**

```text
DEV:
mutações financeiras e exceções.

COMERCIAL:
leitura limitada das próprias empresas.

ADMIN:
financeiro somente da própria empresa.

RH, GESTOR e FUNCIONÁRIO:
sem acesso financeiro global.
```

Remover da operação normal:

```text
Marcar manualmente como pago
Editar valor de mensalidade
Excluir fatura paga
Alterar status livremente
```

Contrato excepcional deve possuir módulo separado e ser exclusivo do DEV.

---

# 8. Corrigir o sistema no celular

A sidebar ainda utiliza:

```tsx
<aside className="sticky top-0 flex h-screen ...">
```

No celular, isso pode colocar uma sidebar de tela inteira antes do conteúdo. Também ainda falta uma arquitetura completa de drawer mobile.

**Para ficar pronto:**

```text
Sidebar escondida no celular
Botão Menu no topbar
Drawer lateral
Overlay
Fechar ao navegar
Cards em uma coluna
Tabelas com scroll interno
Modais com max-height
Botões com área mínima de toque
Sem overflow horizontal
```

Testar:

```text
360 × 800
390 × 844
412 × 915
768 × 1024
1366 × 768
```

---

# 9. Concluir os módulos administrativos

Ainda falta finalizar e interligar:

```text
Usuários e licenças
Importação Excel
Dados contratuais da empresa
Planos
Cupons
Trials
Propostas automáticas
Contratos manuais
Assinaturas
Financeiro
WhatsApp global
Auditoria
```

A área Plataforma precisa ser reorganizada em:

```text
Visão geral
Empresas
Assinaturas
Financeiro
Propostas
Cupons e testes
Contratos
Planos
Acessos
WhatsApp
Auditoria
```

Não basta melhorar o visual. Os indicadores devem vir de endpoints reais e as tabelas devem possuir paginação no backend.

---

# 10. Finalizar o núcleo de RH

Os módulos principais precisam passar por revisão funcional completa:

```text
Funcionários
Usuários
Escalas
Ponto
Fechamento
Férias
Gestão
Configurações
Notificações
```

Cada módulo precisa ter:

```text
Permissões no backend
DTOs consistentes
Tipos do frontend
Loading
Erro
Estado vazio
Responsividade
Auditoria
Testes
```

O módulo de ponto merece uma rodada própria de validação para:

```text
Escalas
Intervalos
Atrasos
Horas extras
Feriados
Banco de horas
Ajustes
Fechamento
Reabertura
PDF
```

---

# 11. Segurança e operação

Antes de produção:

```text
Rotacionar segredos expostos
Remover senhas de testes
Proteger a branch main
Ativar Secret Scanning
Ativar Dependabot
Ativar CodeQL
Backup automático do banco
Teste de restauração
Logs estruturados
Alertas de webhook e pagamento
Monitoramento de filas
```

Também deve existir um alerta para:

```text
Pagamento confirmado sem liberação
Empresa ativa com cobrança vencida
Assinatura sem ID do Asaas
Webhook falhando
WhatsApp falhando
Cron sem execução
```

---

# 12. Compliance

Antes de vender como sistema de ponto juridicamente completo:

```text
Revisar Portaria 671
NSR sequencial
Comprovante de ponto
Hash
Imutabilidade
AFD/AEJ, quando aplicável
Auditoria de alterações
Política LGPD
Retenção e exclusão
Controle de documentos
```

Enquanto isso, não utilize afirmações absolutas como:

```text
100% em conformidade
validade jurídica garantida
```

---

# O mínimo necessário para lançar

O projeto pode ser lançado como MVP pago quando estes fluxos passarem sem intervenção manual:

## Cliente novo

```text
Landing
→ Cadastro
→ Pagamento
→ Webhook
→ Liberação
→ Dashboard
```

## Cliente inadimplente

```text
ADMIN faz login
→ Acessa pagamento
→ Paga
→ Webhook
→ Empresa liberada
→ Equipe volta
```

## Trial

```text
Cupom
→ 30 dias
→ Proposta no dia 25
→ Pagamento ou bloqueio
```

## Licenças

```text
Compra 10
→ Cria até 10 usuários
→ Compra adicional
→ Próxima cobrança atualizada
```

## Ponto

```text
Funcionário bate ponto
→ Gestor revisa
→ RH fecha
→ PDF correto
```

## Mobile

```text
Login
→ Menu
→ Ponto
→ Funcionários
→ Pagamento
```

---

# Ordem final recomendada

```text
1. Build e CI
2. Login e sessão
3. Cadastro público
4. Pagamento automático
5. Webhook idempotente
6. Preço e licenças
7. Permissões financeiras
8. Responsividade
9. Módulos RH
10. Plataforma administrativa
11. Segurança e monitoramento
12. Testes E2E
13. Compliance
14. Release
```

**Resumo direto:** o projeto já possui bastante coisa construída, mas ainda precisa fechar os três caminhos que sustentam o negócio:

```text
Entrar
Contratar
Pagar e liberar
```

Enquanto esses três fluxos não estiverem automatizados e protegidos por testes, adicionar novas funcionalidades aumentará o risco de novas regressões.
