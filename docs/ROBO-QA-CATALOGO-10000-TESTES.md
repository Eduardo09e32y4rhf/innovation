# Robô QA — catálogo de 10.000+ testes

Este é o plano operacional da execução longa. O objetivo não é abrir cada tela uma vez: é combinar identidade, empresa, recurso, ação, estado, permissão, transporte e concorrência para encontrar falhas reais.

## Meta e duração

- **Meta mínima:** 10.000 casos gerados; casos bloqueados por falta de fixture ficam registrados como `não executado`, nunca como aprovados.
- **Duração:** até 60 minutos por execução completa.
- **Modo rápido:** smoke de 15 minutos, amostra estratificada de cada família.
- **Modo completo:** todos os casos determinísticos da matriz, com até 4 workers por empresa e no máximo 2 mutações concorrentes no mesmo recurso.
- **Repetibilidade:** `RUN_ID`, seed, IDs criados e versão do código ficam no relatório; o mesmo seed reproduz o caso.
- **Segurança:** mutações somente em ambiente descartável com `--ambiente-teste`; pagamentos usam gateway fake/webhooks assinados de teste.

## Como a suíte chega a 10.000 casos

O catálogo é o produto cartesiano abaixo, com combinações inválidas filtradas por regra de negócio. A contagem é estimada antes de iniciar e a execução grava a lista final:

| Dimensão | Valores | Casos-base |
|---|---:|---:|
| Perfis | 10 (DEV, CEO, ADMIN, RH, RH_RS, CONTABIL, COMERCIAL, GESTOR, FUNCIONARIO, CONSULTA) | 10 |
| Empresas/escopos | 4 (própria, outra, sem vínculo, empresa suspensa) | 40 |
| Domínios | 12 (dashboard, funcionários, usuários, escala, férias, vagas, candidatos, plataforma, faturas, devoluções, pagamentos, suporte) | 480 |
| Ações | 10 (listar, filtrar, detalhar, criar, editar, excluir, aprovar, rejeitar, exportar, webhook) | 4.800 |
| Estados | 8 (vazio, válido, inválido, duplicado, expirado, cancelado, processando, concluído) | 38.400 |
| Transporte | 5 (desktop, mobile, rede lenta, timeout, offline/retorno) | 192.000 |

Depois dos filtros de compatibilidade, a suíte deve conservar pelo menos 10.000 casos. O alvo recomendado é 12.000–25.000, dependendo do tempo restante.

## Famílias obrigatórias

### 1. Instalação, configuração e saúde (300)

Verificar variáveis ausentes, banco vazio, migração nova, seed repetido, conexão perdida, health/readiness, logs estruturados, timezone, locale, upload, limites de payload, CORS e headers de segurança.

### 2. Autenticação e sessão (1.200)

Login válido, senha errada, e-mail inexistente, campos vazios, espaços e maiúsculas; sessão expirada, refresh, logout, logout em duas abas, token revogado, cookie alterado, CSRF, MFA, convite, ativação, troca de senha, senha provisória e política de complexidade.

### 3. Recuperação de senha (800)

Solicitar código; validar entrega no mailbox fake; código correto, errado, expirado, reutilizado, em maiúsculas/minúsculas, com espaços, limite de tentativas, reenvio, dois códigos simultâneos, nova senha válida/inválida, sessão antiga revogada e login posterior do gestor.

### 4. Empresa e multi-tenancy (900)

Criar empresa do zero, duplicar CNPJ, empresa suspensa, plano expirado, troca de empresa, usuário sem vínculo, usuário com dois vínculos, IDs de outra empresa, paginação, filtros e exportação. Nenhum endpoint pode devolver dados de outro tenant.

### 5. Usuários, funcionários e cargos (1.300)

Criar pela aba Usuários e pela aba Funcionários; vínculo automático; senha provisória; convite; cargo, setor, gestor, admissão, desligamento, reativação, duplicidade, e-mail já usado, edição concorrente, exclusão protegida do DEV e ocultação da senha depois da primeira troca.

### 6. Matriz de perfis e permissões (1.500)

Para cada perfil e cada domínio testar menu, rota direta, API, leitura, criação, edição, exclusão, aprovação, exportação e tentativa com papel adulterado. Esperar consistência: item oculto, rota bloqueada, API 403 e zero vazamento.

### 7. Dashboard (400)

