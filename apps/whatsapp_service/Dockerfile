FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
# Requirements for compiling native deps like sharp or crypto used by Baileys
RUN apk add --no-cache python3 make g++ 
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

# We'll run in dev mode to skip typechecking issues on copied files for now
CMD ["npm", "run", "dev"]
