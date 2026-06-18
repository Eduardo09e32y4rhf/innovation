# Dockerfile de producao - Frontend Next.js (static export)
# NEXT_PUBLIC_* sao embutidas no build e precisam entrar como ARG.

FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:3333
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci

COPY . .
RUN npm run build:web

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/apps/web/out ./out
ENV PORT=8080
EXPOSE 8080
CMD ["serve", "-s", "out", "-l", "8080"]