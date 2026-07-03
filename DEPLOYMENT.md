# HospitalCore — Docker, CI/CD, and Deployment Guide

Stack: **Postgres (Neon/Supabase)** ← **Render** (backend API, Docker) + **Vercel** (frontend) ← **GitHub Actions** (CI gate) ← **GitHub** (source).

---

## 0. One-time prerequisite: generate lockfiles

This repo doesn't have `package-lock.json` files yet. Docker (`npm ci`) and CI both require them. Run once, locally, then commit:

```bash
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
git add backend/package-lock.json frontend/package-lock.json
```

---

## 1. Push to GitHub

Repo root should be the `hms/` folder (containing `backend/`, `frontend/`, `docker-compose.yml`, `render.yaml`, `.github/`).

```bash
cd hms
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

---

## 2. Local development with Docker

```bash
cp backend/.env.example backend/.env
# edit backend/.env — JWT_SECRET at minimum; DATABASE_URL and CLIENT_ORIGIN
# are overridden by docker-compose.yml for local dev, so you can leave them as-is

docker compose up --build
```

- Backend: http://localhost:5000 (nodemon hot-reload, source is volume-mounted)
- Frontend: http://localhost:5173 (Vite dev server, hot-reload)
- Postgres: localhost:5432 (`hospitalcore` / `hospitalcore` / `hospitalcore`)

First time only, run migrations against the dockerized DB:

```bash
docker compose exec backend npx prisma migrate dev
docker compose exec backend npm run seed   # optional
```

---

## 3. Database — Neon or Supabase (production)

1. Create a project at [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com).
2. Copy the **pooled** Postgres connection string (Neon) or the connection string from Project Settings → Database (Supabase). It should look like:
   `postgresql://user:password@host/dbname?sslmode=require`
3. Run migrations against it once, from your machine:
   ```bash
   cd backend
   DATABASE_URL="<your production connection string>" npx prisma migrate deploy
   ```
4. Save the connection string — you'll paste it into Render in the next step.

---

## 4. Backend → Render

**Option A — Blueprint (recommended, uses `render.yaml` already in the repo):**

1. Render dashboard → **New → Blueprint** → select your GitHub repo.
2. Render detects `render.yaml` and creates the `hospitalcore-backend` web service (Docker runtime, builds `backend/Dockerfile`, health check on `/api/health`).
3. It will prompt you to fill in the `sync: false` env vars — set:
   - `DATABASE_URL` — from step 3
   - `JWT_SECRET` — a long random string (e.g. `openssl rand -base64 48`)
   - `CLIENT_ORIGIN` — leave as a placeholder for now, e.g. `https://placeholder.vercel.app` (you'll update it after step 5)
   - `AI_API_KEY` — optional, only needed for the "AI Analyse" feature

**Option B — Manual dashboard setup:** New → Web Service → connect repo → set **Root Directory** to `backend` → Runtime: **Docker** → same env vars as above → Health Check Path: `/api/health`.

Once deployed, note the service URL, e.g. `https://hospitalcore-backend.onrender.com`.

Render auto-deploys on every push to `main` (`autoDeploy: true` in `render.yaml`).

---

## 5. Frontend → Vercel

1. Vercel dashboard → **Add New → Project** → import your GitHub repo.
2. Set **Root Directory** to `frontend`. Vercel will read `frontend/vercel.json` for the rest (build command, output dir, SPA rewrites for `react-router`).
3. Add an environment variable:
   - `VITE_API_BASE_URL` = `https://hospitalcore-backend.onrender.com/api` (your Render URL from step 4, with `/api` appended)
4. Deploy. Note the resulting URL, e.g. `https://hospitalcore.vercel.app`.

Vercel auto-deploys production on every push to `main`, and creates a preview deployment for every pull request automatically — no extra config needed.

**Now go back to Render** and update `CLIENT_ORIGIN` to your real Vercel URL (`https://hospitalcore.vercel.app`), so CORS allows the frontend to call the API. Redeploy the backend (or it'll pick it up on the next deploy).

---

## 6. CI/CD — GitHub Actions

`.github/workflows/ci.yml` runs on every push and pull request to `main`:

- **backend-ci**: installs deps, generates & validates the Prisma schema, smoke-tests that `app.js` boots without throwing.
- **frontend-ci**: installs deps, runs `eslint`, runs `vite build`.

This is a required-checks gate, not the deploy mechanism itself — actual deploys are handled natively by Render and Vercel's GitHub integrations (step 4 and 5), which is simpler and more reliable for these two platforms than wiring up custom deploy hooks. To make CI a hard gate:

- GitHub repo → Settings → Branches → Branch protection rule for `main` → require the `backend-ci` and `frontend-ci` status checks to pass before merging.

If you'd rather have deploys wait for CI to pass explicitly (instead of relying on branch protection), you can flip `autoDeploy: false` in `render.yaml`, generate a Deploy Hook URL in Render's dashboard, store it as a GitHub Actions secret (`RENDER_DEPLOY_HOOK_URL`), and add a `curl -fsSL "$RENDER_DEPLOY_HOOK_URL"` step at the end of the CI workflow, gated with `needs: [backend-ci, frontend-ci]` and `if: github.ref == 'refs/heads/main'`. Say the word if you want this wired up too.

---

## Environment variable summary

| Var | Local Docker | Render (prod) | Vercel (prod) |
|---|---|---|---|
| `DATABASE_URL` | set by compose (local pg) | Neon/Supabase string | — |
| `JWT_SECRET` | your `.env` | random secret | — |
| `CLIENT_ORIGIN` | `http://localhost:5173` | your Vercel URL | — |
| `VITE_API_BASE_URL` | `http://localhost:5000/api` | — | `https://<render-url>/api` |
