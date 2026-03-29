# FinnLens - Beta

A personal finance intelligence platform. Connect your Gmail, and FinnLens automatically extracts credit card transactions, subscriptions, and investments from your emails — with PDF statement parsing.

<p align="center">
  <img src="docs/finnlens-2-feat.png" alt="FinnLens Features" width="700" />
</p>

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, Tailwind CSS v4, shadcn/ui, TanStack Query |
| Backend | Django 6, Django Bolt (Rust-powered API server) |
| Auth | JWT via `django-bolt` (email/password) |
| Gmail Sync | Google OAuth 2.0 + PKCE (read-only) |
| ML | GLiNER (entity extraction), GLiClass (classification) |
| PDF | pdfplumber (text + table extraction) |
| Database | PostgreSQL 16 (production), SQLite (local dev fallback) |
| Task queue | arq + Redis |
| Package managers | `pnpm` (frontend), `uv` (backend) |
| AI coding agents | [Claude Code](https://claude.ai/code) (Opus), [OpenCode](https://opencode.ai) (GLM-5) |

## Project Structure

```
finn-lens/
├── frontend/                  # React app (Vite + Tailwind v4 + shadcn/ui)
├── backend/                   # Django + Django Bolt API
│   ├── accounts/              # Auth viewsets (login, me)
│   ├── banking/               # Credit cards, transactions, bills, subscriptions
│   │   ├── email_extractor/   # Standalone email data extraction (publishable)
│   │   └── parsers/           # PDF statement parsers
│   ├── gmail/                 # Gmail sync, email parsing, sender rules
│   │   └── parsers/           # Email content parsers (CC alerts, statements, etc.)
│   ├── classifier/            # ML classification pipeline
│   ├── oauth/                 # Google OAuth endpoints
│   └── finnlens/              # Django settings
├── docker-compose.yml         # Development (hot-reload, volume mounts)
├── docker-compose.prod.yml    # Production overlay (optimized builds, Caddy)
└── Makefile                   # All run commands
```

---

## Getting Started

Choose your setup:

<details>
<summary><strong>Docker (recommended)</strong> — least local deps, one command to run everything</summary>

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/install/)
- Make (usually pre-installed on macOS/Linux)

### Setup

```bash
# 1. Clone and configure backend env
cp backend/.env.example backend/.env
# Edit backend/.env with your Google OAuth credentials (see GCP Setup below)

# 2. Build and start all services
make docker-build
make docker-up

# 3. Run migrations and create a user
make docker-migrate
make docker-createsuperuser

# 4. View logs
make docker-logs
```

Open `http://localhost:5174` and sign in with your superuser credentials.

### Stopping

```bash
make docker-down
```

### Accessing a shell inside the backend container

```bash
make docker-shell
```

### Ports

| Service | Port |
|---------|------|
| Frontend (Vite) | http://localhost:5174 |
| Backend API | http://localhost:8000 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

</details>

<details>
<summary><strong>Local Development</strong> — for contributors working on the codebase</summary>

### Prerequisites

- Python 3.12+
- Node.js 20+
- `uv` — `pip install uv`
- `pnpm` — `npm install -g pnpm`
- Redis — `brew install redis` (macOS) or `apt install redis` (Linux)

### Backend

```bash
cd backend

# Install dependencies
uv sync

# Copy and configure environment
cp .env.example .env   # edit with your Google OAuth credentials

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

# Start dev server (port 5174)
pnpm dev
```

### Worker + Redis

The arq worker processes the Gmail sync pipeline (fetch → classify → parse → materialize).

```bash
# Terminal 1: Start Redis
make redis

# Terminal 2: Start worker (auto-reloads on code changes)
make worker
```

### Run everything at once

```bash
make -j4 up
```

Open `http://localhost:5174` and sign in with your superuser credentials.

</details>

<details>
<summary><strong>Docker Production</strong> — optimized builds, Caddy, multi-process</summary>

Production mode uses:
- **Caddy** for the frontend (static build + API reverse proxy)
- **Django Bolt** with `--processes 4`, connection pooling via `psycopg[pool]`
- **PostgreSQL** with persistent volumes
- No hot-reload, no dev volume mounts

### Setup

