FROM oven/bun:1-alpine AS base
WORKDIR /app

# Instalacja zależności
FROM base AS deps
COPY package.json bun.lock turbo.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
RUN bun install --frozen-lockfile

# Budowanie aplikacji
FROM deps AS builder
COPY . .
RUN bun run build --filter=@railcross/web

# Obraz produkcyjny
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
