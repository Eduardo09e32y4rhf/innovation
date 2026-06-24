# Dockerfile de producao do Web (Next.js).
FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json

RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm ci --no-audit --prefer-offline

COPY . .

RUN npm run build:web

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY --from=builder /app/apps/web/out ./out
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

COPY scripts/serve-static.cjs ./scripts/serve-static.cjs

EXPOSE 3000
CMD ["node", "scripts/serve-static.cjs"]