import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, AlertCircle } from "lucide-react";
import { login } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = login(email, password);
    if (user) navigate("/dashboard");
    else setError("Invalid credentials. Try doctor@lunadx.com / doctor123");
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
            Rapid chest X-ray analysis for tuberculosis and pneumonia screening.
            Designed for clinics where radiologist access is limited.
          </p>
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl medical-gradient flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">LunaDX</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Welcome back</h2>
          <p className="text-muted-foreground text-sm mb-8">Sign in to access your screening dashboard</p>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 text-destructive text-sm mb-6">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="doctor@lunadx.com" className="mt-1.5" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1.5" required />
            </div>
            <Button type="submit" className="w-full medical-gradient text-primary-foreground border-0 hover:opacity-90">
              Sign In
            </Button>
          </form>

          <div className="mt-6 p-4 rounded-lg bg-muted text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Demo Accounts:</p>
            <p>Doctor: doctor@lunadx.com / doctor123</p>
            <p>Admin: admin@lunadx.com / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
