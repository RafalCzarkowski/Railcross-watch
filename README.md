# RailCross Watch

System do:
- zarządzania datasetami treningowymi
- treningu modeli YOLO
- analizy nagrań wideo (przejazdy kolejowe)
- wykrywania pojazdów i zdarzeń
- logowania działań użytkowników

---

## 🧠 Architektura

System składa się z 3 głównych komponentów:

- **Web (Next.js)** — frontend UI
- **API (NestJS)** — backend i orkiestracja
- **Worker AI (Python)** — YOLO, OpenCV, analiza wideo

```text
Web → API → Queue → Worker → Storage → API → Web
```

---

## Uruchomienie

### Wymagania

- [Bun](https://bun.sh) >= 1.1
- Node.js >= 20

### Instalacja zależności

```bash
bun install
```

### Uruchomienie (Web + API)

```bash
bun run dev:app
```

| Aplikacja | URL |
|-----------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:3001 |
| API docs (Scalar) | http://localhost:3001/api/docs |