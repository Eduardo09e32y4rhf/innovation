# Dockerfile de producao - Frontend Next.js (static export)
# NEXT_PUBLIC_* sao embutidas no build e precisam entrar como ARG.

FROM node:20-bookworm-slim AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_API_BASE_URL=/api
ARG NEXT_PUBLIC_API_BASE=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json

RUN npm ci --no-audit --prefer-offline --no-optional --force || npm install --no-audit --force

COPY . .

RUN npm run build:web

# ── runner ─────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim
WORKDIR /app

COPY --from=builder /app/apps/web/out ./out
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

COPY scripts/serve-static.cjs ./scripts/serve-static.cjs

EXPOSE 3000
CMD ["node", "scripts/serve-static.cjs"]