import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LunaLogo from "@/components/LunaLogo";
import { TRIAL_DAYS, usePlans } from "@/lib/pricing";

export default function HospitalRegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { plans } = usePlans();
  const [plan, setPlan] = useState(searchParams.get("plan") ?? "basic");
  const [form, setForm] = useState({
    hospitalName: "", facilityType: "", location: "", address: "",
    contactPerson: "", email: "", phone: "", expectedClinicians: "",
    licenseInfo: "", password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSubmitting(true);
    const { data, error: fnError } = await supabase.functions.invoke("register-hospital", { body: { ...form, plan } });
    setSubmitting(false);
    const message = (data as { error?: string } | null)?.error;
    if (fnError || message) { setError(message ?? "Registration failed. Please try again."); return; }
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Registration submitted</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your hospital registration has been submitted. LunaDX will review your application and notify you once approved.
            You can sign in any time to check your status. Your {TRIAL_DAYS}-day free trial starts on approval.
          </p>
          <Button
            className="w-full"
            onClick={() => navigate(`/login?registered=1&email=${encodeURIComponent(form.email.trim().toLowerCase())}`)}
          >
            Sign in to track your application
          </Button>
        </div>
      </div>
    );
  }

  const fields: [keyof typeof form, string, string, boolean, string][] = [
    ["hospitalName", "Hospital name", "text", true, "ABC Medical Centre"],
    ["facilityType", "Facility type", "text", false, "General hospital / Clinic / Diagnostic centre"],
    ["location", "Location", "text", false, "Kampala, Uganda"],
    ["address", "Address", "text", false, "Plot 12, Nakasero Road"],
    ["contactPerson", "Contact person", "text", true, "Dr. James Kato"],
    ["email", "Contact email", "email", true, "admin@hospital.com"],
    ["phone", "Phone number", "tel", false, "+256 700 000000"],
    ["expectedClinicians", "Clinicians expected", "number", false, "3"],
    ["licenseInfo", "License / registration number", "text", false, "Optional"],
    ["password", "Admin password", "password", true, "Min 8 characters"],
  ];

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5 mb-8">
          <LunaLogo className="w-10 h-10" asLink />
          <span className="text-xl font-bold text-foreground">LunaDX</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Register your hospital</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Applications are reviewed by the LunaDX team before your facility account is activated.
            Approved hospitals get a {TRIAL_DAYS}-day free trial.
          </p>

          <div className="mb-6">
            <Label htmlFor="plan">Plan</Label>
            <select
              id="plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {plans.map((p) => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">You can change plans at any time from your subscription page.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 text-destructive text-sm mb-4">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            {fields.map(([key, label, type, required, placeholder]) => (
              <div key={key} className={key === "address" || key === "licenseInfo" ? "sm:col-span-2" : ""}>
                <Label htmlFor={key}>{label}{required ? " *" : ""}</Label>
                <Input id={key} type={type} value={form[key]} onChange={set(key)}
                  placeholder={placeholder} className="mt-1.5" required={required} />
              </div>
            ))}
            <div className="sm:col-span-2 flex items-center gap-4 pt-2">
              <Button type="submit" disabled={submitting} className="cta-gradient text-cta-foreground border-0 hover:opacity-90">
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Submit registration
              </Button>
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Already registered? Sign in</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}