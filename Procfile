web: uvicorn src.api.app:create_app --factory --host 0.0.0.0 --port ${PORT:-8000}
worker: python scripts/run_worker.py --sources polymarket,predictit,kalshi,theoddsapi
release: alembic upgrade head
