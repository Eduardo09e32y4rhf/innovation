FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
RUN npm ci
COPY . .
RUN cd apps/api && npx prisma generate
ENV NEXT_PUBLIC_API_URL=/api
# Robo de teste provisorio (botao flutuante, so DEV). Variavel de BUILD: "on" liga, "off" remove do pacote.
ARG NEXT_PUBLIC_ROBO_QA=off
ENV NEXT_PUBLIC_ROBO_QA=$NEXT_PUBLIC_ROBO_QA
# CPF/CNPJ opcional no cadastro de empresa (so homologacao do robo). Deve casar com COMPANY_DOCUMENT_OPTIONAL da API.
ARG NEXT_PUBLIC_COMPANY_DOCUMENT_OPTIONAL=false
ENV NEXT_PUBLIC_COMPANY_DOCUMENT_OPTIONAL=$NEXT_PUBLIC_COMPANY_DOCUMENT_OPTIONAL
RUN npm run build:web
EXPOSE 3000
CMD ["npm", "run", "start:web"]