Saudação, indicadores por perfil, empresa sem dados, filtros de período, timezone, loading, erro parcial, atualização, links, cards sem permissão, mobile, teclado e leitor de tela.

### 8. Funcionários, escala e férias (1.000)

CRUD, busca, paginação, importação, vínculo gestor-subordinado; escala publicada/rascunho, conflito de horário, troca, aprovação, feriado; solicitação de férias, saldo, aprovação/rejeição, cancelamento, período inválido e concorrência.

### 9. Recrutamento e seleção (900)

Vaga, responsáveis, candidato, etapas, documentos, entrevistas, notas, histórico, contratação, rejeição, upload inválido, documento de outro tenant e regra de que RH_RS não contrata quando configurado.

### 10. Plataforma, planos e assinaturas (500)

Empresas, usuários, planos, status da assinatura, limite atingido, upgrade/downgrade, cancelamento, período de carência, cupons, comissão comercial e acesso do CEO/DEV.

### 11. Faturas, devoluções e pagamentos (1.300)

Listar/detalhar fatura; abas permitidas; gerar; processar; aprovado; recusado; pendente; timeout; devolução total/parcial; estorno repetido; webhook fora de ordem; assinatura inválida; pagamento duplicado; `Idempotency-Key`; 200/201/202/204/400/401/403/404/409/422/429/5xx; conciliação entre API, banco e interface.

### 12. API, banco e contratos (600)

Método errado (405), payload incompleto (400/422), autenticação (401), autorização (403), inexistência (404), conflito (409), limite (429), timeout (504), contrato JSON, tipos, campos extras, paginação, ordenação, filtros e migração reversível.

### 13. Segurança ofensiva controlada (700)

IDOR/BOLA, privilege escalation, tenant escape, XSS refletido/armazenado, injection, path traversal, upload perigoso, token em URL, dados sensíveis em erro/log, replay, brute force e rate limit.

### 14. Resiliência, concorrência e UX (700)

Duplo clique, refresh durante gravação, duas abas, 2–10 requisições paralelas, retry, rede lenta, offline/retorno, back/forward, modal fechado, formulário abandonado, foco, contraste, overflow mobile e mensagens úteis.

## Jornadas críticas encadeadas

Cada jornada usa a mesma fábrica de dados e valida o estado após cada transição:

1. DEV cria empresa → CEO → cargos → usuários → vínculos → logout.
2. CEO acessa com senha provisória → troca senha → tenta editar/remover DEV e deve ser bloqueado.
3. ADMIN cria funcionário → sistema vincula usuário → funcionário entra e vê somente o próprio escopo.
4. RH cria vaga → candidato → documentos → entrevista → contratação.
5. GESTOR cria equipe → publica escala → funcionário consulta → gestor aprova ajuste.
6. Funcionário solicita férias → gestor aprova → RH confere saldo e calendário.
7. Sistema gera fatura → pagamento fake aprovado → webhook repetido → nenhum lançamento duplicado.
8. Pagamento recusado → reprocessamento → devolução parcial → estorno total → saldo e status coerentes.
9. Gestor solicita recuperação → código correto → nova senha → sessão anterior invalidada → login novo.
10. Usuário de empresa A tenta usar IDs da empresa B em UI e API → 403/404 sem vazamento.

## Execução em até 1 hora

1. Criar fixture e verificar contagem do catálogo.
2. Rodar primeiro os testes de contrato, autenticação e autorização.
3. Distribuir casos por família e empresa, mantendo a ordem dentro de cada jornada.
4. Repetir automaticamente falhas transitórias uma vez; segunda falha vira evidência.
5. Tirar screenshot, request/response sanitizado, logs e estado do banco somente para falhas.
6. Parar mutações quando ocorrer risco de dados reais, mas continuar testes de leitura e gerar alerta crítico.
7. Fazer limpeza transacional e validar que os IDs criados não permanecem.

## Critérios de aprovação

- 10.000 ou mais casos catalogados e executados/justificados;
- zero 5xx em fluxos normais;
- zero vazamento entre empresas;
- zero permissão proibida em UI, rota ou API;
- zero duplicidade em retry/webhook/duplo clique;
- recuperação de senha e logout comprovados;
- estados de fatura, devolução e pagamento iguais na interface, API e banco;
- nenhuma falha crítica sem evidência ou triagem;
- relatório com cobertura por perfil, aba, endpoint, status, jornada e ambiente.

