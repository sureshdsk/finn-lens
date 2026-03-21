# FinnLens - Beta

A personal finance intelligence platform. Upload bank statements, connect accounts, and get AI-powered insights into your spending, subscriptions, net worth, and financial health.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, Tailwind CSS v4, shadcn/ui, Zustand, React Query |
| Backend | Django 6, Django Bolt (Rust-powered API server) |
| Auth | JWT via `django-bolt` |
| Task queue | arq + Redis (scaffold) |
| Package managers | `pnpm` (frontend), `uv` (backend) |

## Project Structure

```
finn-lens/
├── frontend/          # React app (Vite + Tailwind v4 + shadcn/ui)
└── backend/           # Django + Django Bolt API
    ├── accounts/      # Auth viewsets (login, me)
    ├── finnlens/      # Django settings, urls, wsgi
    └── worker.py      # arq worker scaffold
```

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- `uv` — `pip install uv`
- `pnpm` — `npm install -g pnpm`

### Backend

```bash
cd backend

# Install dependencies
uv sync

# Copy and configure environment
cp .env.example .env   # edit SECRET_KEY, BOLT_JWT_SECRET

# Run migrations and create a user
uv run python manage.py migrate
uv run python manage.py createsuperuser

# Start the API server (port 8000)
uv run python manage.py runbolt --dev
```

### Frontend

```bash
cd frontend

# Install dependencies
pnpm install

# Copy and configure environment
cp .env.local.example .env.local   # set VITE_API_URL if needed

# Start dev server (port 5173)
pnpm dev
```

Open `http://localhost:5173` and sign in with your superuser credentials.

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/` | Login — returns JWT token |
| GET | `/api/auth/me/` | Current user info (JWT required) |

## Environment Variables

**`backend/.env`**
```
SECRET_KEY=
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
BOLT_JWT_SECRET=          # min 32 chars
BOLT_JWT_EXPIRATION=3600
CORS_ALLOWED_ORIGINS=http://localhost:5173
REDIS_URL=redis://localhost:6379
```

**`frontend/.env.local`**
```
VITE_API_URL=http://localhost:8000
```
