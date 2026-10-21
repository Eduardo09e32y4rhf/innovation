# Escopo para colocar a Innovation em produção (v1.0)

Documento único de planejamento: o que limpar, o que fazer, em quanto tempo, quem faz. Ele parte do estado real do repositório (levantamento de 21/10/2026) e de `docs/HANDOFF-QA-P0-P1.md` (bugs e frentes de QA em aberto) e `docs/PROXIMOS-PASSOS.md` (roteiro antigo, fases 1 a 8).

> **Premissas que precisam da sua confirmação** (marcadas com **[CONFIRMAR]**): o recorte do MVP (seção 2), a decisão do ponto eletrônico (D2) e as datas de início. Todo o resto deriva delas.

---

## 1. Resumo executivo

- **Objetivo:** primeiro cliente pagante usando em produção com segurança, números de folha conferidos por contador e cobrança funcionando.
- **Estratégia:** cortar escopo, fechar o miolo (ponto, folha, cobrança, recrutamento), validar com contador e cliente real, só então abrir.
- **Prazo estimado:** código do MVP fechado em ~4 semanas; beta fechado de 30 dias; **decisão de go/no-go em 21–27/12/2026 e lançamento em janeiro/2027** (mais cedo só se tudo correr sem atraso externo).
- **O que a IA acelera e o que não acelera:**
  - Acelera muito: implementar, testar, refatorar, limpar, documentar (dias em vez de meses).
  - **Não acelera:** validação do contador, parecer jurídico, resposta de gateways e prefeituras, pentest externo, o beta (um mês corrido de uso real, incluindo um fechamento de mês) e o tempo de virar o calendário. **Esse é o caminho crítico.**

### Números de partida

| Item | Hoje |
|---|---|
| Linhas TS/TSX | ~101 mil |
| Módulos da API / controllers / services | 39 / 71 / 116 |
| Tabelas / migrations | 134 / 35 |
| Telas | ~115 |
| Testes | ~1.500 (vitest) + Playwright em `tests/e2e` |
| Usos de `any` | 586 (API) + 187 (web) |
| Maiores módulos | finance 7,3 mil linhas, jobs 7,1 mil, time-track 4 mil |

---

## 2. Recorte do MVP (v1.0) **[CONFIRMAR]**

**Proposta:** *"Recrutamento + gestão de pessoas para PMEs"*, que é o que a landing page promete ("vagas e gestão da empresa, juntas").

### Entra na v1.0 (MANTER)
| Área | Módulos | Observação |
|---|---|---|
| Acesso | auth, users, companies, privacy | MFA obrigatório para perfis da plataforma; LGPD |
| Pessoas | employees, management (ASO/SST/eventos), documents, document-templates | |
| Tempo | time-track, schedule-hub, vacations, holidays | **ponto conforme decisão D2** |
| Folha para o contador | payroll, accounting | cálculo e fechamento; **sem eSocial** na v1 |
| Recrutamento | jobs (portal de vagas, funil, banco de talentos) | simplificar, LGPD |
| Cobrança da plataforma | finance, coupons | Asaas em produção |
| Operação (DEV/CEO) | platform, platform-hub, platform-audit, support, analytics | |
| Base | dashboard, notifications, mail, queue, lookup, welcome, onboarding | |

### Fica fora da v1.0 (CONGELAR: desligado por flag, fora do menu, sem manutenção)
ai, partners, commercial-sales, proposals, manual-contracts, ceo-onboarding, communication (WhatsApp não oficial: risco de bloqueio do número; só volta com a API oficial), promotions.

> Congelar **não** é apagar: o código fica no repositório atrás de `FEATURE_*=false`. Cada um volta como projeto próprio depois do lançamento.

### Não-objetivos da v1.0
eSocial automático, API pública, PWA offline, WhatsApp oficial, IA, marketplace de parceiros, recorrência no Mercado Pago (só Asaas), Postgres RLS (vai para a v1.1), app nativo.

---

## 3. LIMPAR

