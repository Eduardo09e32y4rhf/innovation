# Dockerfile de producao da API NestJS - Multi-stage build
# Stage 1: builder (imagem completa com ferramentas de compilacao)
FROM node:20-bookworm AS builder

WORKDIR /usr/src/app

# Dependencias do sistema (python3, make, g++ para native modules)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copiar apenas manifests primeiro (cache)
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

# Instalar dependencias
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm ci --no-audit --prefer-offline

# Copiar restante do codigo
COPY . .

# Gerar Prisma e compilar
WORKDIR /usr/src/app/apps/api
RUN npx prisma generate --schema prisma/schema.prisma \
  && npm run build

# Stage 2: runner (imagem minima, apenas executar)
FROM node:20-alpine

WORKDIR /app

# Instalar apenas libc6-compat para compatibilidade
RUN apk add --no-cache libc6-compat

# Copiar apenas o necessario do builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/apps/api/dist ./dist
COPY --from=builder /usr/src/app/apps/api/prisma ./prisma
COPY --from=builder /usr/src/app/apps/api/package.json ./apps/api/package.json

EXPOSE 3333

CMD npx prisma migrate deploy --schema prisma/schema.prisma \
  && node prisma/seed-admin.cjs \
  && node dist/main.js