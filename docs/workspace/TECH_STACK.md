# 🛠️ STACK TECNOLÓGICO - INNOVATION.IA

## 📋 RESUMO GERAL

```
┌─────────────────────────────────────────────────────┐
│            INOVATION.IA TECH STACK                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  FRONTEND (React + TypeScript)                      │
│  ↓                                                   │
│  BACKEND-TS (Nest.js + Prisma)  ← PRIMARY          │
│  ↓                                                   │
│  GATEWAY (Kong)                                     │
│  ↓                                                   │
│  WORKERS                                            │
│  ├─ Python (AI/Gemini)                             │
│  ├─ Node.js (WhatsApp/Baileys)                     │
│  └─ Celery (Queue/Tasks)                           │
│  ↓                                                   │
│  DATABASE (PostgreSQL)                              │
│  ↓                                                   │
│  INFRA (Docker, Kubernetes, Cloud)                 │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 FRONTEND

### Linguagem & Runtime
- **Linguagem:** TypeScript
- **Runtime:** Node.js + Browser
- **Framework:** **Next.js 15** (React)

### Dependências Principais
```json
{
  "next": "^15.x",
  "react": "^19.x",
  "react-dom": "^19.x",
  "typescript": "latest",
  
  // State Management & Data
  "@tanstack/react-query": "^5.99.0",
  "@supabase/supabase-js": "^2.98.0",
  "axios": "^1.13.6",
  
  // UI & Components
  "lucide-react": "latest",          // Icons
  "tailwindcss": "^3.x",             // Styling
  "clsx": "^2.1.1",                  // Conditional classes
  
  // AI Integration
  "@ai-sdk/openai": "^3.0.41",
  "@ai-sdk/react": "^3.0.118",
  "ai": "^6.0.116",
  
  // Visualization
  "d3-*": "latest",                  // Charts
  "recharts": "latest",              // Dashboard charts
  
  // Auth
  "@supabase/ssr": "^0.8.0"
}
```

### Estrutura
```
apps/frontend/
├── app/
│   ├── (auth)/         # Login, Register, Forgot Password
│   ├── (app)/          # Protected pages (Jobs, RH, Finance, etc)
│   └── layout.tsx
├── components/         # Shared UI components
├── services/
│   ├── api.ts          # HTTP client
│   ├── auth.ts         # Auth service
│   ├── jobs.ts         # Jobs API
│   ├── rh.ts           # RH API
│   ├── finance.ts      # Finance API
│   └── media.ts        # Media API
├── styles/
│   └── globals.css     # Tailwind styles
└── package.json
```

### Deploy
- **Vercel** (recommended)
- Build: `next build`
- Start: `next start`

---

## 🚀 BACKEND-TS (PRIMARY)

### Linguagem & Runtime
- **Linguagem:** TypeScript
- **Runtime:** Node.js
- **Framework:** **Nest.js** (v10)
- **ORM:** **Prisma**
- **Database:** PostgreSQL

### Dependências Principais
```json
{
  // Framework
  "@nestjs/common": "^10.0.0",
  "@nestjs/core": "^10.0.0",
  "@nestjs/platform-express": "^10.0.0",
  
  // Database
  "@nestjs/prisma": "^4.0.0",
  "@prisma/client": "^5.12.0",
  
  // Authentication
  "@nestjs/jwt": "^10.2.0",
  "@nestjs/passport": "^10.0.3",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.1",
  "bcrypt": "^5.1.1",
  
  // Validation
  "class-validator": "^0.14.1",
  "class-transformer": "^0.5.1",
  
  // Utils
  "reflect-metadata": "^0.2.0",
  "rxjs": "^7.8.1"
}
```

### Estrutura
```
apps/backend-ts/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   ├── jobs/
│   │   ├── rh/
│   │   ├── finance/
│   │   ├── media/
│   │   └── common/
│   ├── main.ts
│   ├── app.module.ts
│   └── app.service.ts
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── migrations/
├── test/
├── package.json
└── Dockerfile
```

### Rotas Principais
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/jobs
POST   /api/v1/jobs
GET    /api/v1/rh/pipeline
POST   /api/v1/rh/candidates
GET    /api/v1/finance/invoices
POST   /api/v1/media/upload
```

