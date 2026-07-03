import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  if (user.role === "ADMIN") return <Navigate to="/admin" replace />;
  if (user.role === "DOCTOR") return <Navigate to="/doctor" replace />;
  if (user.role === "RECEPTIONIST") return <Navigate to="/receptionist" replace />;
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold">No role assigned</h1>
      <p className="text-muted-foreground mt-2">Ask an admin to assign you a role.</p>
    </div>
  );
}
