import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AuthPage from "@/pages/Auth/AuthPage";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardPage from "@/pages/Dashboard/DashboardPage";

// Each dashboard is only ever used by one role, so there's no reason for a
// receptionist's browser to download the doctor/admin bundles (and their
// jsPDF/xlsx-adjacent code paths) or vice versa. Splitting these into their
// own chunks means login only pulls down the page the signed-in role
// actually needs, shrinking first-load JS substantially.
const AdminPage = lazy(() => import("@/pages/Dashboard/AdminPage"));
const DoctorPage = lazy(() => import("@/pages/Dashboard/DoctorPage"));
const DoctorPatientSearch = lazy(() => import("@/pages/Dashboard/DoctorPatientSearch"));
const DoctorPatientDetail = lazy(() => import("@/pages/Dashboard/DoctorPatientDetail"));
const ReceptionistPage = lazy(() => import("@/pages/Dashboard/ReceptionistPage"));

function RouteFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading…
    </div>
  );
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  return <Navigate to={user ? "/dashboard" : "/auth"} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<AuthPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AuthenticatedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route element={<ProtectedRoute roles={["RECEPTIONIST", "ADMIN"]} />}>
              <Route path="/receptionist" element={<ReceptionistPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={["DOCTOR", "ADMIN"]} />}>
              <Route path="/doctor" element={<DoctorPage />} />
              <Route path="/doctor/search" element={<DoctorPatientSearch />} />
              <Route path="/doctor/search/:patientId" element={<DoctorPatientDetail />} />
            </Route>
            <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}