FROM node:24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run prisma:generate && npm run build:api
RUN npm prune --omit=dev --no-audit --no-fund

FROM node:24-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production PORT=3333
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package*.json ./apps/api/
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
# Volumes gravaveis (api_data em /data, sessoes/uploads em /app/storage) pertencem ao usuario node.
# Volume nomeado novo herda este dono; volume antigo (root) e corrigido por scripts/deploy/vps-update.sh.
RUN mkdir -p /data/recruitment /data/support /app/storage && chown -R node:node /data /app/storage
USER node
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 CMD wget -qO- http://127.0.0.1:3333/health/live >/dev/null 2>&1 || exit 1
CMD ["node", "apps/api/dist/main.js"]
