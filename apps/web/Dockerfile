FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
RUN npm ci --no-audit --no-fund
COPY . .
ENV NEXT_PUBLIC_API_URL=/api
# Robo de teste flutuante: ligado por padrao. Para tirar do site: NEXT_PUBLIC_ROBO_QA=off no .env e refazer o build.
ARG NEXT_PUBLIC_ROBO_QA=on
ENV NEXT_PUBLIC_ROBO_QA=$NEXT_PUBLIC_ROBO_QA
# CPF/CNPJ opcional no cadastro de empresa (so homologacao do robo). Deve casar com COMPANY_DOCUMENT_OPTIONAL da API.
ARG NEXT_PUBLIC_COMPANY_DOCUMENT_OPTIONAL=false
ENV NEXT_PUBLIC_COMPANY_DOCUMENT_OPTIONAL=$NEXT_PUBLIC_COMPANY_DOCUMENT_OPTIONAL
RUN npm run build:web

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
