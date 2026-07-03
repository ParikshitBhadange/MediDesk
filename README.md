# HospitalCore

A hospital management system with three roles — **Admin**, **Doctor**, **Receptionist** —
rebuilt as a plain **React (JS) + Tailwind + shadcn-style UI + Node/Express + Prisma + Neon Postgres**
stack (migrated away from the original Lovable/Supabase/TanStack build).

```
backend/    Express API, Prisma ORM, Neon Postgres
frontend/   Vite + React (JS) + Tailwind CSS
```

## Quick start

### 1. Database (Neon)
Create a free Postgres database at https://neon.tech and copy its connection string.

### 2. Backend
```bash
cd backend
cp .env.example .env        # fill in DATABASE_URL and JWT_SECRET
npm install
npm run prisma:migrate      # creates tables
npm run seed                # optional: admin/doctor/receptionist demo accounts
npm run dev                 # http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env        # VITE_API_BASE_URL=http://localhost:5000/api
npm install
npm run dev                 # http://localhost:5173
```

### Demo accounts (after `npm run seed`)
| Role         | Email                      | Password      |
|--------------|----------------------------|----------------|
| Admin        | admin@hospitalcore.com     | Password123!   |
| Doctor       | doctor@hospitalcore.com    | Password123!   |
| Receptionist | reception@hospitalcore.com | Password123!   |

## AI-assisted prescriptions
The doctor dashboard's "AI Analyse" button calls `POST /api/doctor/analyse`, which forwards
symptoms/disease/cause to any OpenAI-compatible chat-completions endpoint. Set `AI_API_KEY`
(and optionally `AI_BASE_URL` / `AI_MODEL`) in `backend/.env` to enable it; without a key the
endpoint returns a 503 and the button shows a toast instead of crashing the page.

## What changed vs. the Lovable/Supabase version
- Supabase Auth → JWT auth (`jsonwebtoken` + `bcryptjs`), issued by `/api/auth/login`.
- Supabase RLS/policies → Express `requireAuth` + `requireRole` middleware.
- Supabase Postgres functions (`get_my_role`, `has_role`) → plain Prisma queries.
- Multi-role `user_roles` table → a single `role` enum column on `User` (per the original
  Prisma draft); switch back to a join table if a user can hold more than one role.
- `meetings` now has a `status` (PENDING/COMPLETED/CANCELLED), and every relation
  (`assignedDoctor`, `doctorId` on consultations/meetings/prescriptions, `collectedBy`, etc.)
  is a real foreign key — both gaps identified when the two original schemas were compared.
- FullCalendar → a plain sortable table of upcoming meetings, to avoid a heavy calendar
  dependency; swap back in easily if a visual calendar is needed later.