Regra: **nada é apagado sem evidência de que não é usado** (referência no menu, nos testes ou em outra tela). O primeiro passo de cada limpeza é um inventário gerado por agente. Quando houver dúvida, vira redirecionamento por 2 semanas e só depois sai.

| ID | O que limpar | Evidência atual | Ação | Critério de aceite |
|---|---|---|---|---|
| L1 | Módulos fora do MVP | ai, partners, commercial-sales, proposals, manual-contracts, ceo-onboarding, communication, promotions | Flag `FEATURE_*` (padrão desligado), sem rota no menu, rotas da API retornam 404 com a flag desligada | Menu e API sem vestígio com a flag desligada; testes do núcleo verdes |
| L2 | Fluxos duplicados no web | `cadastro` e `criar-conta`; `esqueci-senha` e `forgot-password` | Escolher um de cada, o outro redireciona (301) e depois é removido | 1 fluxo de cadastro e 1 de recuperar senha |
| L3 | Pastas duplicadas do painel | `colaboradores`/`employees`, `escala`/`escalas`, `ponto`/`time-track`, `faturas`/`finance` (a confirmar no inventário) | Unificar por domínio; links antigos redirecionam | 1 pasta por domínio; `grep` sem link para as removidas |
| L4 | Rotas legadas só redirecionando | 13 arquivos em `platform/*` ("Rota antiga mantida") | Atualizar links internos e remover os arquivos | 0 arquivos "Rota antiga mantida" |
| L5 | Módulos de API duplicados/vazios | `schedule` e `schedule-hub`; `people-management` (9 linhas, vazio) | Unificar escalas em um módulo; apagar o vazio | 1 módulo de escalas; testes verdes |
| L6 | Scripts de deploy e ajustes manuais | ≥5 variantes de deploy (`deploy-prod.sh`, `deploy_rapido.sh`, `deploy_vps.ps1`, `deploy_k8s.ps1`, `deploy/`), SQLs avulsos (`criar_tabelas_finance.sql`, `fix-migration-state.sql`, `fix-prod-migrations.sh`, `apply_styles.py`, `.bat`/`.ps1` locais) | Ficar com **um** fluxo de deploy documentado; o resto vai para `scripts/archive/` ou sai. **Produção só recebe `prisma migrate deploy`** | `README_SCRIPTS.md` descreve 1 caminho; CI valida o script |
| L7 | Dívida de tipos | 586 `any` na API, 187 no web | Zerar `any` em finance, payroll, time-track, auth, privacy; regra de lint como erro nesses diretórios; reduzir o resto em 50% | Lint sem `any` nos 5 módulos críticos |
| L8 | Arquivos gigantes | `platform-finance.service.ts` 1.623 linhas, `lib/api.ts` 1.246, `schedule.service.ts` 919, `auth.service.ts` 915, `dashboard/page.tsx` 945 | Quebrar por responsabilidade, sem mudar comportamento (testes antes e depois) | Nenhum arquivo de serviço > 600 linhas nos módulos críticos |
| L9 | Documentação | 20 arquivos em `docs/`, vários de organização pontual (`ORGANIZACAO-2026-10-03`, `REVISAO-SITES-2026-10-07`, `AGENT_CANVAS_MVP`) | Mover o obsoleto para `docs/archive/`; manter README, SECURITY, DEPLOY, HANDOFF, este escopo, manual do usuário | `docs/` com ≤ 10 arquivos vivos |
| L10 | Segredos e histórico | `PROXIMOS-PASSOS.md` cita senha exposta no histórico do git | **Verificar** se foi rotacionada; rodar varredura (gitleaks) no histórico inteiro; se houver, rotacionar tudo e `git filter-repo` | Varredura limpa; segredos rotacionados e registrados |
| L11 | Dados de teste e demonstração | usuários `qa-*`, "Race Test", empresas de teste, seeds de demonstração | Garantir que nenhum seed de demonstração rode em produção (já existe teste `no-demo-data-in-production`) e limpar bancos de staging | Staging e produção sem dado de teste |
| L12 | Testes órfãos | `tests/qa/` fora do CI | Migrar o que vale para `tests/unit`/`tests/e2e` e apagar o resto | 0 testes fora do CI |

