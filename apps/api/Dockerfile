FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
RUN npm install
COPY . .
RUN cd apps/api && npx prisma generate
RUN npm run build:api
EXPOSE 3333
CMD ["npm", "run", "start:api"]
