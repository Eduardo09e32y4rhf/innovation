# Production Summary

## Commands

### Web

- Dev: [`npm run dev --prefix apps/web`](../../package.json:8)
- Build: [`npm run build:web`](../../package.json:14)
- Start: [`npm run start:web`](../../package.json:17)

### Desktop

- Dev: [`npm run dev:desktop`](../../package.json:9)
- Build TypeScript: [`npm run build:desktop`](../../package.json:15)
- Build installer: [`npm run build:installer`](../../package.json:16)
- Build EXE alias: [`npm run build:exe`](../../package.json:17)
- Start Electron: [`npm run start:desktop`](../../package.json:18)

## EXE / installer generation

- Main installer flow: [`npm run build:installer`](../../package.json:16)
- EXE alias: [`npm run build:exe`](../../package.json:17)
- Electron build target is configured for Windows NSIS and portable packages in [`package.json`](../../package.json:33)

## Required environment variables

Use [` .env.example`](../../.env.example) as the source of truth. Required in production:

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

Optional:

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

## Ports used

- `3000` - Next.js web app
- `8000` - backend API / Kong proxy in standard setups
- `8001` - auth service or Kong admin in some compose variants
- `8002` - AI service
- `8003` - core service
- `8004` - WhatsApp service
- `8443` - Kong TLS proxy
- `80` - nginx reverse proxy
- `3030` - Metabase dashboard

## Remaining risks

- Several infra files still contain legacy or mixed deployment assumptions.
- Some compose files hardcode sample credentials and internal service names.
- The Render and K8s configs need staging validation before any production rollout.
- Desktop packaging depends on a successful web build and valid runtime URL resolution.
- Do not run destructive DB commands without a backup and explicit approval.