---

## 4. FAZER

### 4.0 Decisões e insumos (responsável: **você**, antes de tudo)

| ID | Decisão / insumo | Por quê | Prazo |
|---|---|---|---|
| D1 | Confirmar o recorte do MVP (seção 2) e o público (PME de quantos funcionários?) | Define tudo | 23/10 |
| D2 | **Ponto eletrônico:** (a) vender como registro conforme a Portaria MTP 671/2021 (exige NSR, arquivos AFD/AEJ e, para REP-P, atestado técnico e termo de responsabilidade; **confirmar artigos no texto oficial**), ou (b) posicionar como controle gerencial dependente de acordo coletivo e tirar a promessa de "ponto legal" | Risco legal e esforço muito diferentes | 27/10 |
| D3 | Nomear o **contador** validador (2 a 3 horas por semana) e conseguir 3 meses de fechamentos reais anonimizados para teste | Sem ele não há "folha correta" | 27/10 |
| D4 | Nomear **jurídico/DPO** (encarregado LGPD) | Termos, privacidade, DPA, RIPD | 30/10 |
| D5 | Chaves e acessos: Asaas sandbox + produção, e-mail transacional (Resend/SES), domínio/DNS, acesso à VPS, Sentry, remoto de backup | Sem isso não testo o real | 27/10 |
| D6 | Escolher **2 a 3 clientes beta** dispostos a usar dados reais por 30 dias | O beta é o gargalo de calendário | 06/11 |
| D7 | Decidir: reativar funcionário reativa o login? MFA obrigatório para ADMIN de empresa? | Pendências abertas no handoff | 27/10 |
| D8 | Orçamento para **pentest externo** (1 semana) e **revisão humana sênior** (2 a 3 dias) de segurança/dinheiro | Código gerado por IA precisa de segunda opinião independente | 06/11 |

### 4.1 Qualidade e processo (Claude)

| ID | Entrega | Critério de aceite | Esforço agente | Semana |
|---|---|---|---|---|
| Q1 | Proteção da branch `main`: PR obrigatório, checks obrigatórios (`validate`, `unit`, `migrations-empty-db`, `integration`, `e2e`, CodeQL, secrets-scan), sem push direto | Merge bloqueado se qualquer check falhar | 2 h (+ você ativa a regra no GitHub) | S1 |
| Q2 | Playwright no CI com fumaça dos fluxos principais (login, funcionário, ponto, férias, vaga, fatura) | E2E verde em todo PR | 8 h | S1 |
| Q3 | Teste de contrato de **todas** as rotas (sem token, com perfil errado, corpo lixo, id inválido) no CI | 0 respostas 500; matriz perfil × rota versionada | 6 h | S1 |
| Q4 | Suíte de isolamento entre empresas em **todas** as rotas com `:id` | 0 respostas 2xx entre empresas | 8 h | S1 |
| Q5 | Testes de referência (golden) da folha com os fechamentos reais do contador | Diferença de R$ 0,00 em 3 meses históricos | 12 h + validação do contador | S2 a S4 |
| Q6 | Regras de commit: sem commits `wip` na `main`, PR com template, mensagens convencionais, `CODEOWNERS` para finance/payroll/auth | Regras ativas | 2 h | S1 |
| Q7 | Cobertura mínima por pasta (finance, payroll, time-track, auth ≥ 85%) | CI falha abaixo do mínimo | 4 h | S2 |
| Q8 | Rastreador de defeitos (issues) com severidade P0/P1/P2 e SLA | Todo defeito do handoff vira issue | 2 h | S1 |

### 4.2 Fechar o que está aberto do QA (Claude) — fonte: `docs/HANDOFF-QA-P0-P1.md`

