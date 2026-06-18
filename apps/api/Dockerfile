# Dockerfile de producao da API NestJS.

FROM node:20-bookworm-slim
WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci

COPY . .

WORKDIR /usr/src/app/apps/api
RUN npx prisma generate --schema prisma/schema.prisma && npm run build

EXPOSE 3333
CMD npx prisma migrate deploy --schema prisma/schema.prisma \
 && node prisma/seed-admin.cjs \
 && node dist/main.js