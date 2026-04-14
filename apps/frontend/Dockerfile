# Dockerfile for Next.js Frontend — PRODUCTION MODE
FROM node:20-alpine AS base

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile

COPY . .

# Next.js telemetry disable
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build da aplicação (modo produção — muito mais rápido que dev)
RUN npm run build

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Roda em modo produção (next start)
CMD ["npm", "start"]
