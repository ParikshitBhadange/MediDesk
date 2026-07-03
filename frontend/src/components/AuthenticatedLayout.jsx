import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { HeartPulse, LayoutDashboard, LogOut, Shield, Stethoscope, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function AuthenticatedLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  function signOut() {
    logout();
    navigate("/auth", { replace: true });
  }

  const navItems = [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard, show: true },
    { to: "/receptionist", label: "Reception", icon: Users, show: user.role === "RECEPTIONIST" || user.role === "ADMIN" },
    { to: "/doctor", label: "Doctor", icon: Stethoscope, show: user.role === "DOCTOR" || user.role === "ADMIN" },
    { to: "/admin", label: "Admin", icon: Shield, show: user.role === "ADMIN" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-60 flex-col border-r bg-sidebar">
        <div className="h-16 flex items-center gap-2 px-5 border-b">
          <HeartPulse className="h-5 w-5 text-primary" />
          <span className="font-semibold">HospitalCore</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems
            .filter((n) => n.show)
            .map((n) => {
              const active = location.pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <n.icon className="h-4 w-4" /> {n.label}
                </Link>
              );
            })}
        </nav>
        <div className="p-3 border-t space-y-2">
          <div className="text-xs text-muted-foreground px-2">
            <div className="truncate font-medium text-foreground">{user.email}</div>
            <div className="capitalize">{user.role.toLowerCase()}</div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
