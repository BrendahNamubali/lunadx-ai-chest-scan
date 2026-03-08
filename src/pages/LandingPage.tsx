import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Upload, Brain, FileText, Users, Activity, ChevronRight, AlertTriangle } from "lucide-react";

const features = [
  {
    icon: Upload,
    title: "X-Ray Upload",
    desc: "Upload chest X-ray images in JPG, PNG, or DICOM format and link them to patient records instantly.",
  },
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    desc: "Get real-time risk assessments for tuberculosis, pneumonia, and other lung abnormalities.",
  },
  {
    icon: Activity,
    title: "Heatmap Visualization",
    desc: "Visual heatmap overlays highlight suspicious lung regions for faster clinical interpretation.",
  },
  {
    icon: FileText,
    title: "Clinical Reports",
    desc: "Auto-generated structured reports with findings, risk classification, and suggested next steps.",
  },
  {
    icon: Users,
    title: "Patient Management",
    desc: "Create and manage patient profiles, track visit history, and organize screening workflows.",
  },
  {
    icon: Shield,
    title: "Secure & Compliant",
    desc: "Role-based access control with secure image storage designed for clinical environments.",
  },
];

const stats = [
  { value: "< 30s", label: "Analysis Time" },
  { value: "95%+", label: "Sensitivity Target" },
  { value: "24/7", label: "Availability" },
  { value: "PDF", label: "Report Export" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">LunaDX</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/login">
              <Button size="sm" className="cta-gradient text-cta-foreground border-0 hover:opacity-90">Get Started <ChevronRight className="w-4 h-4" /></Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium mb-6">
            <Activity className="w-3.5 h-3.5" />
            AI-Assisted Clinical Screening
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            Faster lung disease screening where it matters most
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            LunaDX helps clinicians in resource-limited settings upload chest X-rays and receive AI-supported risk assessments for tuberculosis and pneumonia — in under 30 seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/login">
              <Button size="lg" className="px-8 cta-gradient text-cta-foreground border-0 hover:opacity-90">
                Start Screening <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg">Learn More</Button>
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="text-center">
              <CardContent className="pt-6">
                <p className="text-3xl font-bold text-primary">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Built for Clinical Workflows</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every feature is designed to help clinicians screen patients quickly, accurately, and securely.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="group hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Register Patient", desc: "Create a patient profile with basic clinical information." },
              { step: "2", title: "Upload X-Ray", desc: "Upload a chest X-ray image linked to the patient record." },
              { step: "3", title: "Review & Act", desc: "View AI risk assessment, heatmap, and export a clinical report." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="pt-8 pb-8 text-center">
              <h2 className="text-2xl font-bold mb-3">Ready to improve screening outcomes?</h2>
              <p className="opacity-90 mb-6 max-w-lg mx-auto text-sm">
                Start using LunaDX today to screen patients faster and prioritize high-risk cases for further testing.
              </p>
              <Link to="/login">
                <Button variant="secondary" size="lg">Get Started Free</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="pb-12 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 p-4 rounded-lg bg-muted text-muted-foreground text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              <strong>Disclaimer:</strong> LunaDX is an AI-assisted screening tool and does not provide definitive medical diagnoses.
              All results must be reviewed and confirmed by a qualified healthcare professional.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} LunaDX. AI-Assisted Clinical Screening Platform.
      </footer>
    </div>
  );
}
