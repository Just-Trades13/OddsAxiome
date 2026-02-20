### Stage 1: Build React frontend ###
FROM node:20-slim AS frontend-build

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .

# Backend URL is same origin since we serve from the same container
ENV VITE_BACKEND_URL=""
# Gemini API key for AI analysis features (client-side, public like Firebase key)
ENV GEMINI_API_KEY=AIzaSyBS8jjxtW-mnG82oOKACryXCfMwjUGB9pk
RUN npm run build

### Stage 2: Python API ###
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
COPY src/ src/
COPY scripts/ scripts/
COPY alembic/ alembic/
COPY alembic.ini .

RUN pip install --no-cache-dir .

# Copy built frontend into /app/static (vite outputs to ../static relative to /frontend)
COPY --from=frontend-build /static /app/static

EXPOSE 8000

CMD ["sh", "-c", "echo 'Running migrations...' && python -m alembic upgrade head && echo 'Migrations complete.' || echo 'Migration failed — check DATABASE_URL_SYNC' ; exec uvicorn src.api.app:create_app --factory --host 0.0.0.0 --port ${PORT:-8000}"]
