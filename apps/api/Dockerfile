# Minimal Dockerfile for development

FROM node:20-alpine
WORKDIR /usr/src/app

# Install dependencies at workspace root so npm workspaces can work
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
RUN npm ci --silent

# Copy source
COPY . .

WORKDIR /usr/src/app/apps/api
EXPOSE 3333
CMD ["npm", "run", "dev"]
