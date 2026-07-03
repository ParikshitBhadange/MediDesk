# HospitalCore — Frontend

Vite + React (JavaScript) + Tailwind CSS + lucide-react, talking to the Express API in `../backend`.

```bash
npm install
cp .env.example .env   # VITE_API_BASE_URL=http://localhost:5000/api
npm run dev
```

## Structure
```
src/
  components/ui/   shadcn-style primitives (Button, Input, Select, Tabs, Card, …)
  components/      AuthenticatedLayout (sidebar), ProtectedRoute (route guard)
  context/          AuthContext — session, login/register/logout
  lib/              api.js (axios + JWT), export.js (PDF/Excel/WhatsApp/print), utils.js (cn)
  pages/Auth/       Sign in / sign up / forgot password
  pages/Dashboard/  AdminPage, DoctorPage, ReceptionistPage, role-redirect DashboardPage
```
