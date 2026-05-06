# 📦 ARQUITETURA MODULAR - INNOVATION.IA

**Reorganizar o projeto EXISTENTE em 8 módulos para desenvolvimento paralelo e limpo!**

---

## 🗂️ ESTRUTURA MODULAR (NOVA)

```
innovation.ia/
├── apps/
│   ├── 1-ia/                        # 🧠 AI Engine Workers
│   │   ├── resume_parser.py
│   │   ├── sentiment_analysis.py
│   │   ├── copy_generator.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── 2-whatsapp/                  # 📱 WhatsApp Baileys Service
│   │   ├── src/
│   │   │   ├── wbot.ts
│   │   │   ├── bot-builder/
│   │   │   ├── message-queue.ts
│   │   │   └── server.ts
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── 3-rh/                        # 👔 RH/ATS Module
│   │   ├── backend/
│   │   │   ├── src/
│   │   │   │   ├── jobs.controller.ts
│   │   │   │   ├── pipeline.controller.ts
│   │   │   │   └── services/
│   │   │   └── package.json
│   │   └── frontend/
│   │       ├── pages/
│   │       ├── components/
│   │       └── services/
│   │
│   ├── 4-financeiro/                # 💰 Payment Module
│   │   ├── backend/
│   │   │   ├── src/
│   │   │   │   ├── stripe.service.ts
│   │   │   │   ├── asaas.service.ts
│   │   │   │   └── subscription.controller.ts
│   │   │   └── package.json
│   │   └── frontend/
│   │       ├── pages/
│   │       └── components/
│   │
│   ├── 5-contabilidade/             # 📊 Accounting Module
│   │   ├── backend/
│   │   │   ├── src/
│   │   │   │   ├── finance.controller.ts
│   │   │   │   ├── invoice.service.ts
│   │   │   │   └── tax.service.ts
│   │   │   └── package.json
│   │   └── frontend/
│   │       ├── pages/
│   │       └── components/
│   │
│   ├── 6-media/                     # 📸 Media Module
│   │   ├── backend/
│   │   │   ├── src/
│   │   │   │   ├── s3.service.ts
│   │   │   │   └── upload.controller.ts
│   │   │   └── package.json
│   │   └── frontend/
│   │       ├── pages/
│   │       └── components/
│   │
│   ├── 7-infra/                     # 🏗️ Infrastructure
│   │   ├── docker/
│   │   ├── kubernetes/
│   │   ├── monitoring/
│   │   ├── database/
│   │   ├── security/
│   │   └── deployment/
│   │
│   ├── backend-ts/                  # 🚀 Nest.js API Gateway (consolidado)
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── jobs/
│   │   │   │   ├── rh/
│   │   │   │   ├── finance/
│   │   │   │   └── common/
│   │   │   ├── main.ts
│   │   │   └── app.module.ts
│   │   ├── prisma/
│   │   └── package.json
│   │
│   ├── frontend/                    # 🎨 Next.js Frontend (consolidado)
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   └── (app)/
│   │   │       ├── dashboard/
│   │   │       ├── jobs/
│   │   │       ├── rh/
│   │   │       ├── finance/
│   │   │       ├── team/
│   │   │       ├── media/
│   │   │       └── tickets/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   ├── JobForms/
│   │   │   ├── Pipeline/
│   │   │   ├── FinanceTable/
│   │   │   ├── MediaEditor/
│   │   │   └── UI/
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── jobs.ts
│   │   │   ├── rh.ts
│   │   │   ├── finance.ts
│   │   │   ├── media.ts
│   │   │   └── whatsapp.ts
│   │   └── package.json
│   │
│   ├── gateway/                     # 🔀 API Gateway (Kong)
│   └── backend/                     # 🔒 (LEGACY - pode remover depois)
│
├── infrastructure/
│   ├── render.yaml
│   ├── vercel.json
│   └── k8s/
│
├── docs/
├── scripts/
└── TODO.md
```

## 📊 MAPEAMENTO: Antiga → Nova Estrutura

| Antiga | Nova | Responsabilidade |
|--------|------|-----------------|
| `apps/ai_engine/` | `apps/1-ia/` | Python AI workers |
| `apps/whatsapp_service/` | `apps/2-whatsapp/` | Baileys + Bot |
| `apps/backend/` | `apps/backend-ts/` | API Gateway consolidado |
| `apps/backend-ts/` | `apps/backend-ts/src/modules/*` | Módulos por feature |
| `apps/frontend/` | `apps/frontend/` | Next.js consolidado |
| `infrastructure/` | `apps/7-infra/` | Infra configs |

---

## 🎯 PLANO DE REORGANIZAÇÃO

### Fase 1: Preparar (30 min)
1. ✅ Remover pasta `modules` antiga
2. ⏳ Criar pastas: `apps/{1-ia,2-whatsapp,3-rh,4-financeiro,5-contabilidade,6-media,7-infra}`
3. ⏳ Mover `apps/ai_engine/` → `apps/1-ia/`
4. ⏳ Mover `apps/whatsapp_service/` → `apps/2-whatsapp/`
5. ⏳ Reorganizar `apps/backend-ts/src/modules/`

