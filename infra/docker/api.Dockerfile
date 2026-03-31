FROM oven/bun:1-alpine AS base
WORKDIR /app

# Instalacja zależności
FROM base AS deps
COPY package.json bun.lockb turbo.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
RUN bun install --frozen-lockfile

# Budowanie aplikacji
FROM deps AS builder
COPY . .
RUN bun run build --filter=@railcross/api

# Obraz produkcyjny
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001
CMD ["node", "dist/main.js"]
