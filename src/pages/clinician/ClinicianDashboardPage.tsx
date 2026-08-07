import { Link } from "react-router-dom";
import { Upload, FileText, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ClinicianDashboardPage() {
  const { fullName, hospital } = useAuth();

  const actions = [
    { to: "/upload", label: "New screening", desc: "Upload a chest X-ray and run AI-assisted analysis.", icon: Upload },
    { to: "/history", label: "My reports", desc: "Review previous screenings and generate reports.", icon: FileText },
    { to: "/patients", label: "Patients", desc: "Access patient records for your facility.", icon: Users },
  ];

  return (
    <div className="max-w-4xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-1">Clinician workspace</p>
        <h1 className="text-2xl font-bold text-foreground">Welcome, {fullName ?? "Clinician"}</h1>
        {hospital && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-muted-foreground">{hospital.name}</span>
            {hospital.hospital_number && <Badge variant="secondary">{hospital.hospital_number}</Badge>}
          </div>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {actions.map((a) => (
          <div key={a.to} className="bg-card border border-border rounded-xl p-5">
            <a.icon className="w-4 h-4 text-muted-foreground mb-3" />
            <h2 className="font-semibold text-foreground text-sm">{a.label}</h2>
            <p className="text-xs text-muted-foreground mt-1 mb-4">{a.desc}</p>
            <Button asChild size="sm" variant="outline"><Link to={a.to}>Open</Link></Button>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        AI-assisted findings are clinical decision support only. Review alongside clinical judgement.
      </p>
    </div>
  );
}