Os dois bugs graves do handoff (dia da semana no fechamento do ponto e PATCH parcial de funcionário) **já foram corrigidos** na branch. Falta:

| ID | Entrega | Critério de aceite | Esforço | Semana |
|---|---|---|---|---|
| H1 | Isolamento entre empresas em todas as rotas + mass assignment (handoff 5.1) | Tabela rota → resultado; 0 vazamento | 8 h | S1 |
| H2 | Botões: duplo clique, confirmação de ações destrutivas, matriz perfil × botão, acessibilidade (5.4) | 5 cliques = 1 chamada; 0 divergência com `@Roles` | 12 h | S1 a S2 |
| H3 | Ponta a ponta + celular + navegadores (5.5) | ≥ 15 specs; 4 larguras sem rolagem horizontal; LCP ≤ 2,5 s | 10 h | S1 a S2 |
| H4 | Backup, restauração e resiliência com relatório numérico (5.6) | Restauração com diferença 0; Redis fora = 0 erros 5xx; banco fora = 503 e volta em ≤ 30 s | 6 h | S2 |
| H5 | Uploads e recrutamento: tabela de ataques, anti-spam, retenção do candidato, pipeline (5.8) | 100% dos vetores rejeitados | 10 h | S1 a S2 |
| H6 | Cálculo/operação: paginação, fechamento de mês bloqueado, férias em dobro (confirmar com o contador), jobs com lock, erros do WhatsApp, e-mail fora do ar (5.9) | 0 erros 500; lock testado com 2 instâncias | 10 h | S2 |
| H7 | Hub financeiro: estornos no resumo (já corrigido), tela de ajustes fiscais com os motivos novos (5.3) | Tela mostra todos os motivos | 3 h | S2 |

### 4.3 Núcleo do MVP (Claude, com validação humana)

| ID | Entrega | Critério de aceite | Esforço | Semana |
|---|---|---|---|---|
| M1 | **Ponto (conforme D2).** Opção (a): NSR sequencial por empresa, comprovante, exportação AFD/AEJ, trilha imutável, documentação do atestado técnico. Opção (b): ajustar textos e termos | Arquivos validados pelo jurídico; testes de sequência e imutabilidade | 20 h (a) / 4 h (b) | S2 a S3 |
| M2 | **Folha para o contador:** conferência dos cálculos contra os testes de referência; exportação de fechamento (planilha e PDF) com os eventos que o contador precisa para o eSocial; rescisão e 13º já existem (revisar média de variáveis, último mês, art. 477) | Contador aprova 3 meses históricos | 16 h + validação | S2 a S4 |
| M3 | **Cobrança em produção:** ciclo completo no **sandbox real** do Asaas (PIX, boleto, cartão), régua de inadimplência, conciliação ligada ao agendador, tratamento do cartão recusado, troca de plano com pró-rata | Ciclo verde no sandbox; divergência pós-conciliação = 0 | 14 h | S2 a S3 |
| M4 | **Nota fiscal da assinatura (NFS-e):** confirmar com o contador o município e o padrão nacional; emissão idempotente já existe, falta validar no ambiente real | 1 nota por fatura paga, cancelamento no estorno | 6 h + validação | S3 |
| M5 | **Recrutamento enxuto:** reduzir 12 controllers a um conjunto coerente; consentimento com prazo e anonimização do candidato vencido; conversão candidato → funcionário sem perda de campo | Fluxo vaga → contratação em 1 teste E2E | 12 h | S2 a S3 |
| M6 | **Onboarding da primeira empresa** (cadastro → importar funcionários por CSV → escalas → primeiro fechamento), e-mails transacionais com provedor real, estados vazios, mensagens de erro em português | Empresa nova chega ao primeiro fechamento sem suporte | 12 h | S3 |
| M7 | **Documentos:** modelos conferidos (holerite, espelho, recibo de férias, TRCT) com o jurídico/contador; assinatura do termo de uso já existe | Aprovação dos modelos | 6 h | S3 |
| M8 | **Painel DEV:** visitas do site (já pronto), saúde do sistema, fila de ajustes fiscais, auditoria | Painel mostra os 4 | 4 h | S3 |
| M9 | **Manual do usuário e ajuda dentro do sistema** (a partir de `docs/MANUAL-DO-USUARIO.md`) | Manual cobre o caminho do cliente beta | 6 h | S4 |

