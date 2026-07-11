import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { HeartPulse, LayoutDashboard, LogOut, Menu, Search, Shield, Stethoscope, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function AuthenticatedLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function signOut() {
    logout();
    navigate("/auth", { replace: true });
  }

  // Plain nav entries — none of these are ever conditionally disabled based
  // on page state (e.g. whether the doctor currently has patients in queue).
  // "Search patients" in particular must always be reachable, since its
  // whole purpose is looking up patients OUTSIDE today's queue.
  const navItems = [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard, show: true },
    { to: "/receptionist", label: "Reception", icon: Users, show: user.role === "RECEPTIONIST" || user.role === "ADMIN" },
    { to: "/doctor", label: "Doctor", icon: Stethoscope, show: user.role === "DOCTOR" || user.role === "ADMIN" },
    { to: "/doctor/search", label: "Search patients", icon: Search, show: user.role === "DOCTOR" || user.role === "ADMIN" },
    { to: "/admin", label: "Admin", icon: Shield, show: user.role === "ADMIN" },
  ];

  const visibleNavItems = navItems.filter((n) => n.show);
  // /doctor/search would also match a naive startsWith("/doctor") check,
  // highlighting both entries at once — pick the longest (most specific)
  // matching path instead.
  const activeTo = visibleNavItems
    .filter((n) => location.pathname === n.to || location.pathname.startsWith(`${n.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0]?.to;

  // Close the mobile drawer automatically whenever the route changes (e.g.
  // after tapping a nav link), so it doesn't stay open over the new page.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Prevent background scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function NavLinks({ onNavigate }) {
    return (
      <nav className="flex-1 p-3 space-y-1">
        {visibleNavItems.map((n) => {
          const active = n.to === activeTo;
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={onNavigate}
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
    );
  }

  function UserFooter() {
    return (
      <div className="p-3 border-t space-y-2">
        <div className="text-xs text-muted-foreground px-2">
          <div className="truncate font-medium text-foreground">{user.email}</div>
          <div className="capitalize">{user.role.toLowerCase()}</div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Mobile top bar — the only nav entry point below the md breakpoint,
          so it needs to always be visible, not tucked away in a page header. */}
      <header className="md:hidden h-14 flex items-center justify-between px-4 border-b bg-sidebar sticky top-0 z-40">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 text-sidebar-foreground"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 font-semibold">
          <HeartPulse className="h-5 w-5 text-primary" /> MediDesk
        </div>
        <div className="w-9" /> {/* spacer to keep the title centered */}
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 max-w-[85vw] bg-sidebar h-full flex flex-col shadow-xl">
            <div className="h-14 flex items-center justify-between px-4 border-b">
              <div className="flex items-center gap-2 font-semibold">
                <HeartPulse className="h-5 w-5 text-primary" /> MediDesk
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-2 -mr-2 text-sidebar-foreground" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            <UserFooter />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r bg-sidebar">
        <div className="h-16 flex items-center gap-2 px-5 border-b">
          <HeartPulse className="h-5 w-5 text-primary" />
          <span className="font-semibold">MediDesk</span>
        </div>
        <NavLinks />
        <UserFooter />
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}