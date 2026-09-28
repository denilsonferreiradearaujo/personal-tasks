# Multi-stage Dockerfile para NestJS Backend com Prisma ORM
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências do sistema necessárias para compilação e prisma
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma ./prisma/

RUN npm install

COPY src ./src

RUN npx prisma generate
RUN npm run build

# Stage de Produção
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
COPY prisma ./prisma/

# Instalar apenas dependências de produção + prisma CLI para migrações
RUN npm install --omit=dev && npm install prisma -g

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

CMD ["sh", "-c", "npx prisma generate && npx prisma db push && (node dist/src/main.js || node dist/main.js)"]