### Deploy
- **Railway** (recommended)
- Build: `npm run build`
- Start: `npm run start:prod`

---

## 🐍 BACKEND (LEGACY - Python)

### Linguagem & Runtime
- **Linguagem:** Python 3.11
- **Framework:** **FastAPI**
- **Server:** Uvicorn
- **ORM:** SQLAlchemy
- **Database:** PostgreSQL

### Dependências Principais
```text
# Web
fastapi==0.128.0
uvicorn[standard]==0.34.0
gunicorn==23.0.0
starlette==0.50.0

# Database
sqlalchemy==2.0.46
alembic
psycopg2-binary==2.9.11

# Auth & Security
python-jose==3.5.0
passlib==1.7.4

# API & Validation
pydantic==2.x

# AI
google-generativeai==0.x
openai==1.x
```

### Estrutura
```
apps/backend/
├── api/
│   ├── routes/
│   ├── models/
│   └── schemas/
├── src/
│   ├── database/
│   ├── models/
│   └── services/
├── alembic/
│   └── versions/    # DB migrations
├── tests/
├── requirements.txt
└── Dockerfile
```

### Status
⚠️ **LEGACY** - Sendo migrado para Nest.js (backend-ts/)

---

## 🔀 GATEWAY (KONG)

### Linguagem & Framework
- **Linguagem:** YAML Config + Lua (extensões)
- **Gateway:** **Kong API Gateway**
- **Protocol:** REST/HTTP

### Configuração
```
apps/gateway/
└── kong.yml          # Kong configuration
    ├── Services     # Backend services
    ├── Routes       # API routes
    ├── Plugins      # Auth, Rate limiting, CORS
    └── Load balancing
```

### Funcionalidades
- ✅ Rate limiting
- ✅ API versioning (`/api/v1`, `/api/v2`)
- ✅ Authentication (JWT)
- ✅ CORS handling
- ✅ Request logging
- ✅ Load balancing

### Deploy
- Docker container
- Environment: `KONG_DATABASE=postgres`

---

## 🧠 AI ENGINE (MÓDULO 1)

### Linguagem & Runtime
- **Linguagem:** Python 3.11
- **Framework:** N/A (Workers standalone)

### Dependências
```text
google-generativeai==0.x   # Gemini API
openai==1.x                # GPT fallback
numpy==1.x
pandas==2.x
scikit-learn==1.x
pillow==10.x              # Image processing
pdf2image==1.x            # PDF to image
pytesseract==0.3.x        # OCR
```

### Serviços
```
1-ia/backend/
├── worker.py           # Main worker entry
├── agents/             # AI agents
├── prompts/            # Prompt templates
├── vector_store/       # Embeddings
├── resume_parser.py
├── sentiment_analysis.py
├── copy_generator.py
└── requirements.txt
```

### Features
- Resume parsing (OCR Gemini)
- Copy generation (Headlines, hashtags)
- Sentiment analysis
- Screening bot (WhatsApp)
- Model management (fallback chain)

---

## 📱 WHATSAPP SERVICE (MÓDULO 2)

### Linguagem & Runtime
- **Linguagem:** TypeScript
- **Runtime:** Node.js
- **Library:** **Baileys** (WhatsApp Web API)
- **Server:** Express.js

### Dependências
```json
{
  "baileys": "latest",
  "express": "^4.x",
  "cors": "^2.x",
  "dotenv": "^16.x"
}
```

### Estrutura
```
2-whatsapp/backend/
├── src/
│   ├── wbot.ts              # Baileys integration
│   ├── message-queue.ts
│   ├── bot-builder.ts       # Visual bot builder
│   ├── express-server.ts
│   └── templates/
├── package.json
└── Dockerfile
```

---

## 🐘 DATABASE

### Tipo
- **PostgreSQL** 14+

### Connection
```
postgresql://user:password@host:5432/innovation_ia
```

