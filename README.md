# 🏥 MediDesk

MediDesk is an enterprise-grade, full-stack Hospital & Clinic Management Platform designed to streamline operations across medical practitioners, administrative teams, patients, and administrators[span_2](start_span)[span_2](end_span). Powered by a high-performance Node.js REST API backend and a fluid React frontend, it incorporates multi-role access control, automated database migrations, and modern DevOps configurations[span_3](start_span)[span_3](end_span).

---

## 🚀 Key Features

### 🔐 Advanced Authentication & Security
*   **Role-Based Access Control (RBAC):** Tailored dashboards, route guards, and action permissions for **Admin**, **Doctor**, **Receptionist**, and **Patient** workflows[span_4](start_span)[span_4](end_span).
*   **Secure Session Management:** Stateless authorization utilizing JSON Web Tokens (JWT) and custom authentication middleware[span_5](start_span)[span_5](end_span).
*   **Self-Service Recovery:** Multi-factor verification utilizing time-sensitive OTP password reset flows powered by an integrated mailer utility[span_6](start_span)[span_6](end_span).
*   **Comprehensive Auditing:** Native background ledgering (`audit.service.js`) to capture and trace administrative and medical actions[span_7](start_span)[span_7](end_span).

### 💼 Specialized Multi-Role Workspaces
*   **Admin Dashboard:** Complete orchestration over system users, platform configurations, database records, and service auditing[span_8](start_span)[span_8](end_span).
*   **Doctor Station:** Personalized schedule views, appointment routing, structured medical note compilation, and prescription management[span_9](start_span)[span_9](end_span).
*   **Receptionist Desk:** Optimized patient onboarding, rapid appointment scheduling, queue management, and front-desk coordination[span_10](start_span)[span_10](end_span).
*   **Patient Portal:** Self-service registration, medical history tracking, clinical record viewing, and profile maintenance[span_11](start_span)[span_11](end_span).

### ✨ Extended Tech-Driven Workflows
*   **AI Service Integration:** Native Hooks (`ai.service.js`) ready to process diagnostic patterns, generate summaries, or handle clinical decision assistance[span_12](start_span)[span_12](end_span).
*   **Robust Data Reporting:** High-efficiency client-side processing (`export.js`) supporting flat-file data compilation (CSV/JSON summaries) for cross-platform data loading[span_13](start_span)[span_13](end_span).

---

## 🛠 Tech Stack & Architecture

### Backend Ecosystem
*   **Runtime Environment:** Node.js[span_14](start_span)[span_14](end_span)
*   **API Framework:** Express.js (Modular Route Layout, Centralized Async Handling, Error Cascading)[span_15](start_span)[span_15](end_span)
*   **Database Mapping:** Prisma ORM[span_16](start_span)[span_16](end_span)
*   **Database System:** PostgreSQL / MySQL (Configurable via Prisma environment)[span_17](start_span)[span_17](end_span)
*   **Data Validation Engine:** Schema-driven validation pipelines (`validate.js`)[span_18](start_span)[span_18](end_span)

### Frontend Ecosystem
*   **Build Utility & Framework:** React.js powered by Vite[span_19](start_span)[span_19](end_span)
*   **Styling & Design Tokens:** Tailwind CSS Engine with PostCSS configurations[span_20](start_span)[span_20](end_span)
*   **UI Components:** Shadcn/ui Primitives (Custom Textarea, Select, Tabs, Inputs, Badges, Checkboxes, and Cards)[span_21](start_span)[span_21](end_span)
*   **State Hydration:** React Context API (`AuthContext`) for unified session state management[span_22](start_span)[span_22](end_span)

### DevOps & Deployment Blueprint
*   **Container Infrastructure:** Native Multi-Container Docker Deployment (`docker-compose.yml`)[span_23](start_span)[span_23](end_span)
*   **CI/CD Automation:** Automated GitHub Actions Workflows (`.github/workflows/ci.yml`)[span_24](start_span)[span_24](end_span)
*   **Cloud Orchestration:** Production configs tailored for Render (`render.yaml`) and Vercel Edge Layout (`vercel.json`)[span_25](start_span)[span_25](end_span)

---

## 📂 System File Layout

```text
MediDesk-main/
├── .github/workflows/ci.yml   # Automated Integration Pipeline
├── docker-compose.yml          # Multi-Container Application Orchestration
├── render.yaml                 # Production Environment Deployment Specification
├── DEPLOYMENT.md               # Advanced Deployment Documentation
├── backend/
│   ├── Dockerfile              # Layer-Optimized Backend Image Setup
│   ├── server.js               # Network Socket Bootstrapper
│   ├── prisma/
│   │   ├── schema.prisma       # Database Domain Entities Model Map
│   │   ├── seed.js             # Initial Role/System Seeding Engine
│   │   └── migrations/         # Relational DB Schema Versions
│   └── src/
│       ├── app.js              # Application Configurations & Error Catching
│       ├── controllers/        # Express Endpoints (Admin, Auth, Doctor, Patient)
│       ├── middleware/         # Auth, Global Error Traps, RBAC, Data Validation
│       ├── routes/             # Segmented API Router Chains
│       ├── services/           # Business Engines (AI, Audit Logs, Auth Processing)
│       ├── utils/              # Responders, Custom Throwables, Mailer Bridges
│       └── validations/        # Joi/Zod Security Mapping Specifications
└── frontend/
    ├── package.json            # Interface Dependencies & Deployment Tooling
    ├── tailwind.config.js      # Custom Typography & Semantic Color Matrix
    └── src/
        ├── App.jsx             # Root View Router Port Setup
        ├── components/         # Protected View UI Wrappers & Layout Atoms
        ├── context/            # Auth Session Hooks Engine
        ├── lib/                # API Adapters & Client-side Data Exporters
        └── pages/              # Composite Layout Modules (Dashboard Views)
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
