import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, Building2, CheckCircle2, Loader2 } from "lucide-react";
import { login } from "@/lib/store";
import { useAuth, accessBlock, dashboardPathFor } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LunaLogo from "@/components/LunaLogo";

export default function LoginPage() {
  const navigate = useNavigate();
  const { session, role, hospital, isActive, loading, signIn } = useAuth();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [searchParams] = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const [loginEmail, setLoginEmail] = useState(searchParams.get("email") ?? "");
  const [loginPassword, setLoginPassword] = useState("");

  useEffect(() => {
    if (loading || !session) return;
    const blocked = accessBlock(role, hospital, isActive);
    navigate(role && !blocked ? dashboardPathFor(role) : "/pending-approval", { replace: true });
  }, [loading, session, role, hospital, isActive, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await signIn(loginEmail, loginPassword);
    setSubmitting(false);
    if (!result.error) return;

    const demoUser = login(loginEmail, loginPassword);
    if (demoUser) navigate("/dashboard");
    else setError("Invalid credentials. Check email and password.");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 medical-gradient items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="flex h-32 w-32 items-center justify-center rounded-[28%] border-2 border-primary-foreground/60 bg-background p-3 mx-auto mb-8 shadow-lg">
            <LunaLogo className="h-full w-full" />
          </div>
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
          <div className="lg:hidden mb-8 flex items-center gap-2.5">
            <Link to="/" aria-label="LunaDX home" className="flex h-12 w-12 items-center justify-center rounded-[28%] border border-primary/20 bg-background p-1 shadow-sm">
              <LunaLogo className="h-full w-full" />
            </Link>
            <span className="text-xl font-bold text-foreground">LunaDX</span>
          </div>

          <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Register Hospital</TabsTrigger>
              </TabsList>

              {justRegistered && !error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 text-foreground text-sm mb-4">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                  Registration submitted. Sign in with the admin password you chose to track your approval.
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 text-destructive text-sm mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Login Tab */}
              <TabsContent value="login">
                <h2 className="text-xl font-bold text-foreground mb-1">Welcome back</h2>
                <p className="text-muted-foreground text-sm mb-6">Sign in to your organization account</p>

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

                <div className="mt-6 p-4 rounded-lg bg-muted text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Demo Accounts:</p>
                  <p>Admin: admin@lunadx.com / admin123</p>
                  <p>Radiologist: doctor@lunadx.com / doctor123</p>
                  <p>Clinician: clinician@lunadx.com / clinician123</p>
                </div>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent value="signup">
                <h2 className="text-xl font-bold text-foreground mb-1">Register Your Hospital</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Submit your facility for review. Once approved you get a 14-day free trial, then pay monthly with MTN MoMo or Airtel Money.
                </p>
                <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                  {["One hospital admin account", "Clinician accounts based on your plan", "Chest X-ray screening for TB & pneumonia"].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {item}
                    </li>
                  ))}
                </ul>
                <Link to="/register-hospital">
                  <Button className="w-full cta-gradient text-cta-foreground border-0 hover:opacity-90">
                    <Building2 className="w-4 h-4 mr-2" /> Start hospital registration
                  </Button>
                </Link>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Compare plans on the <Link to="/#pricing" className="underline hover:text-foreground">pricing page</Link>.
                </p>
              </TabsContent>
            </Tabs>
        </div>
      </div>
    </div>
  );
}
