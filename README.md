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