```bash
# 1. Configure backend/.env with production values:
#    - DEBUG=False
#    - ALLOWED_HOSTS=your-domain.com
#    - BOLT_JWT_SECRET=<strong random value, min 32 chars>
#    - SECRET_KEY=<strong random value>
#    - CORS_ALLOWED_ORIGINS=https://your-domain.com
#    - DATABASE_URL=postgresql://finnlens:finnlens@postgres:5432/finnlens (set automatically by compose)

# 2. Optional: override compose settings via environment
#    POSTGRES_PASSWORD=your-strong-password
#    FRONTEND_PORT=443
#    ALLOWED_HOSTS=your-domain.com,127.0.0.1
#    CORS_ALLOWED_ORIGINS=https://your-domain.com

# 3. Build and start
make docker-prod

# 4. Run migrations
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend \
  uv run python manage.py migrate

# 5. Create superuser
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend \
  uv run python manage.py createsuperuser
```

### Stopping

```bash
make docker-prod-down
```

### Exposed Ports

| Service | Port |
|---------|------|
| Frontend (Caddy) | 80 (configurable via `FRONTEND_PORT`) |
| PostgreSQL | Not exposed externally |
| Redis | Not exposed externally |

> **Note:** For automatic HTTPS, update the `Caddyfile` with your domain: replace `:80` with `your-domain.com`.

</details>

<details>
<summary><strong>Demo Mode</strong> — zero backend, fully mocked</summary>

Demo mode runs the frontend with zero backend dependency — all API calls are intercepted and return realistic mocked data (Indian financial data: INR, Indian banks, merchants).

```bash
cd frontend

# Dev server with demo mode
pnpm dev:demo

# Production demo build
pnpm build:demo
```

Open `http://localhost:5174` — you'll see a marketing landing page instead of the login form. Click **"Quick Login as Demo User"** or enter `demo` / `demo`.

**What works in demo mode:**
- All pages display realistic mock data (overview, accounts, transactions, analytics, calendar, subscriptions, investments, budgets, assets, life events, waitlist, notifications, settings)
- Write operations (add account, update profile, manage subscriptions, manage sender rules) modify in-memory state
- Gmail sync simulates a real pipeline — click Sync and watch the 6-step pipeline progress in real time
- Category overrides on transactions persist in-memory
- A subtle "Demo Mode" banner appears at the top of the app

**What is mocked:**
- No real API calls are made — the backend is not required
- Login is local (`demo:demo` credentials, no JWT validation)
- Gmail OAuth flow returns mock responses

</details>

---

## Setup Guides

<details>
<summary><strong>Google Cloud Platform (GCP) OAuth Setup</strong> — required for Gmail sync</summary>

### 1. Create a GCP Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown → **New Project**
3. Name it (e.g., `FinnLens`) and create

### 2. Enable APIs

1. Navigate to **APIs & Services → Library**
2. Search and enable:
   - **Gmail API** (for email sync)

### 3. Configure OAuth Consent Screen

1. Navigate to **APIs & Services → OAuth consent screen**
2. Choose **External** user type
3. Fill in:
   - App name: `FinnLens`
   - User support email: your email
   - Developer contact email: your email    
4. Under **Scopes**, add:
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/gmail.readonly`
5. If "Testing" mode, add your Google account as a test user
6. (Optional) Submit for verification to make it available to anyone

### 4. Create OAuth Credentials

1. Navigate to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `FinnLens Web`
5. **Authorized JavaScript origins:**
   - `http://localhost:5174` (local dev)
   - `http://localhost` (Docker prod)
   - Your production domain (e.g., `https://finnlens.com`)
6. **Authorized redirect URIs:**
   - `http://localhost:5174/oauth/google/callback` (local dev)
   - `http://localhost/oauth/google/callback` (Docker prod)
   - `https://your-domain.com/oauth/google/callback` (production)
7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

### 5. Configure FinnLens

Add to `backend/.env`:

```env
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:5174/oauth/google/callback
GMAIL_TOKEN_ENCRYPTION_KEY=<generate with command below>
```

Generate a Fernet encryption key for storing Gmail tokens securely:

