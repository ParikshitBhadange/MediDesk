import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AuthPage from "@/pages/Auth/AuthPage";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardPage from "@/pages/Dashboard/DashboardPage";
import AdminPage from "@/pages/Dashboard/AdminPage";
import DoctorPage from "@/pages/Dashboard/DoctorPage";
import ReceptionistPage from "@/pages/Dashboard/ReceptionistPage";

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  return <Navigate to={user ? "/dashboard" : "/auth"} replace />;
}

export default function App() {
  return (
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
          </Route>
          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