### 4.4 Segurança e conformidade

| ID | Entrega | Responsável | Critério de aceite | Esforço agente | Semana |
|---|---|---|---|---|---|
| S1 | Criptografia em nível de campo para CPF, salário e dados bancários (o `CryptoModule` já existe; estender e migrar dados) | Claude | Dado ilegível no banco; busca por CPF continua funcionando (hash de busca) | 12 h | S3 |
| S2 | Rotação de segredos, varredura do histórico e MFA obrigatório | Claude + você | Ver L10 | 3 h | S1 |
| S3 | CSP e cabeçalhos no front estático, HSTS, CORS restrito, rate limit no proxy | Claude | Nota A no teste de cabeçalhos | 4 h | S3 |
| S4 | Revisão de dependências (`npm audit`, atualizações de segurança) | Claude | 0 vulnerabilidades altas/críticas | 4 h | S2 |
| S5 | **Pentest externo** | Terceiro | Relatório sem item crítico/alto aberto | — | S4 a S5 |
| S6 | **Revisão humana sênior** de finance, payroll, auth, tenant guard | Humano | Parecer assinado | — | S3 a S4 |
| S7 | Documentos LGPD: política de privacidade e termos revisados, DPA para clientes, RIPD, registro das operações, canal do titular, plano de resposta a incidente (Resolução CD/ANPD nº 15/2024: **confirmar prazo na fonte**) | Jurídico/DPO (Claude redige as minutas) | Documentos aprovados | 6 h (minutas) | S2 a S4 |
| S8 | Retenção: tabela de prazos por tipo de dado e rotina automática (guarda adotada de 5 anos pós-desligamento precisa de parecer; há fontes citando 10 e 30 anos) | Jurídico + Claude | Parecer + rotina testada | 4 h | S3 |

### 4.5 Infraestrutura e operação

| ID | Entrega | Responsável | Critério de aceite | Esforço agente | Semana |
|---|---|---|---|---|---|
| O1 | **Ambiente de staging** idêntico à produção, deploy automático a cada merge | Claude (scripts) + você (VPS) | Merge na `main` publica em staging | 8 h | S2 |
| O2 | Produção: um único caminho de deploy com rollback, migrations seguras (ensaio em cópia do banco de produção) | Claude + você | Deploy e rollback ensaiados | 6 h | S2 |
| O3 | Monitoramento: Sentry, uptime externo, alertas Prometheus (erros, latência, fila, falha de webhook), painel de saúde | Claude + você | Alerta chega no celular em ≤ 5 min | 8 h | S3 |
| O4 | Backup diário **fora do servidor**, criptografado, com restauração testada toda semana e relatório | Claude + você | Último restore ≤ 7 dias e com diferença 0 | 4 h | S2 |
| O5 | Teste de carga com volume realista (50 empresas, 500 funcionários cada, fechamento do mês simultâneo) | Claude | p95 < 400 ms nas leituras; fechamento de 500 funcionários < 60 s | 6 h | S4 |
| O6 | Runbooks: incidente, queda do banco/Redis, rollback, webhook que falhou, estorno, restauração | Claude | Cada runbook ensaiado uma vez | 6 h | S3 |
| O7 | Página de status e canal de suporte com SLA | Você + Claude | Cliente beta sabe a quem chamar | 3 h | S4 |
| O8 | E-mail transacional com SPF/DKIM/DMARC e templates revisados | Claude + você | Entrega comprovada em Gmail/Outlook | 3 h | S3 |

### 4.6 Beta fechado e lançamento

