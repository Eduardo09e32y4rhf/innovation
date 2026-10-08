# Plano completo do Robô QA crítico

Este plano valida o produto como um sistema inteiro, e não apenas como um conjunto de páginas que abrem.

## Regras de execução

- Cada execução usa contas e empresas de teste isoladas; nunca produção, cartão ou gateway real.
- `leitura` é o padrão: navega, observa APIs e tenta acessos proibidos, sem salvar ou excluir.
- `completo` só é permitido com `--ambiente-teste`; cria dados descartáveis e limpa ao final.
- Cada perfil recebe contexto de navegador novo. O robô faz logout explícito e confirma a tela de login antes da conta seguinte.
- A rota atual é reutilizada: se já estiver na página pedida, não recarrega nem sai e volta.
- Toda etapa registra tela, console, erro JavaScript, request falho, status HTTP, duração da API e screenshot quando houver problema.

## Fases

### A — Descoberta e contrato

Ler rotas, menus, abas, botões, formulários e `data-testid`; comparar o menu com a matriz de autorização; encontrar rotas órfãs; marcar explicitamente tudo que não foi testado.

### B — Saúde técnica e APIs

Para cada ação registrar método, rota, status, duração e resposta. Esperar 200 para leitura, 201 para criação, 202 para processamento assíncrono, 204 para atualização/exclusão sem corpo, 400/422 para payload inválido, 401 para sessão ausente, 403 para falta de permissão, 404 para inexistência, 409 ou idempotência para duplicidade, 429 com `Retry-After` para limite e nenhum 5xx em fluxo normal. Verificar paginação, timeout, retries, CORS, cookies seguros, tokens fora do HTML/logs, XSS e injection.

### C — Fábrica de dados

Em ambiente de teste, gerar IDs únicos e criar empresa, plano/assinatura, usuários DEV/CEO, ADMIN, RH, RH_RS, CONTÁBIL, COMERCIAL, GESTOR, FUNCIONÁRIO e CONSULTA; cargos, departamentos, gestor-subordinado, permissões, funcionários, escala, férias, vaga, candidato, documento, fatura, cupom e pagamento simulado. Repetir a criação para provar idempotência e limpar somente os IDs criados.

### D — Autenticação e sessão

Para cada conta testar login válido/inválido, e-mail inexistente, campos vazios, bloqueio, logout, expiração/revogação, troca de conta sem herdar cookies/tenant, convite/ativação e MFA. No “Esqueci minha senha”, solicitar código, confirmar entrega no canal de teste, testar válido, expirado, usado duas vezes, errado e limite; definir senha, invalidar sessões antigas e entrar novamente.

### E — Matriz por perfil

Testar menu, rota direta, API e escrita para cada perfil. A regra deve ser consistente nas quatro camadas: item escondido, rota bloqueada, API 403 e nenhum dado vazado. Cobrir DEV/CEO/ADMIN/RH/RH_RS/CONTÁBIL/COMERCIAL/GESTOR/FUNCIONÁRIO/CONSULTA com os escopos de plataforma, pessoas, recrutamento, escala, férias, faturas e suporte definidos no código.

### F — Jornadas ponta a ponta

1. Criar empresa → cargos → convidar usuários → aceitar convite → atrelar usuários.
2. Gestor cria equipe → funcionário aparece no escopo → gestor só vê subordinados.
3. RH cria vaga → candidato → etapas → documentos → contratação (respeitando a regra do RH_RS).
4. Criar escala → publicar → funcionário consulta → gestor aprova ajuste.
5. Solicitar férias → aprovação → saldo e calendário atualizam.
6. Gerar fatura → testar abas de faturas, devolução e processamento de pagamentos → sucesso, falha, estorno, webhook repetido e duplicidade.
7. Aplicar cupom válido, expirado, já usado e incompatível.
8. Redefinir senha do gestor → confirmar código → logar como gestor → confirmar empresa, cargos e permissões.

### G — Segurança negativa e isolamento

Trocar IDs de empresa, usuário, fatura, vaga e funcionário na URL/corpo; elevar papel no payload; acessar outra empresa; usar token revogado; repetir mutações e enviar requisições paralelas. Deve haver bloqueio correto e zero dados de outra empresa.

### H — Resiliência e UX

Testar rede lenta, timeout, refresh durante gravação, duplo clique, voltar/avançar, upload inválido, paginação vazia, concorrência, rate limit, 390×844 e desktop; conferir overflow, foco, labels, contraste e mensagens acionáveis.

## Critério de conclusão

Todos os perfis configurados precisam de resultado; cada jornada deve ser `passou` ou `não testado` com motivo explícito; não pode haver 5xx, console error, tela quebrada ou permissão vazada. O relatório precisa conter APIs por status, rotas lentas, dados criados, limpeza e evidências.

## Comandos

```bash
node tools/robo-qa/robo.mjs --config=tools/robo-qa/robo.config.json --critico --semjanela
node tools/robo-qa/robo.mjs --config=tools/robo-qa/robo.config.json --critico --ambiente-teste --modo=completo --celular --semjanela
node tools/robo-qa/robo.mjs --demo --critico --modo=completo --semjanela --rapido
```