### ORM
- **Prisma** (Nest.js)
- **SQLAlchemy** (FastAPI legacy)

### Migrations
```bash
# Nest.js (Prisma)
npm run prisma:migrate

# FastAPI (Alembic)
alembic upgrade head
```

### Tables
```sql
users                -- Auth + profile
jobs                 -- Job postings
candidates           -- Applications
pipeline_stages      -- RH stages
invoices             -- Billing
subscriptions        -- Plans
whatsapp_sessions    -- Bot sessions
media_files          -- Photos/uploads
automation_flows     -- Workflow automation
```

---

## 🏗️ INFRA (MÓDULO 7)

### Docker
```dockerfile
# Backend-TS
FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "run", "start:prod"]

# Frontend
FROM node:20-alpine AS builder
...
FROM nginx:alpine
...

# Python Workers
FROM python:3.11-slim
...
```

### Kubernetes
```yaml
# Deployment (backend-ts)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-ts
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: backend-ts
        image: backend-ts:latest
        ports:
        - containerPort: 3001

# Service
apiVersion: v1
kind: Service
metadata:
  name: backend-ts
spec:
  selector:
    app: backend-ts
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
```

### Monitoring & Logging
- **Sentry** - Error tracking
- **PostHog** - Analytics
- **ELK Stack** - Logging (optional)
- **Prometheus** - Metrics
- **Grafana** - Dashboards

### Cloud Platforms
- **Frontend:** Vercel
- **Backend:** Railway or AWS EC2
- **Database:** Railway Postgres or AWS RDS
- **Storage:** AWS S3 or Supabase Storage

---

## 📊 TECH STACK SUMMARY

| Layer | Technology | Language | Status |
|-------|-----------|----------|--------|
| **Frontend** | Next.js 15 + React | TypeScript | ✅ Active |
| **Backend** | Nest.js + Prisma | TypeScript | ✅ Primary |
| **Backend (Legacy)** | FastAPI | Python | ⚠️ Migrating |
| **Gateway** | Kong | YAML/Lua | ✅ Active |
| **AI Workers** | Python scripts | Python | 🚀 Building |
| **WhatsApp** | Baileys + Express | TypeScript | 🚀 Building |
| **Queue** | Celery/RQ | Python | 📋 Todo |
| **Database** | PostgreSQL | SQL | ✅ Active |
| **Container** | Docker | Dockerfile | ✅ Active |
| **Orchestration** | Kubernetes | YAML | 📋 Todo |
| **Monitoring** | Sentry + PostHog | TypeScript | 📋 Todo |

---

## 🚀 DESENVOLVIMENTO LOCAL

### Requisitos
```bash
# Node.js
node --version          # v20+
npm --version           # v10+

# Python
python --version        # 3.11+
pip --version

# Docker
docker --version
docker-compose --version

# Database
# PostgreSQL 14+ (local ou Docker)
```

### Setup Inicial
```bash
# Frontend
cd apps/frontend
npm install
npm run dev             # http://localhost:3000

# Backend-TS
cd apps/backend-ts
npm install
npm run prisma:generate
npm run start:dev       # http://localhost:3001

# Python Workers (em outro terminal)
cd apps/1-ia/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python worker.py
```

### Database Local
```bash
# Docker
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=innovation_ia \
  -p 5432:5432 \
  postgres:14

# Migrar schema
npm run prisma:migrate
```

---

## 🔄 DEPLOYMENT

### Frontend (Vercel)
```bash
git push origin main
# Vercel auto-deploys
# https://innovation-ia.vercel.app
```

### Backend (Railway)
```bash
railway link
railway up
# Acessa em: backend.railway.app
```

### Python Workers (Railway)
```bash
railway link
railway up
# Acessa em: workers.railway.app
```

---

## 📚 DOCUMENTAÇÃO PER MÓDULO

- [📦 MODULES.md](./MODULES.md) - Arquitetura modular
- [🎯 TODO.md](./TODO.md) - Roadmap completo
- [🚀 GUIA_RAPIDO.md](GUIA_RAPIDO.md) - Como usar

---

**Stack pronto para produção!** 🚀