| ID | Entrega | Responsável | Critério | Quando |
|---|---|---|---|---|
| B1 | Congelar `v1.0-rc1` (só correção de defeito a partir daqui) | Claude | Tag criada, changelog | 22/11 |
| B2 | Beta com 2 a 3 clientes (D6), dados reais, **incluindo 1 fechamento de mês completo e o 13º** (1ª parcela até 30/11, 2ª até 20/12) | Clientes + você | Fechamento do mês confere com o contador | 23/11 a 20/12 |
| B3 | Plantão de correção: P0 em 24 h, P1 em 72 h, correções entram em staging primeiro | Claude + você | SLA cumprido | durante o beta |
| B4 | Reunião de go/no-go com checklist da seção 7 | Você + contador + jurídico | Decisão registrada | 21 a 27/12 |
| B5 | Lançamento suave (convites) | Você | Primeiros clientes pagantes | janeiro/2027 |
| B6 | Primeiros 14 dias: monitoramento diário, revisão semanal de defeitos, congelamento de novas funcionalidades | Claude + você | 0 P0, ≤ 3 P1 abertos | janeiro/2027 |

---

## 5. Quem faz o quê

| Quem | Faz | Não faz |
|---|---|---|
| **Claude (agentes)** | Limpeza, refatoração, testes, correções, scripts de infra, documentação, minutas, relatórios, plantão do beta | Decidir escopo; falar com cliente; abrir contas/chaves; validar regra legal sozinho |
| **Você (dono do produto)** | Decisões D1 a D8, contas e chaves, VPS, clientes beta, aprovação final, regras do GitHub | Programar |
| **Contador** | Validar cálculos (3 meses históricos + 1 mês real do beta), NFS-e, férias/rescisão/13º | |
| **Jurídico/DPO** | Ponto (Portaria 671), termos, privacidade, DPA, RIPD, retenção, incidente | |
| **Revisor humano sênior** | Revisar dinheiro, autenticação e isolamento entre empresas; fazer o *code review* independente | |
| **Pentester externo** | Teste de intrusão e relatório | |
| **Clientes beta** | Usar com dados reais e reportar | |

---

## 6. Cronograma

Início da execução: **segunda, 26/10/2026**. A semana 0 (21 a 25/10) é só de decisões.

| Semana | Datas | Trilha técnica (Claude) | Trilha humana (você / terceiros) |
|---|---|---|---|
| S0 | 21–25/10 | — | D1, D2, D3, D5, D7 |
| S1 | 26/10–01/11 | Limpeza L1–L6, L10, L12; portão de qualidade Q1–Q4, Q6, Q8; H1, H2, H3, H5 | Ativar regras do GitHub; D4; contador recebe dados |
| S2 | 02–08/11 | Limpeza L7–L9, L11; H4, H6, H7; M1 (início), M2 (início), M3, M5; O1, O2, O4; S4 | D6, D8; jurídico revisa D2; contador valida lote 1 |
| S3 | 09–15/11 | M1–M8; S1, S3, S8; O3, O6, O8 | Contador valida lote 2; jurídico aprova termos |
| S4 | 16–22/11 | M9; O5, O7; hardening, correções do pentest; **congelar rc1 (22/11)** | Pentest externo e revisão sênior; contador valida lote 3 |
| S5–S8 | 23/11–20/12 | Beta B2/B3: só correções | Clientes usam; **fechamento de novembro**, **13º (30/11 e 20/12)** |
| S9 | 21–27/12 | Relatório final e checklist | Go/no-go (B4) |
| Janeiro | a partir de 04/01/2027 | B5/B6 | Lançamento suave |

### Esforço total estimado

| Bloco | Horas de agente | Observação |
|---|---|---|
| Limpeza (L) | ~40 h | quase todo paralelizável |
| Qualidade (Q) | ~44 h | |
| Fechar QA (H) | ~59 h | |
| Núcleo MVP (M) | ~80–96 h | M1 varia conforme D2 (4 h na opção b, 20 h na opção a) |
| Segurança (S) | ~33 h | fora o pentest e a revisão humana |
| Infra (O) | ~44 h | |
| **Total** | **~300–320 h de agente** | com 5 a 6 agentes em paralelo = **3 a 4 semanas corridas** |

