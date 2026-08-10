import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { useAuth, dashboardPathFor } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LunaLogo from "@/components/LunaLogo";

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, session, role, hospital, loading } = useAuth();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  useEffect(() => {
    if (loading || !session || !role) return;
    if (role !== "super_admin" && hospital && hospital.status !== "approved") {
      navigate("/pending-approval", { replace: true });
      return;
    }
    navigate(dashboardPathFor(role), { replace: true });
  }, [loading, session, role, hospital, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error: signInError } = await signIn(loginEmail, loginPassword);
    setSubmitting(false);
    if (signInError) setError("Invalid credentials. Check your email and password.");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 medical-gradient items-center justify-center p-12">
        <div className="max-w-md text-center">
          <LunaLogo variant="light" className="w-20 h-20 mx-auto mb-8" />
          <h1 className="text-4xl font-bold text-primary-foreground mb-4 tracking-tight">LunaDX</h1>
          <p className="text-lg text-primary-foreground/80 mb-2">AI-Assisted Clinical Screening</p>
          <p className="text-sm text-primary-foreground/60 leading-relaxed">
            Organization-level deployment for hospitals and clinics.
            Register your facility and invite your clinical team.
          </p>
        </div>
      </div>

      {/* Right - Forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <LunaLogo className="w-10 h-10" asLink />
            <span className="text-xl font-bold text-foreground">LunaDX</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 text-destructive text-sm mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <h2 className="text-xl font-bold text-foreground mb-1">Welcome back</h2>
          <p className="text-muted-foreground text-sm mb-6">Sign in to your hospital account</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="login-email">Email</Label>
              <Input id="login-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="you@hospital.com" className="mt-1.5" required />
            </div>
            <div>
              <Label htmlFor="login-password">Password</Label>
              <Input id="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••" className="mt-1.5" required />
            </div>
            <Button type="submit" disabled={submitting} className="w-full cta-gradient text-cta-foreground border-0 hover:opacity-90">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Sign In
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            New facility?{" "}
            <Link to="/register" className="text-foreground font-medium hover:underline">Register your hospital</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