### Fase 2: Consolidar Backend (1h)
6. ⏳ Criar `apps/backend-ts/src/modules/{auth,jobs,rh,finance,common}`
7. ⏳ Mover controllers/services para módulos
8. ⏳ Criar `apps/{3-rh,4-financeiro,5-contabilidade,6-media}/backend/`
9. ⏳ Symlink ou import de `apps/backend-ts/src/modules/`

### Fase 3: Consolidar Frontend (1h)
10. ⏳ Reorganizar `apps/frontend/` por páginas/módulos
11. ⏳ Criar `apps/{3-rh,4-financeiro,5-contabilidade,6-media}/frontend/`
12. ⏳ Symlink ou import de `apps/frontend/`

### Fase 4: Infra (30 min)
13. ⏳ Mover `infrastructure/` → `apps/7-infra/`
14. ⏳ Organizar Docker, K8s, Monitoring

---

## 🚀 COMO DESENVOLVER UM MÓDULO

### Exemplo: Implementar RH (Módulo 3)

**Terminal 1: Backend**
```bash
cd apps/3-rh/backend
npm install
npm run dev              # Rode em porta 3001
# ou parte de apps/backend-ts se consolidado
```

**Terminal 2: Frontend**
```bash
cd apps/frontend
npm run dev              # Rode em porta 3000
# Acessa /rh para testar
```

**Terminal 3: Watch & Debug**
```bash
cd apps/3-rh
npm test --watch
```

### Commit com módulo
```bash
git add apps/3-rh/
git commit -m "[MODULO-3] RH: Implementar pipeline kanban + job posting"
git push origin feature/rh-module
```

---

## 📋 CHECKLIST DE REORGANIZAÇÃO

- [ ] **Fase 1: Preparação**
  - [ ] Remover pasta modules antiga
  - [ ] Criar estrutura de pastas
  - [ ] Mover apps/ai_engine → apps/1-ia
  - [ ] Mover apps/whatsapp_service → apps/2-whatsapp

- [ ] **Fase 2: Backend**
  - [ ] Reorganizar apps/backend-ts/src/modules
  - [ ] Criar módulos: auth, jobs, rh, finance, common
  - [ ] Criar apps/{3-rh,4-financeiro,5-contabilidade,6-media}/backend
  - [ ] Testar APIs após reorganização

- [ ] **Fase 3: Frontend**
  - [ ] Reorganizar apps/frontend/app/
  - [ ] Criar apps/{3-rh,4-financeiro,5-contabilidade,6-media}/frontend
  - [ ] Atualizar imports em services/
  - [ ] Testar UI após reorganização

- [ ] **Fase 4: Infra**
  - [ ] Mover infrastructure/ → apps/7-infra/
  - [ ] Atualizar Docker/K8s paths
  - [ ] Testar deployment

---

## 🔗 DEPENDENCIES ENTRE MÓDULOS

```
FRONTEND (apps/frontend)
    ↓ (importa de todos)
BACKEND-TS (apps/backend-ts)
    ↓
┌─────────────────────────┐
│  1-IA ←→ 2-WHATSAPP     │
│   ↓          ↓          │
│ 3-RH ←→ 4-FINANCEIRO → 5-CONTABILIDADE
│   ↓
│ 6-MEDIA
└─────────────────────────┘
    ↓
7-INFRA (deployment)
```

---

## 📝 EXEMPLOS DE ARQUIVOS PER MÓDULO

Cada módulo deve ter `README.md` + `CHECKLIST.md`:

### apps/1-ia/README.md
```markdown
# 🧠 Módulo 1: IA Engine

## Features
- Resume parser (Gemini OCR)
- Copy generator
- Sentiment analysis

## Como rodar
python resume_parser.py

## Próximos passos
- [ ] Setup Gemini API
- [ ] Implementar resume parser
...
```

### apps/1-ia/CHECKLIST.md
```markdown
# ✅ Checklist Módulo 1: IA

- [ ] Setup Gemini API
- [ ] Implement resume_parser.py
- [ ] Test OCR
- [ ] Implement copy_generator.py
- [ ] Test sentiment analysis
- [ ] Deploy workers
```

---

## 🎯 RESULTADO FINAL

Depois da reorganização, o projeto ficará:
- ✅ **Modular:** Fácil entender cada pedaço
- ✅ **Escalável:** Desenvolver em paralelo
- ✅ **Testável:** Testar módulo por módulo
- ✅ **Deployável:** Deploy módulo por módulo
- ✅ **Documentado:** Cada módulo com README + CHECKLIST

---

## 🚀 PRÓXIMOS PASSOS

1. ⏳ Executar Fase 1 (reorganizar pastas)
2. ⏳ Executar Fase 2 (backend)
3. ⏳ Executar Fase 3 (frontend)
4. ⏳ Executar Fase 4 (infra)
5. ⏳ Criar README.md + CHECKLIST.md por módulo
6. ⏳ Começar desenvolvimento pelo módulo 7-INFRA
7. ⏳ Depois módulo 4-FINANCEIRO (SaaS enabler)