Referência de comparação: o mesmo trabalho com uma equipe humana pequena levaria na ordem de 3 a 5 meses. **São estimativas de ordem de grandeza**, baseadas no ritmo observado em outubro/2026 (rodadas de 5 a 10 frentes que levaram de 5 a 15 minutos de agente cada). O que atrasa na prática: limite de uso do plano de IA (a execução com 10 agentes em paralelo atingiu o limite duas vezes), então o plano usa ondas de **5 a 6 agentes**, e respostas de terceiros.

---

## 7. Critérios de saída (checklist de go/no-go)

**Código e qualidade**
- [ ] `main` protegida; checks obrigatórios verdes (tsc, testes, E2E, CodeQL, secrets-scan, migrations em banco vazio)
- [ ] 0 respostas 500 no teste de contrato; 0 respostas 2xx entre empresas
- [ ] 0 `any` e 0 arquivo gigante nos módulos críticos
- [ ] Cobertura mínima atingida em finance, payroll, time-track e auth

**Dinheiro**
- [ ] Folha: diferença R$ 0,00 em 3 meses históricos e no fechamento real do beta (aprovado pelo contador)
- [ ] Cobrança: ciclo verde no sandbox e conciliação com divergência 0
- [ ] Todos os valores em `Decimal`; webhooks idempotentes comprovados
- [ ] NFS-e validada no município real

**Segurança e LGPD**
- [ ] Pentest sem item crítico/alto aberto; revisão sênior assinada
- [ ] CPF, salário e dados bancários criptografados
- [ ] Termos, privacidade, DPA, RIPD e plano de incidente aprovados pelo jurídico
- [ ] Segredos rotacionados; histórico do git limpo

**Operação**
- [ ] Staging e produção idênticos; deploy e rollback ensaiados
- [ ] Backup externo com restauração testada nos últimos 7 dias
- [ ] Monitoramento e alertas funcionando; runbooks ensaiados
- [ ] Teste de carga dentro das metas

**Negócio**
- [ ] 2 a 3 clientes beta usando por 30 dias sem P0; ≤ 3 P1 abertos
- [ ] Decisão do ponto (D2) cumprida e documentada
- [ ] Manual do usuário e canal de suporte definidos

---

## 8. Riscos principais

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Contador/jurídico demoram | Alta | Atrasa o go-live (caminho crítico) | Nomear já (D3, D4); lotes pequenos e semanais |
| Decisão do ponto (Portaria 671) muda o esforço | Média | +3 a 4 semanas | Decidir D2 na semana 0; opção (b) como saída |
| Cálculo de folha com erro em caso raro | Média | Alto (processo trabalhista do cliente) | Casos reais do contador; beta com fechamento real; aviso ao cliente de que o contador confere |
| Limite de uso da IA interrompe as ondas | Média | Atrasos de dias | Ondas de 5–6 agentes; trabalho retomável; commits por tema |
| Vazamento entre empresas | Baixa | Crítico | Suíte Q4 no CI, pentest, revisão sênior, RLS na v1.1 |
| Falha de cobrança em produção | Média | Alto | Sandbox real, conciliação, alerta de webhook |
| Beta no fim do ano (festas) reduz o uso | Média | Menos dados | Escolher clientes com folha ativa; o 13º é um bom teste real |
| Perda de dados | Baixa | Crítico | Backup externo + restauração semanal comprovada |
| Código gerado sem revisão humana | Alta | Médio/Alto | Revisão sênior (S6), pentest (S5), regras de PR (Q1, Q6) |

---

## 9. Como acompanhar

- Cada item acima vira uma issue com o ID (por exemplo `L3`, `M2`) e a severidade P0/P1/P2.
- Relatório semanal curto (feito por agente): o que fechou, o que travou, o que depende de terceiros.
- Métrica do projeto: **itens concluídos com teste e validação**, não número de commits.
