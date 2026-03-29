.PHONY: backend frontend worker redis migrate up \
        docker-build docker-up docker-down docker-logs docker-shell \
        docker-migrate docker-prod docker-prod-down

# ── Local development ─────────────────────────────────────────────────────────

backend:
	cd backend && uv run python manage.py runbolt --dev

frontend:
	cd frontend && pnpm dev

worker:
	cd backend && uv run watchfiles --filter python 'arq worker.WorkerSettings' .

redis:
	redis-server --daemonize yes

migrate:
	cd backend && uv run python manage.py makemigrations && uv run python manage.py migrate

up: redis backend worker frontend

# ── Docker development ───────────────────────────────────────────────────────

docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-shell:
	docker compose exec backend bash

docker-migrate:
	docker compose exec backend uv run python manage.py makemigrations && \
	docker compose exec backend uv run python manage.py migrate

docker-createsuperuser:
	docker compose exec backend uv run python manage.py createsuperuser

# ── Docker production ────────────────────────────────────────────────────────

docker-prod:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

docker-prod-down:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml down
