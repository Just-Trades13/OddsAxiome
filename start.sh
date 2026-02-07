#!/bin/bash
set -e

# Run database migrations
python -m alembic upgrade head 2>/dev/null || echo "Migration skipped (tables may already exist)"

# Start the API server
exec uvicorn src.api.app:create_app --factory --host 0.0.0.0 --port ${PORT:-8000} --workers 4
