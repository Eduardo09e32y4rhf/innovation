# Dockerfile de producao do Web (Next.js) - Multi-stage build
# Stage 1: builder
FROM node:20-bookworm AS builder

WORKDIR /app

# Dependencias do sistema para Next.js/SWC
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Cache de dependencias
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json

RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm ci --no-audit --prefer-offline --include=optional

# Build do Next.js
COPY . .

RUN npm run build:web

# Stage 2: runner
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat

# Apenas arquivos de build estatico + servidor
COPY --from=builder /app/apps/web/out ./out
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

COPY scripts/serve-static.cjs ./scripts/serve-static.cjs

EXPOSE 3000

CMD ["node", "scripts/serve-static.cjs"]