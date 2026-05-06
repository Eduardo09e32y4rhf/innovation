# Production and Deployment Standardization

This document consolidates the safe production baseline for the current repository. It focuses on the web app, desktop app, Docker/Compose, Render, Kong, and Kubernetes assets without changing the WhatsApp CRM implementation.

## Baseline services and ports

| Component | Port | Notes |
|---|---:|---|
| Next.js web app | 3000 | Local web and desktop fallback target |
| FastAPI / backend API | 8000 | Main API and Kong upstream target |
| Auth service | 8001 | Microservice in microservices compose |
| AI service | 8002 | Microservice in microservices compose |
| Core service | 8003 | Microservice in microservices compose |
| WhatsApp service | 8004 | Dedicated microservice |
| Kong proxy | 8000 / 8443 | Gateway proxy / TLS in gateway compose |
| Nginx proxy | 80 | Lightweight production reverse proxy |
| Metabase | 3030 | Enterprise dashboard port |

## Production commands

### Web

- Install: `npm install`
- Dev: `npm run dev --prefix apps/web`
- Build: `npm run build:web`
- Start production: `npm run start:web`

### Desktop

- Install: `npm install`
- Dev: `npm run dev:desktop`
- Build TypeScript only: `npm run build:desktop`
- Build installer: `npm run build:installer`
- Build EXE package: `npm run build:exe`
- Start Electron from compiled output: `npm run start:desktop`

### Deploy / infra

- Render baseline: `legacy/INFRA/deployment/render.yaml`
- Kong gateway: `legacy/INFRA/deployment/gateway/kong.yml`
- K8s manifest: `legacy/INFRA/deployment/k8s/deployment.yaml`
- Compose variants: `legacy/INFRA/deployment/ops/docker-compose.yml`, `legacy/INFRA/deployment/infra/docker/docker-compose.*.yml`

## Required environment variables

Minimum safe set for production:

- `NODE_ENV`
- `PORT`
- `HOST`
- `DATABASE_URL`
- `REDIS_URL`
- `SECRET_KEY`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ALLOWED_ORIGINS`
- `GEMINI_API_KEY` or `GEMINI_API_KEYS`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_APP_URL`
- `ASAAS_API_KEY`
- `ASAAS_API_URL`
- `ASAAS_WEBHOOK_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

Optional but supported:

- `OPENAI_API_KEY`
- `NVIDIA_API_KEY`
- `SENTRY_DSN`
- `POSTHOG_API_KEY`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET`
- `AWS_CLOUDFRONT_URL`
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `LINKEDIN_REFRESH_TOKEN`
- `DESKTOP_PROD_URL`
- `WEB_APP_URL`

## Build and deployment notes

- Keep old infra files archived; do not delete them while standardizing.
- Do not run destructive DB commands.
- Keep secrets in environment variables or managed secret stores only.
- Verify all reverse-proxy routes after any gateway or compose change.
- Prefer `npm run build:installer` for desktop release artifacts.

## Risks to track

- Mixed legacy and current infra paths may still exist in docs and compose files.
- Some manifests use hardcoded internal hostnames and sample passwords that must be replaced before production.
- Compose files under `legacy/INFRA/deployment/infra/docker/` still contain development assumptions.
- K8s and gateway manifests should be validated in a staging cluster before production rollout.

