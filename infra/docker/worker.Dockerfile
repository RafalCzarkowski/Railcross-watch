FROM python:3.11-slim AS builder
WORKDIR /app

# Instalacja uv
RUN pip install uv

COPY apps/worker-rails/pyproject.toml ./
# Odkomentuj gdy pojawi się uv.lock:
# COPY apps/worker-rails/uv.lock ./

RUN uv sync --no-dev --no-install-project

# Obraz produkcyjny
FROM python:3.11-slim AS runner
WORKDIR /app

# Zależności systemowe wymagane przez OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/.venv /app/.venv
COPY apps/worker-rails/src ./src

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

# Pobieranie modelu YOLO przy budowaniu obrazu (nano — dla dev/ci)
RUN python -c "from ultralytics import YOLO; YOLO('yolo26n.pt')"

CMD ["python", "-m", "main"]
