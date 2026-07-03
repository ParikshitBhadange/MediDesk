import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, HeartPulse, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, apiErrorMessage } from "@/context/AuthContext";
import { api } from "@/lib/api";

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("RECEPTIONIST");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        await login(email, password);
        toast.success("Welcome back");
        navigate("/dashboard");
      } else if (mode === "signup") {
        await register({ name, email, password, role });
        toast.success("Account created — you're signed in");
        navigate("/dashboard");
      } else {
        await api.post("/auth/forgot-password", { email });
        toast.success("If that account exists, a reset link has been sent");
        setMode("signin");
      }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <aside className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary/90 to-primary text-primary-foreground">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <HeartPulse className="h-6 w-6" /> HospitalCore
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold leading-tight">Care coordination, simplified.</h1>
          <p className="text-primary-foreground/80 max-w-md">
            Receptionists route patients, doctors treat with AI-assisted prescriptions, and admins oversee the
            whole hospital — from one calm dashboard.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} HospitalCore</p>
      </aside>

      <main className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Create your account" : "Reset password"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin"
                ? "Enter your credentials to continue"
                : mode === "signup"
                  ? "Join HospitalCore in seconds"
                  : "We'll email you a link"}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Jane Smith" />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@hospital.com" />
            </div>
            {mode !== "forgot" && (
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle password"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            {mode === "signup" && (
              <div>
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                    <SelectItem value="DOCTOR">Doctor</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </Button>
          </form>

          <div className="text-sm text-muted-foreground space-y-2 text-center">
            {mode === "signin" && (
              <>
                <button className="hover:text-foreground underline underline-offset-4" onClick={() => setMode("forgot")}>
                  Forgot password?
                </button>
                <div>
                  No account?{" "}
                  <button className="text-primary font-medium hover:underline" onClick={() => setMode("signup")}>
                    Register
                  </button>
                </div>
              </>
            )}
            {mode === "signup" && (
              <div>
                Have an account?{" "}
                <button className="text-primary font-medium hover:underline" onClick={() => setMode("signin")}>
                  Sign In
                </button>
              </div>
            )}
            {mode === "forgot" && (
              <button className="text-primary font-medium hover:underline" onClick={() => setMode("signin")}>
                Back to sign in
              </button>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
