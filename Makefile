# ==============================================================================
# QMatDisc - Quantum Material Discovery Platform Makefile
# ==============================================================================

.PHONY: all help dev test demo build figures docker-up docker-down clean

help:
	@echo "Available commands:"
	@echo "  make dev         - Launch both backend (FastAPI :8001) and frontend (Vite :5173)"
	@echo "  make test        - Run backend pytest test suite (64 tests)"
	@echo "  make demo        - Run quick standalone verification benchmark demo"
	@echo "  make build       - Build the production frontend distribution bundle"
	@echo "  make figures     - Regenerate all publication benchmark figures"
	@echo "  make docker-up   - Launch Docker containers via docker-compose"
	@echo "  make docker-down - Stop Docker containers"
	@echo "  make clean       - Clean temporary artifacts and cache directories"

test:
	pytest backend/tests/ -v --durations=10

demo:
	python scripts/demo.py

dev:
	@echo "Starting backend and frontend services..."
	python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8001 &
	cd frontend && npm run dev

build:
	cd frontend && npm run build

figures:
	python notebooks/generate_notebook.py

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	rm -rf frontend/dist
