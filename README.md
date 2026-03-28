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
| Auth | JWT via `django-bolt`, Google OAuth 2.0 + PKCE |
| ML | GLiNER (entity extraction), GLiClass (classification) |
| PDF | pdfplumber (text + table extraction) |
| Package managers | `pnpm` (frontend), `uv` (backend) |
| AI coding agents | [Claude Code](https://claude.ai/code) (Opus), [OpenCode](https://opencode.ai) (GLM-5) |

## Project Structure

```
finn-lens/
├── frontend/                  # React app (Vite + Tailwind v4 + shadcn/ui)
└── backend/                   # Django + Django Bolt API
    ├── accounts/              # Auth viewsets (login, me)
    ├── banking/               # Credit cards, transactions, bills, subscriptions
    │   ├── email_extractor/   # Standalone email data extraction (publishable)
    │   └── parsers/           # PDF statement parsers
    ├── gmail/                 # Gmail sync, email parsing, sender rules
    │   └── parsers/           # Email content parsers (CC alerts, statements, etc.)
    ├── classifier/            # ML classification pipeline
    ├── oauth/                 # Google OAuth endpoints
    └── finnlens/              # Django settings
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

Open `http://localhost:5174` and sign in with your superuser credentials.

### Demo Mode

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

## Environment Variables

**`backend/.env`**
```env
SECRET_KEY=
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
BOLT_JWT_SECRET=                    # min 32 chars
BOLT_JWT_EXPIRATION=3600
CORS_ALLOWED_ORIGINS=http://localhost:5174

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
