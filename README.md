# RailCross Watch

RailCross Watch składa się z trzech części:

- `apps/web` — frontend w Next.js
- `apps/api` — backend w NestJS
- `apps/worker-ai` — osobny worker do zadań AI

Poniżej jest opis uruchomienia lokalnie samego `web` i `api`.

## Architektura

```text
Web → API → Queue → Worker → Storage → API → Web
```

## Wymagania

- [Bun](https://bun.sh) `>= 1.1`
- Node.js `>= 20`
- Docker Desktop albo lokalnie uruchomiony PostgreSQL i Redis

Jeżeli korzystasz z Dockera, projekt używa:

- PostgreSQL na `localhost:5432`
- Redis na `localhost:6379`

## Szybki start

Jeżeli chcesz uruchomić lokalnie frontend i backend, wykonaj:

```bash
bun install
bun run dev:services
bun run db:migrate
bun run dev:app
```

## Pliki środowiskowe

Przed pierwszym startem trzeba utworzyć dwa pliki:

- `apps/api/.env`
- `apps/web/.env.local`

Najprościej skopiować przykłady:

```bash
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.local.example apps\web\.env.local
```

Na Linuxie lub macOS zamiast `copy` użyj `cp`.

### API

Przykładowa konfiguracja jest w `apps/api/.env.example`.

Najważniejsze pola:

- `DATABASE_URL`
- `REDIS_URL`
- `API_JWT_SECRET`
- `SUPERADMIN_EMAIL`
- `SUPERADMIN_PASSWORD`
- `TURNSTILE_SECRET_KEY`

### Web

Przykładowa konfiguracja jest w `apps/web/.env.local.example`.

Najważniejsze pola:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_OAUTH_URL`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

## Usługi pomocnicze

`bun run dev:app` uruchamia tylko `web` i `api`.
Nie uruchamia Postgresa ani Redisa.

Jeżeli korzystasz z Dockera, w repo jest gotowy plik compose:

- `infra/compose/docker-compose.dev.yml`

Ten compose stawia lokalnie:

- PostgreSQL
- Redis

Start:

```bash
bun run dev:services
```

To polecenie wykonuje:

```bash
docker compose -f infra/compose/docker-compose.dev.yml up -d
```

Zatrzymanie usług:

```bash
bun run dev:services:down
```

Jeżeli masz własny PostgreSQL i Redis, Docker nie jest potrzebny. Wystarczy, że ustawisz poprawne wartości w `apps/api/.env`.

## Migracje bazy

Po pierwszym uruchomieniu i po każdej zmianie schematu trzeba zastosować migracje:

```bash
bun run db:migrate
```

`bun install` powinien sam wykonać `prisma generate`, bo `apps/api` ma `postinstall`. Nie trzeba uruchamiać tego ręcznie, jeżeli instalacja zakończyła się poprawnie.

## Start aplikacji

Po przygotowaniu env, bazy, Redisa i migracji uruchom:

```bash
bun run dev:app
```

Adresy lokalne:

| Aplikacja | URL |
|-----------|-----|
| Web | `http://localhost:3000` |
| API | `http://localhost:3001` |
| API docs | `http://localhost:3001/api/docs` |

## Co robi się samo, a co nie

Po `bun install`:

- instalują się zależności
- generuje się Prisma Client

Nie robi się samo:

- utworzenie `apps/api/.env`
- utworzenie `apps/web/.env.local`
- uruchomienie PostgreSQL
- uruchomienie Redisa
- migracje bazy

## Superadmin

Konto superadmina tworzy się przy starcie API na podstawie:

- `SUPERADMIN_EMAIL`
- `SUPERADMIN_NAME`
- `SUPERADMIN_PASSWORD`

Po zmianie tych wartości trzeba zrestartować API.

## Najczęstszy problem przy pierwszym starcie

Jeżeli `web` albo `api` nie wstają po `bun run dev:app`, sprawdź kolejno:

1. Czy istnieją `apps/api/.env` i `apps/web/.env.local`.
2. Czy działa PostgreSQL na `5432`.
3. Czy działa Redis na `6379`.
4. Czy migracje zostały zastosowane przez `bun run db:migrate`.
