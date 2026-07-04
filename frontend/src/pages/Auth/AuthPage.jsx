import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, HeartPulse, Loader2, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OtpInput from "@/components/OtpInput";
import { useAuth, apiErrorMessage } from "@/context/AuthContext";
import { api } from "@/lib/api";

const RESEND_COOLDOWN_SECONDS = 60;

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "forgot"

  // signin / signup fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("RECEPTIONIST");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // forgot-password wizard: request code -> verify code -> set new password
  const [forgotStep, setForgotStep] = useState("request"); // "request" | "verify" | "reset"
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const cooldownRef = useRef(null);
  useEffect(() => {
    if (resendCooldown <= 0) return;
    cooldownRef.current = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(cooldownRef.current);
  }, [resendCooldown]);

  function switchMode(next) {
    setMode(next);
    if (next !== "forgot") {
      setForgotStep("request");
      setOtp("");
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
      setResendCooldown(0);
    }
  }

  async function requestOtp({ isResend = false } = {}) {
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      toast.success(isResend ? "A new code has been sent" : "If that account exists, we've emailed a 6-digit code");
      setForgotStep("verify");
      setOtp("");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-otp", { email, otp });
      setResetToken(data.data.resetToken);
      setForgotStep("reset");
      toast.success("Code verified — choose your new password");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function submitNewPassword() {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token: resetToken, password: newPassword });
      toast.success("Password updated — sign in with your new password");
      switchMode("signin");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (mode === "signin") {
      setLoading(true);
      try {
        await login(email, password);
        toast.success("Welcome back");
        navigate("/dashboard");
      } catch (err) {
        toast.error(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
      return;
    }
    if (mode === "signup") {
      setLoading(true);
      try {
        await register({ name, email, password, role });
        toast.success("Account created — you're signed in");
        navigate("/dashboard");
      } catch (err) {
        toast.error(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
      return;
    }
    // mode === "forgot"
    if (forgotStep === "request") return requestOtp();
    if (forgotStep === "verify") return verifyOtp();
    if (forgotStep === "reset") return submitNewPassword();
  }

  const titles = {
    signin: ["Sign in", "Enter your credentials to continue"],
    signup: ["Create your account", "Join HospitalCore in seconds"],
    forgot: {
      request: ["Forgot password", "We'll email you a 6-digit code"],
      verify: ["Enter the code", `Sent to ${email || "your email"} — check spam if it's missing`],
      reset: ["Set a new password", "Choose something you haven't used before"],
    },
  };
  const [title, subtitle] =
    mode === "forgot" ? titles.forgot[forgotStep] : titles[mode];

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
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Jane Smith" />
              </div>
            )}

            {/* Email: shown for signin/signup always, and for forgot only on the "request" step */}
            {(mode !== "forgot" || forgotStep === "request") && (
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@hospital.com"
                    disabled={mode === "forgot" && forgotStep !== "request"}
                  />
                </div>
              </div>
            )}

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

            {/* Step 2 of forgot-password: 6-digit OTP entry */}
            {mode === "forgot" && forgotStep === "verify" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Enter the 6-digit code we emailed you</span>
                </div>
                <OtpInput value={otp} onChange={setOtp} disabled={loading} />
                <div className="text-xs text-muted-foreground text-center">
                  {resendCooldown > 0 ? (
                    <span>Resend code in {resendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      className="text-primary hover:underline font-medium"
                      onClick={() => requestOtp({ isResend: true })}
                      disabled={loading}
                    >
                      Resend code
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Step 3 of forgot-password: set new password (only reachable after OTP is verified) */}
            {mode === "forgot" && forgotStep === "reset" && (
              <>
                <div>
                  <Label htmlFor="newPassword">New password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPw ? "text" : "password"}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                      aria-label="Toggle password"
                    >
                      {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <Input
                    id="confirmPassword"
                    type={showNewPw ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || (mode === "forgot" && forgotStep === "verify" && otp.length !== 6)}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {mode === "signin" && "Sign in"}
              {mode === "signup" && "Create account"}
              {mode === "forgot" && forgotStep === "request" && "Send code"}
              {mode === "forgot" && forgotStep === "verify" && "Verify code"}
              {mode === "forgot" && forgotStep === "reset" && "Reset password"}
            </Button>
          </form>

          <div className="text-sm text-muted-foreground space-y-2 text-center">
            {mode === "signin" && (
              <>
                <button className="hover:text-foreground underline underline-offset-4" onClick={() => switchMode("forgot")}>
                  Forgot password?
                </button>
                <div>
                  No account?{" "}
                  <button className="text-primary font-medium hover:underline" onClick={() => switchMode("signup")}>
                    Register
                  </button>
                </div>
              </>
            )}
            {mode === "signup" && (
              <div>
                Have an account?{" "}
                <button className="text-primary font-medium hover:underline" onClick={() => switchMode("signin")}>
                  Sign In
                </button>
              </div>
            )}
            {mode === "forgot" && (
              <button className="text-primary font-medium hover:underline" onClick={() => switchMode("signin")}>
                Back to sign in
              </button>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}