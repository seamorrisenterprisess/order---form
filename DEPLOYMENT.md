# Additional Scope Order Manager — Deployment Guide

## Stack
| Layer | Service | Notes |
|---|---|---|
| Frontend + API | Next.js 14 (App Router) on **Vercel** | Free tier covers early usage |
| Database | **Supabase** PostgreSQL | Free tier: 500 MB, 2 GB bandwidth |
| File storage | **Supabase Storage** | Stores order photos |
| Auth | Custom JWT (httpOnly cookie) | No third-party auth dependency |
| Email | **SendGrid** | Free tier: 100 emails/day |
| SMS | **Twilio** | Pay-as-you-go, ~$0.0079/SMS |

---

## 1 — Supabase Setup

1. Create a project at https://supabase.com
2. Go to **SQL Editor** and run `app/supabase/migrations/001_initial_schema.sql`
3. Create the storage bucket:
   - Go to **Storage → New bucket**
   - Name: `order-photos`
   - Set to **Private** (access via service role only)
4. Copy your project credentials:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (Settings → API → Service role) → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2 — Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp app/.env.example app/.env.local
# Edit .env.local with your credentials
```

Generate a JWT secret:
```bash
openssl rand -base64 48
```

---

## 3 — Local Development

```bash
cd app
npm install
npm run dev
# Open http://localhost:3000
```

Default login credentials (password: `seamorris2024`):
| Email | Role |
|---|---|
| marcus@seamorris.com | Operations Analyst |
| priya@seamorris.com | Operations Analyst |
| claire@seamorris.com | Account Manager |
| jordan@seamorris.com | Account Manager |
| admin@seamorris.com | Admin |

---

## 4 — Deploy to Vercel

```bash
npm i -g vercel
cd app
vercel deploy --prod
```

Then in the Vercel dashboard:
- Go to **Settings → Environment Variables**
- Add all variables from `.env.example` with production values
- Redeploy to apply

Set `NEXT_PUBLIC_APP_URL` to your Vercel production URL (e.g. `https://scope.seamorris.com`).

---

## 5 — SendGrid Setup

1. Create account at https://sendgrid.com
2. Go to **Settings → API Keys → Create API Key**
3. Grant "Mail Send" permission only
4. Add to `SENDGRID_API_KEY`
5. Verify sender domain at **Settings → Sender Authentication**
   - Verify `seamorris.com` (or your domain)
   - Update `from` address in `src/lib/email.ts` if needed

---

## 6 — Twilio Setup

1. Create account at https://twilio.com
2. Buy a phone number with SMS capability (~$1.15/month)
3. Copy **Account SID**, **Auth Token**, and the phone number
4. Add to `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`

> **Dev mode**: Leave Twilio/SendGrid env vars empty — the app will log messages
> to the console instead of sending them. No external accounts needed for development.

---

## 7 — Adding Users

Run in Supabase SQL Editor:

```sql
-- Replace values as needed. Password hash is bcrypt cost 10.
-- Generate hash: node -e "const b=require('bcryptjs'); console.log(b.hashSync('yourpassword',10))"
insert into users (email, name, role, password_hash) values
  ('newuser@seamorris.com', 'New User', 'operations_analyst', '$2b$10$...');
```

---

## 8 — Database Backups

Supabase provides automatic daily backups on paid plans. For the free tier:

```bash
# Export via Supabase CLI
supabase db dump --db-url "postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres" > backup.sql
```

---

## 9 — Running DB Migrations

All migrations live in `app/supabase/migrations/` and must be run **in order** (001 through 007) against your Supabase project.

**Option A — Supabase Dashboard SQL Editor:**
1. Open your Supabase project → SQL Editor
2. Paste and run each file in order:
   - `001_initial_schema.sql`
   - `002_subcontractors.sql`
   - `003_order_notes.sql`
   - `004_templates.sql`
   - `005_notifications.sql`
   - `006_*` (if present)
   - `007_magic_links.sql`

**Option B — Supabase CLI:**
```bash
# From the repo root
supabase db push
```
This applies all pending migrations automatically.

---

## 10 — Verifying Deployment

After deploying, confirm the database connection and environment variables are configured correctly by calling the health endpoint:

```bash
curl https://your-app.vercel.app/api/health
```

Expected response (HTTP 200):
```json
{
  "status": "ok",
  "db": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "env": {
    "supabase": true,
    "jwt_secret": true,
    "sendgrid": true,
    "twilio": true
  }
}
```

- `"db": "error"` → check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Any `env` value `false` → the corresponding environment variable is missing
- HTTP 503 → database is unreachable

---

## 11 — First Login

Seed users are created in `001_initial_schema.sql`. All have the default password `password123` — **change these immediately** via Admin → Users after first login.

| Email | Role |
|---|---|
| marcus@seamorris.com | Operations Analyst |
| priya@seamorris.com | Operations Analyst |
| claire@seamorris.com | Account Manager |
| jordan@seamorris.com | Account Manager |
| admin@seamorris.com | Admin |

To change a password, go to **Admin → Users** in the application and use the password update form.

---

## Architecture Notes

- **API routes** (`src/app/api/`) use the Supabase service role key — never exposed client-side
- **Middleware** (`src/middleware.ts`) enforces auth on all non-public routes
- **Client portal** (`/client/[token]`) is publicly accessible via signed token in the URL — no login required for clients
- **Photos** are stored in Supabase Storage; URLs are generated server-side per request
- **Email/SMS** integrations are drop-in: set the env vars and the placeholders become live
- **Role permissions** are enforced in both middleware (route-level) and individual API handlers (resource-level)
