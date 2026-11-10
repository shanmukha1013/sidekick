# Sidekick

Sidekick is one marketplace for part-time and flexible work. Every account can **find work and hire people** — from
the same login and the same dashboard. There are no separate job-seeker and employer apps or accounts.

**Live:** https://sidekick-sand-eight.vercel.app

## Features

- **One account, one dashboard.** Register with full name, username, email, phone and password; sign in with email *or* username. Every account has both workspaces — *Find work* and *Hire talent* — side by side on the Overview, with one sidebar: Overview · Find Jobs · My Applications · Saved Jobs · Post a Job · My Listings · Manage Applicants · Messages · Notifications · My Profile · Settings.
- **Secure sessions.** bcrypt password hashing; JWTs carry a revocable `jti` (logout invalidates the token server-side) and a token version (changing or resetting a password signs out every other device). Authorization is per record: only a job's poster can edit/delete it or see its applicants, and only the two people on an application can read its messages.
- **Find work:** search and filter (keyword, category, location, employment type, remote/on-site, experience, pay sort), skill-based recommendations, save jobs, apply with a cover letter, track status, withdraw.
- **Hire talent:** post, edit, close/reopen and delete listings; review applicants with contact details; move candidates through *in review → shortlisted → accepted/declined*. Listings post under your company name, or your own name if you haven't set one.
- **Interactive map** (Leaflet + OpenStreetMap tiles): drag, scroll/pinch zoom, clickable markers with job details, list ↔ map sync, *Search this area* and *Near me* filtering (`bbox` on `GET /jobs`), loading/error states, and a mobile List/Map toggle. Coordinates come only from the poster — geocoded from the address via OSM Nominatim, their device location, or a pin dropped on the map. Jobs without coordinates are listed but not pinned.
- **Messaging** between applicant and employer on every application, with unread counts.
- **Notifications** for new applications, status changes, withdrawals and removed listings.
- **Password reset** by email (SMTP), profile and company pages, settings.

## Stack

| Layer    | Tech                                                             |
| -------- | ---------------------------------------------------------------- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4, lucide icons |
| Backend  | FastAPI, Motor (async MongoDB), Pydantic v2, python-jose, bcrypt |
| Database | MongoDB (Atlas in production)                                    |
| Hosting  | Vercel (frontend), Render (API)                                  |

```
backend/app
  api/v1/      auth, users, profiles, jobs, applications, saved, notifications, messages
  api/deps.py  authentication + role guards
  core/        settings, security (hashing, JWT)
  db/          Mongo client + index creation
  schemas/     request/response models and validation
  services/    serializers, notifications, email
backend/tests  API tests (run against a real MongoDB)
frontend/src
  app/(auth)   login, register, forgot/reset password
  app/(app)    authenticated app (dashboard, jobs, applications, saved, post-job, listings, applicants, messages, …)
  components/  design system (ui/), app shell, job components, brand
  lib/         API client, auth context, hooks, types
```

## Local development

Prerequisites: Python 3.11+, Node 20+, MongoDB (`docker compose up -d` starts one).

```bash
# API
cd backend
python -m venv venv && venv\Scripts\activate      # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                              # set JWT_SECRET
uvicorn app.main:app --reload --port 8000         # docs at http://localhost:8000/docs

# Web
cd frontend
npm install
cp .env.example .env.local
npm run dev                                       # http://localhost:3000
```

### Tests

```bash
cd backend
pip install -r requirements-dev.txt
# Terminal 1 — throwaway database
DATABASE_NAME=sidekick_e2e_test JWT_SECRET=<32+ chars> uvicorn app.main:app --port 8001
# Terminal 2
JWT_SECRET=<same> SIDEKICK_API_URL=http://localhost:8001/api/v1 pytest -q
```

## Demo mode (temporary fallback)

When the API or its database can't be reached, the web app switches that browser tab into **demo mode**: a
clearly labelled ("DEMO MODE — Local data") local store that runs the whole marketplace in the browser so the
product can still be demonstrated. It is isolated from production:

- Demo records live in `localStorage` (`sidekick.demo.v1`); the demo session lives in `sessionStorage`
  (`sidekick.demo.session`). Passwords are stored only as salted PBKDF2-SHA256 hashes.
- Nothing is sent to the API or MongoDB, and the live session token is never touched.
- The sample jobs, companies and applicants exist **only** inside demo mode.
- Demo-only account: `demo@sidekick.demo` / `Demo1234` (finds work and hires, like every account).
- Click the badge to reset demo data, or to switch back once the live server is healthy.

Mode selection is controlled by `NEXT_PUBLIC_DATA_MODE`: `auto` (default — probes `GET /api/v1/health` once per
tab and falls back to demo if it fails), `demo` (always demo) or `live` (demo disabled).

## Deployment

### API on Render

`render.yaml` (repo root) describes the service (`rootDir: backend`). Required environment variables:

| Variable       | Value                                                                                   |
| -------------- | --------------------------------------------------------------------------------------- |
| `MONGODB_URL`  | Atlas SRV string, e.g. `mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority` |
| `JWT_SECRET`   | 32+ random characters (`python -c "import secrets;print(secrets.token_urlsafe(48))"`)   |
| `ENVIRONMENT`  | `production`                                                                            |
| `FRONTEND_URL` | `https://sidekick-sand-eight.vercel.app` (comma-separate multiple origins)              |
| `SMTP_*`       | Optional — enables password-reset emails                                                |
| `CLOUDINARY_URL` | Optional — enables profile photo uploads                                              |

In **MongoDB Atlas → Network Access**, allow `0.0.0.0/0` (Render's free plan has no static outbound IPs), and make sure the database user in `MONGODB_URL` has read/write access.

Check it with `GET /api/v1/health` → `{"status":"ok","database":"connected"}`.

### Web on Vercel

Set the project root to `frontend` and add:

| Variable              | Value                                   |
| --------------------- | --------------------------------------- |
| `NEXT_PUBLIC_API_URL` | `https://sidekick-nr9n.onrender.com`    |

`/api/v1` is appended automatically if it is missing. Redeploy after changing it (it is inlined at build time).
Optionally set `NEXT_PUBLIC_DATA_MODE=live` to disable the demo-mode fallback in production.
