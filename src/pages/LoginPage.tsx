import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, AlertCircle, Building2, MapPin, Mail, User, Lock } from "lucide-react";
import { login, createOrganization } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [hospitalName, setHospitalName] = useState("");
  const [location, setLocation] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const user = login(loginEmail, loginPassword);
    if (user) navigate("/dashboard");
    else setError("Invalid credentials. Check email and password.");
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!hospitalName || !location || !adminName || !adminEmail || !adminPassword) {
      setError("All fields are required.");
      return;
    }
    if (adminPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    try {
      createOrganization({
        name: hospitalName,
        location,
        adminEmail,
        adminName,
        password: adminPassword,
      });
      setSignupSuccess(true);
    } catch {
      setError("Failed to create organization.");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 medical-gradient items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-8">
            <Shield className="w-10 h-10 text-primary-foreground" />
          </div>
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
            <div className="w-10 h-10 rounded-xl medical-gradient flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">LunaDX</span>
          </div>

          {signupSuccess ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                <Building2 className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Organization Created!</h2>
              <p className="text-sm text-muted-foreground">
                Your hospital account has been set up. You can now sign in as the organization admin.
              </p>
              <Button
                className="w-full cta-gradient text-cta-foreground border-0 hover:opacity-90"
                onClick={() => {
                  setSignupSuccess(false);
                  setLoginEmail(adminEmail);
                }}
              >
                Go to Sign In
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Register Hospital</TabsTrigger>
              </TabsList>

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
                  <Button type="submit" className="w-full cta-gradient text-cta-foreground border-0 hover:opacity-90">
                    Sign In
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
                <p className="text-muted-foreground text-sm mb-6">Create an organization account to get started</p>

                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Label htmlFor="hospital-name" className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" /> Hospital Name
                    </Label>
                    <Input id="hospital-name" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} placeholder="Metro Health Clinic" className="mt-1.5" required />
                  </div>
                  <div>
                    <Label htmlFor="location" className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Location
                    </Label>
                    <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Kampala, Uganda" className="mt-1.5" required />
                  </div>
                  <div>
                    <Label htmlFor="admin-name" className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Admin Name
                    </Label>
                    <Input id="admin-name" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Dr. James Wilson" className="mt-1.5" required />
                  </div>
                  <div>
                    <Label htmlFor="admin-email" className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> Admin Email
                    </Label>
                    <Input id="admin-email" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@hospital.com" className="mt-1.5" required />
                  </div>
                  <div>
                    <Label htmlFor="admin-password" className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Password
                    </Label>
                    <Input id="admin-password" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Min 6 characters" className="mt-1.5" required />
                  </div>
                  <Button type="submit" className="w-full cta-gradient text-cta-foreground border-0 hover:opacity-90">
                    Create Organization
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
