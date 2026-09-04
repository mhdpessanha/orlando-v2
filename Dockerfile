FROM node:22-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# O build precisa de uma DATABASE_URL válida só pra inicializar o Prisma Client
ENV DATABASE_URL="file:/app/data/orlando.db"
RUN npm run build

FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN npm install -g prisma@6
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY prisma ./prisma
COPY scripts ./scripts
# o standalone embute o bcryptjs no bundle do server, mas o scripts/create-user.mjs
# roda fora do bundle e precisa do pacote solto
COPY --from=deps /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY docker-entrypoint.sh ./
EXPOSE 3000
CMD ["sh", "docker-entrypoint.sh"]
