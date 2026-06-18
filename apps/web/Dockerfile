# Dockerfile de PRODUCAO — Frontend Next.js (static export)
# NEXT_PUBLIC_* sao "assadas" no build — precisam entrar como ARG.

FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:3333
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install

COPY . .
RUN npm run build:web

# Serve o output estatico
FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/apps/web/out ./out
ENV PORT=8080
EXPOSE 8080
CMD ["serve", "-s", "out", "-l", "8080"]
