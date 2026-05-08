FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install

COPY . .

RUN npm run build

# Production: serve with a tiny static server
FROM node:20-alpine AS runner
WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/out ./out

ENV PORT=8080
EXPOSE 8080

CMD ["serve", "-s", "out", "-l", "8080"]
