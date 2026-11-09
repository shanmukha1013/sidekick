# Sidekick

Sidekick is a part-time job marketplace. Students and job seekers find flexible work; employers post jobs, review applicants and hire. One account can do both.

**Live:** https://sidekick-sand-eight.vercel.app

## Features

- **One account, unified sign-in.** Register with full name, username, email, phone and password. Sign in with email *or* username. Roles (find work / hire people / both) are chosen during onboarding and can be changed in Settings.
- **Secure sessions.** bcrypt password hashing; JWTs carry a revocable `jti` (logout invalidates the token server-side) and a token version (changing or resetting a password signs out every other device). Roles are always read from MongoDB, never trusted from the client.
- **Job seekers:** search and filter (keyword, category, location, employment type, remote/on-site, experience, pay sort), skill-based recommendations, save jobs, apply with a cover letter, track status, withdraw.
- **Employers:** post, edit, close/reopen and delete listings; review applicants with contact details; move candidates through *in review → shortlisted → accepted/declined*.
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
  app/(app)    authenticated app (dashboard, jobs, applications, employer, messages, …)
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
