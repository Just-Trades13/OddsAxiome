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
COPY start.sh .

RUN pip install --no-cache-dir . && chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]
