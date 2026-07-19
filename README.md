# 🏥 MediDesk

MediDesk is a full-stack hospital & clinic management platform that streamlines patient intake, doctor consultations, prescriptions, and fee collection through three dedicated, role-based workspaces — **Admin**, **Doctor**, and **Receptionist**.

Built with a Node.js/Express REST API on the backend and a React (Vite) frontend, MediDesk features JWT-based authentication, role-based access control (RBAC), an AI-assisted clinical summary/prescription tool, and a fully automated CI/CD pipeline.

🔗 **Live Demo:** https://medidesk-theta.vercel.app
🔗 **Repository:** https://github.com/ParikshitBhadange/MediDesk

---

## 🚀 Key Features

### 🔐 Authentication & Access Control
- **JWT-based authentication** (`jsonwebtoken` + `bcryptjs`) with stateless session handling.
- **Role-Based Access Control (RBAC)** enforced server-side via custom Express middleware (`requireAuth`, `requireRole`) — not just hidden UI, every route checks permissions independently of the frontend.
- **Audit logging** (`audit.service.js`) to trace administrative and clinical actions.

### 💼 Role-Based Workspaces
- **Admin Dashboard** — manage users, system configuration, and review audit logs.
- **Doctor Station** — view assigned patient queue, record consultations, write prescriptions, and get AI-assisted clinical support.
- **Receptionist Desk** — patient registration, appointment/meeting scheduling, and fee collection.

### 🤖 AI-Assisted Clinical Support
- **AI patient summaries** — automatically summarizes a patient's consultation history for the doctor's side panel as soon as the patient is opened.
- Talks to any **OpenAI-compatible chat-completions endpoint** ( Groq, OpenRouter, local vLLM, etc.) — configurable via `AI_BASE_URL` / `AI_MODEL`, so the provider isn't hardcoded.
- Fails gracefully: if no API key is configured, the endpoint returns a `503` instead of crashing.

### 📊 Data Export
- Client-side export of records to **CSV, Excel (xlsx), and PDF** (via `jspdf` + `jspdf-autotable`).

### ⚙️ DevOps
- **CI/CD via GitHub Actions** (`.github/workflows/ci.yml`): lint + build the frontend, validate the Prisma schema, and boot-smoke-test the backend on every push/PR to `main`; auto-deploys to **Render** (backend) and **Vercel** (frontend) on merge.

---

## 🛠 Tech Stack

**Backend:** Node.js, Express.js, PostgreSQL, Prisma ORM, JWT, Zod (validation), Helmet, express-rate-limit
**Frontend:** React, Vite, Tailwind CSS, shadcn/ui, React Router, Axios
**AI:** Groq API (configurable provider/model)
**DevOps:** GitHub Actions, Render, Vercel
**Testing:** Jest, Supertest

---

## 📂 Project Structure

```text
MediDesk-main/
├── .github/workflows/ci.yml     # CI/CD pipeline (lint, build, prisma validate, smoke test, deploy)
├── render.yaml                  # Render deployment config (backend)
├── DEPLOYMENT.md                # Deployment guide
├── backend/
│   ├── server.js                # Entry point
│   ├── prisma/
│   │   ├── schema.prisma        # 8-entity relational schema
│   │   ├── seed.js              # Seeds demo accounts + sample data
│   │   └── migrations/          # Versioned schema migrations
│   └── src/
│       ├── app.js               # Express app config, global error handling
│       ├── controllers/         # admin, auth, doctor, patient
│       ├── middleware/          # auth, role (RBAC), validate, errorHandler
│       ├── routes/              # admin, appointment, auth, doctor, patient
│       ├── services/            # admin, ai, audit, auth, doctor, patient
│       └── tests/               # Jest/Supertest integration tests
└── frontend/
    ├── tailwind.config.js
    └── src/
        ├── App.jsx              # Route definitions + role-protected routes
        ├── context/              # AuthContext (session state)
        ├── lib/                  # API client, CSV/Excel/PDF export helpers
        └── pages/
            ├── Auth/              # Login/register
            └── Dashboard/         # Admin, Doctor, Receptionist views
```

---

## 🗄️ Database Schema

Modeled in PostgreSQL via Prisma — 8 entities with foreign-key relations and migration-based versioning:

`User` · `Patient` · `Consultation` · `Meeting` · `Prescription` · `PrescriptionItem` · `Fee` · `AuditLog`

---

## ⚡ Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 

### 1. Clone
```bash
git clone https://github.com/ParikshitBhadange/MediDesk.git
cd MediDesk
```

### 2. Backend
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/medidesk"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
CLIENT_ORIGIN="http://localhost:5173"
PORT=5000

# Optional — AI-assisted summaries/prescriptions
AI_API_KEY=""
AI_BASE_URL="https://api.groq.com/openai/v1"
AI_MODEL="llama-3.3-70b-versatile"

# Optional — email (password reset OTP)
RESEND_API_KEY=""
MAIL_FROM="onboarding@resend.dev"
```

```bash
npx prisma generate
npx prisma migrate dev
npm run seed        # creates demo accounts below
npm run dev          # http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

### Demo accounts (after `npm run seed`)
| Role         | Email                       | Password      |
|--------------|------------------------------|----------------|
| Admin        | admin@hospitalcore.com       | Password123!   |
| Doctor       | doctor@hospitalcore.com      | Password123!   |
| Receptionist | reception@hospitalcore.com   | Password123!   |

---

## 🧪 Testing

```bash
cd backend
npm test              # Jest + Supertest integration suite
npm run test:coverage
```

## 📦 Deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full guide. In short: backend deploys to **Render** (`render.yaml`), frontend deploys to **Vercel**, and both are triggered automatically by the GitHub Actions workflow on every push to `main`.

## 📄 License

This project is available for educational and portfolio purposes.
