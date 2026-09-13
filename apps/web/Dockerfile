FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
RUN npm install
COPY . .
RUN cd apps/api && npx prisma generate
ENV NEXT_PUBLIC_API_URL=/api
RUN npm run build:web
EXPOSE 3000
CMD ["npm", "run", "start:web"]
