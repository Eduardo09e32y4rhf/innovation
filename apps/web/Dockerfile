# Dockerfile de producao - Frontend Next.js (static export)
# NEXT_PUBLIC_* sao embutidas no build e precisam entrar como ARG.

FROM node:20-alpine AS builder
WORKDIR /app

# SWC (Next.js native compiler) needs these on Alpine
RUN apk add --no-cache libc6-compat

ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_API_BASE_URL=/api
ARG NEXT_PUBLIC_API_BASE=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE

# Prevent Next.js from trying to patch the lockfile at build time
# (fails in workspace/npm ci contexts on Alpine)
ENV NEXT_IGNORE_INCORRECT_LOCKFILE=1
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm ci --no-audit --prefer-offline --no-optional

COPY . .
RUN npm run build:web

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/web/out ./out
COPY scripts/serve-static.cjs ./scripts/serve-static.cjs
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["node", "scripts/serve-static.cjs", "out"]