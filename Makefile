.PHONY: dev up down build lint test install

# Uruchomienie środowiska lokalnego
dev:
	docker compose -f infra/compose/docker-compose.dev.yml up

up:
	docker compose -f infra/compose/docker-compose.dev.yml up -d

down:
	docker compose -f infra/compose/docker-compose.dev.yml down

# Budowanie wszystkich aplikacji
build:
	bun run build

# Instalacja zależności JS
install:
	bun install

# Lintowanie całego monorepo
lint:
	bun run lint

# Testy JS/TS
test:
	bun run test

# Testy Python (worker-rails)
test-worker:
	cd apps/worker-rails && uv run pytest tests/ -v