```bash
uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

</details>

<details>
<summary><strong>Create a Superuser (Django Admin)</strong></summary>

### Docker

```bash
make docker-createsuperuser
```

### Local

```bash
cd backend
uv run python manage.py createsuperuser
```

Follow the prompts — email and password are all that's required.

> **Tip:** If you get a database connection error, make sure PostgreSQL is running and `DATABASE_URL` is set correctly in `backend/.env`.

</details>

<details>
<summary><strong>First-Time Onboarding</strong> — after signing in</summary>

### 1. Verify you're logged in

After signing in, you'll land on the **Dashboard**. You should see an empty state with no accounts or transactions.

### 2. Connect Gmail (optional but recommended)

1. Navigate to **Settings → Gmail** (or click the Gmail sync prompt)
2. Click **Connect Google Account**
3. Authorize the app when redirected to Google
4. You'll be redirected back — your Gmail account is now linked

### 3. Trigger your first sync

1. Navigate to **Accounts** or click **Sync** in the sidebar
2. Click **Sync Now**
3. The 6-step pipeline runs automatically:
   - Fetch → Classify → Parse → Materialize → Classify Transactions → Detect Subscriptions
4. Wait for completion (first sync may take a few minutes depending on email volume)

### 4. Explore

- **Dashboard** — overview of spending, upcoming bills, net worth
- **Accounts** — credit cards and their balances
- **Transactions** — all extracted transactions with search and filters
- **Analytics** — spending by category, merchant, and time period
- **Subscriptions** — auto-detected recurring charges
- **Investments** — portfolio data from financial emails

### 5. Fine-tune

- **Category overrides** — click any transaction to re-categorize it
- **Sender rules** — manage which email senders are processed for financial data
- **Settings** — update profile, manage Gmail connection, configure preferences

</details>

---

## How It Works

<p align="center">
  <img src="docs/finnlens-architecture.png" alt="FinnLens Architecture" width="700" />
</p>

### Gmail Sync Pipeline

1. **Fetch** — Gmail API (read-only) pulls emails from financial senders
2. **Classify** — Pattern-matching rules assign emails to types (credit_card, subscription, etc.)
3. **Parse** — Parsers extract structured data from email body + PDF attachments
4. **Materialize** — Extracted data becomes CreditCard, Bill, Transaction records
5. **Classify** — ML pipeline categorizes transactions (food, travel, bills, etc.)

### Credit Card Bills

- Bill summary (total due, min due, due date, billing period) extracted from email body
- PDF statement transactions extracted via pdfplumber (text + table parsing)
- Statement data supersedes alert data (better merchant names, correct forex amounts)
- Transactions linked to bills by billing period date window
- Each bill links back to the source Gmail message for quick reference

### Standalone Email Extractor

The `banking/email_extractor` module extracts structured CC statement data from email HTML with zero Django dependencies. Can be published as a separate package.

```python
from banking.email_extractor import extract_cc_statement

result = extract_cc_statement(subject="...", body_html="...")
print(result.total_due)              # 13593.37
print(result.min_due)                # 930.0
print(result.due_date)               # 2026-03-30
print(result.billing_period_start)   # 2026-02-13
print(result.billing_period_end)     # 2026-03-12
print(result.card_last4)             # 9005
print(result.pdf_password)           # suji0501
```

---

## Make Commands

| Command | Description |
|---------|-------------|
| `make backend` | Start backend (local) |
| `make frontend` | Start frontend (local) |
| `make worker` | Start arq worker (local) |
| `make redis` | Start Redis (local) |
| `make migrate` | Run Django migrations (local) |
| `make -j4 up` | Start all local services in parallel |
| `make docker-build` | Build Docker images |
| `make docker-up` | Start Docker dev services |
| `make docker-down` | Stop Docker dev services |
| `make docker-logs` | Tail Docker logs |
| `make docker-shell` | Shell into backend container |
| `make docker-migrate` | Run migrations in Docker |
| `make docker-createsuperuser` | Create superuser in Docker |
| `make docker-prod` | Build and start production |
| `make docker-prod-down` | Stop production |

---

## Environment Variables

**`backend/.env`**
```env
SECRET_KEY=change-me-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
BOLT_JWT_SECRET=                    # min 32 chars
BOLT_JWT_EXPIRATION=3600
CORS_ALLOWED_ORIGINS=http://localhost:5174
REDIS_URL=redis://localhost:6379
DATABASE_URL=sqlite:///db.sqlite3   # Docker sets this to postgres:// automatically

# Google OAuth (for Gmail sync)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5174/oauth/google/callback
GMAIL_TOKEN_ENCRYPTION_KEY=         # python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

**`frontend/.env.local`**
```env
VITE_API_URL=http://localhost:8000
```
