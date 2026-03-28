.PHONY: backend frontend worker redis migrate up

# Individual services
backend:
	cd backend && uv run python manage.py runbolt --dev

frontend:
	cd frontend && pnpm dev

worker:
	cd backend && uv run watchfiles --filter python 'arq worker.WorkerSettings' .

redis:
	redis-server --daemonize yes

# Database
migrate:
	cd backend && uv run python manage.py makemigrations && uv run python manage.py migrate

# Start all services (run with: make -j4 up)
up: redis backend worker frontend
