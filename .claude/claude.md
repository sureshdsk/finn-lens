# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FinnLens is a personal finance intelligence platform. Users connect their Gmail account, and FinnLens automatically extracts credit card transactions, subscriptions, and investments from emails — including PDF statement parsing via pdfplumber.

## Development Commands

```bash
# Start all services (backend, frontend, worker, redis)
make -j4 up

# Individual services
make backend    # Django Bolt API on :8000
make frontend   # Vite dev server on :5174
make worker     # arq worker (Gmail sync tasks)
make redis      # Redis (required for worker)

# Database
make migrate    # makemigrations + migrate

# Backend
cd backend && uv run python manage.py runbolt --dev
cd backend && uv run python manage.py createsuperuser
cd backend && uv run pytest                          # all tests
cd backend && uv run pytest banking/tests/test_foo.py  # single test

# Frontend
cd frontend && pnpm dev
cd frontend && pnpm build    # type check + build
cd frontend && pnpm lint
```

## Architecture

### Backend (`backend/`) — Django + Django Bolt

**Django Bolt** is a Rust-powered API server (not DRF, not Django Ninja). Key conventions:

- Each app has `api.py` with `api = BoltAPI(prefix="/api/<app>")` and imports views at the bottom
- `runbolt --dev` autodiscovers `BoltAPI` instances named `api` — no `urls.py` wiring needed
- Serializers use `msgspec.Struct` (not DRF Serializer, not Pydantic)
- Auth: `JWTAuthentication`, `create_jwt_for_user`, `IsAuthenticated` — all from `django_bolt`
- `request.context` is a plain dict — use `ctx["user_id"]` (always a string, cast with `int()` for ORM)
- Query params: `request.query` (not `request.query_params`)
- `django.contrib.auth.authenticate` is sync — wrap with `sync_to_async`

**Apps:**
- `accounts` — Auth viewsets (login, register, me) at `/api/auth`
- `banking` — Credit cards, transactions, bills, subscriptions at `/api/banking`
- `gmail` — Gmail sync, email parsing, sender rules at `/api/gmail`
- `oauth` — Google OAuth 2.0 + PKCE at `/api/oauth`
- `classifier` — ML classification (GLiNER entity extraction, GLiClass) at `/api/classifier`

**Gmail Sync Pipeline** (async via arq worker + Redis):
1. `task_fetch` — Gmail API pulls emails from financial senders
2. `task_classify` — Pattern-matching rules assign email types
3. `task_parse` — Extract structured data from email body + PDF attachments
4. `task_materialize` — Create CreditCard, Bill, Transaction records
5. `task_classify_transactions` — ML categorizes transactions
6. `task_detect_subscriptions` — Identify recurring payments

**PDF Statement Parsing:**
- Bank-specific parsers in `banking/parsers/` (ICICI, Axis, IDFC, etc.) extend `cc_base.py`
- Email HTML extractors in `banking/email_extractor/` (zero Django deps, publishable separately)
- Gmail email parsers in `gmail/parsers/` (cc_statement, subscription, investment, etc.)

### Frontend (`frontend/`) — React 19 + Vite + Tailwind v4

- **Package manager**: `pnpm`
- **State**: Zustand (`stores/authStore.ts`, `stores/syncStore.ts`) + TanStack Query for server state
- **Styling**: Tailwind CSS v4 with `@tailwindcss/vite` plugin + shadcn/ui
- **Routing**: React Router v7
- **API layer**: `api/client.ts` base client, per-domain modules (`api/banking.ts`, `api/gmail.ts`, etc.)
- **Path alias**: `@/` → `./src/`

### Background Worker

`worker.py` configures an arq worker that processes Gmail sync tasks. Requires Redis running locally.

## Environment Variables

Backend needs `backend/.env` with: `SECRET_KEY`, `BOLT_JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GMAIL_TOKEN_ENCRYPTION_KEY`. See `backend/.env.example`.

Frontend needs `frontend/.env.local` with: `VITE_API_URL=http://localhost:8000`.
