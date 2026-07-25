# 🩺 Diagnóstico Baseline Pré-Hardening — Commit `67a260b6`

Data de Registro: **25/07/2026**
Branch de Trabalho: `release/1.1.1-quality-hardening`
Tag de Congelamento: `pre-quality-hardening-67a260b6`

Este documento registra o estado exato da base de código do **Innovation RH Connect** antes do início das 10 fases do **Plano Mestre de Endurecimento de Qualidade e Testes Confiáveis**.

---

## 🛠️ 1. Comandos Executados & Resultados

| Comando | Resultado | Observações / Avisos |
| :--- | :--- | :--- |
| `npm ci` | 🟢 **Concluído** | 1010 pacotes instalados. Alertas de auditoria para dependências indiretas e 24 vulnerabilidades high a serem revisadas nas próximas fases. |
| `npm run check:workspace` | 🟢 **Concluído** | `[workspace-check] OK — estrutura base do workspace verificada.` |
| `npm run prisma:validate` | 🟢 **Concluído** | Schema canônico `apps/api/prisma/schema.prisma` 100% válido. |
| `npm run prisma:generate` | 🟢 **Concluído** | Prisma Client v6.19.3 gerado corretamente em `node_modules/@prisma/client`. |
| `npm run lint:web` | 🟡 **Com Avisos** | 0 erros impeditivos de ESLint/Next.js. Alertas de `react-hooks/exhaustive-deps` (dependências em hooks) e `no-img-element` (`<img>` no lugar de `<Image />`). |
| `npm run typecheck:api` | 🟢 **Concluído** | Compilação TypeScript do NestJS sem erros (`tsc -p tsconfig.json`). |
| `npm run typecheck:web` | 🟢 **Concluído** | Verificação de tipos do Next.js sem erros (`tsc --noEmit`). |
| `npm run test:api` | 🟢 **Concluído (1.65s)** | Executou **apenas** 4 testes unitários legados (`test/*.test.cjs`). |
| `npm run build:api` | 🟢 **Concluído** | Build de produção gerado na pasta `dist/` sem falhas. |
| `npm run build:web` | 🟢 **Concluído** | Bundle Next.js de produção gerado. Aviso sobre extração estática do `@vladmandic/face-api`. |

---

## 🧪 2. Testes Realmente Executados vs. Ignorados

### ✅ Testes Realmente Executados (`npm run test:api`)
Atualmente, o comando oficial `test:api` roda o runner nativo do Node apenas nos 4 arquivos legados em `test/*.test.cjs`:
1. `calcula preços oficiais para dez usuários`
2. `desconto incide somente sobre a base`
3. `rejeita quantidade de licenças inválida`
4. `valida CPF e CNPJ com dígitos verificadores`

### ❌ Testes Ignorados e Ocultos da CI Oficial
- **Testes em `src/` (Vitest/Jest/Supertest):** Novos testes ou arquivos `.spec.ts` criados junto aos módulos NestJS (como autorização de suporte e segurança de anexos) **não participam** do comando oficial atual.
- **Suíte E2E (`tests-e2e/`):** Não é executada na CI padrão. Além disso, testes E2E contêm verificações permissivas como `.catch(() => {})` e `.count() > 0`, capazes de mascarar falhas graves de regressão e aprovar cenários quebrados.

---

## 📊 3. Cobertura Atual de Testes

- **Geral da Base de Código:** **< 5%**
- **Módulos Críticos (Financeiro, Suporte, IA, Segurança, Documentos):** **~0% (Cobertura Automatizada Real em Regressão)**
- **Nota:** Os únicos fluxos devidamente cobertos no pipeline atual são cálculos de precificação na landing page e algoritmos puramente matemáticos de validação de CPF/CNPJ.

---

## 🚨 4. Rotas Quebradas & Divergências de Contrato (Frontend vs. Backend)

1. **Módulo de Suporte (Cliente):** O arquivo `apps/web/app/lib/api.ts` faz chamadas para rotas genéricas (`/support`), enquanto o NestJS expõe rotas especializadas como `/support/tickets`. Há divergência na estrutura de parâmetros de consulta, enums de status (`DOUBT` hardcoded no frontend vs. categorias do backend) e paginação.
2. **Painel DEV Suporte (`/platform/support`):** Falta de contrato rigoroso para alteração simultânea de responsável, prioridade e status; o frontend envia payloads que não correspondem estritamente aos DTOs esperados pela API NestJS.
3. **Anexos e Documentos:** Endpoints para envio e download de anexos em tickets não possuem suíte de contrato para validar streaming, inspeção de magic bytes e quarentena de antivírus.

---

## 🎭 5. Funcionalidades com Dados Fictícios (Fake / Demo Data)

1. **Páginas de Suporte (`apps/web/app/[tenant]/dashboard/support/page.tsx` e `platform/support/page.tsx`):** Ao falhar a comunicação com a API ou retornar 404/500, o frontend captura o erro com um `try/catch` e injeta chamados demonstrativos no estado local (ex: *"Acme Consultoria"*, *"TechSolutions Brasil"*, *"Stark Industries"*).
2. **Dashboard Operacional e MRR:** Estimativas que utilizam médias teóricas ou dados simulados em substituição ao cálculo relacional real das assinaturas no banco de dados.

---

## ⚠️ 6. Riscos de Deploy (Sem o Hardening)

1. **Vazamento de Dados Multi-Tenant:** Sem testes automatizados vermelhos para validar blindagem por `companyId` e `commercialOwnerId`, modificações em rotas podem permitir que usuários de uma empresa visualizem chamados ou notas internas (`INTERNAL_NOTE`) de outra.
2. **Falsos Positivos de Qualidade:** O uso de `.catch(() => {})` e mocks visuais permite que a aplicação seja implantada com endpoints indisponíveis ou quebrados, pois a tela "finje" funcionar com dados fictícios.
3. **Descontrole Financeiro e de IA:** A ausência de testes determinísticos para retentativas de webhooks do Asaas e para persistência de consumo na tabela `AiUsageLog` representa risco de divergência de faturamento e explosão de custos na API da OpenAI.
4. **Segurança no Upload de Arquivos:** Sem verificação automatizada de magic bytes e quarentena, o upload público de anexos está suscetível ao envio de arquivos maliciosos disfarçados com extensões `.pdf` ou `.png`.

---

## 🎯 Conclusão da Fase 0

O estado baseline está registrado e congelado na tag `pre-quality-hardening-67a260b6`. A partir de agora, avançamos para a **Fase 1**, criando a fundação de testes isolados (`docker-compose.test.yml`, `Vitest`, `Playwright`) para aplicarmos TDD real e eliminarmos todos os riscos acima identificados.
