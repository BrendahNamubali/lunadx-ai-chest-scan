import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, AlertTriangle, CheckCircle, Activity, ShieldAlert, ShieldCheck, ShieldMinus, TrendingUp, Stethoscope, FileText, Save, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { getScans, getCurrentUser, updateScanNotes, type ScanResult } from "@/lib/store";
import RiskBadge from "@/components/RiskBadge";
import LungDiagram from "@/components/LungDiagram";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import jsPDF from "jspdf";

/* ─── Risk Gauge ─────────────────────────────────────── */
function RiskGauge({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  const riskColor =
    value > 70 ? "hsl(0, 72%, 51%)" : value > 40 ? "hsl(38, 92%, 50%)" : "hsl(152, 55%, 42%)";
  const riskBg =
    value > 70 ? "bg-destructive/8" : value > 40 ? "bg-warning/8" : "bg-success/8";
  const riskText =
    value > 70 ? "text-destructive" : value > 40 ? "text-warning" : "text-success";
  const riskLabel = value > 70 ? "High" : value > 40 ? "Moderate" : "Low";

  // SVG arc for the semicircle gauge
  const radius = 54;
  const circumference = Math.PI * radius;
  const progress = (value / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`stat-card flex flex-col items-center text-center ${riskBg}`}
    >
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className={`w-4 h-4 ${riskText}`} />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{label}</span>
      </div>

      <div className="relative w-[130px] h-[75px] mb-2">
        <svg viewBox="0 0 130 75" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 11 70 A 54 54 0 0 1 119 70"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Value arc */}
          <motion.path
            d="M 11 70 A 54 54 0 0 1 119 70"
            fill="none"
            stroke={riskColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={circumference - progress}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-0">
          <span className={`text-2xl font-bold ${riskText}`}>{value}%</span>
        </div>
      </div>

      <span
        className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${
          value > 70
            ? "bg-destructive/15 text-destructive"
            : value > 40
            ? "bg-warning/15 text-warning"
            : "bg-success/15 text-success"
        }`}
      >
        {riskLabel} Risk
      </span>
    </motion.div>
  );
}

/* ─── Overall Risk Banner ────────────────────────────── */
function RiskBanner({ scan }: { scan: ScanResult }) {
  const config = {
    High: {
      icon: ShieldAlert,
      bg: "bg-destructive/8 border-destructive/25",
      iconColor: "text-destructive",
      title: "High Risk — Immediate Attention Required",
      desc: "AI screening indicates significant abnormalities. Urgent radiologist review and confirmatory testing recommended.",
    },
    Medium: {
      icon: ShieldMinus,
      bg: "bg-warning/8 border-warning/25",
      iconColor: "text-warning",
      title: "Moderate Risk — Further Evaluation Needed",
      desc: "Potential abnormalities detected. Follow-up diagnostic testing and clinical correlation advised.",
    },
    Low: {
      icon: ShieldCheck,
      bg: "bg-success/8 border-success/25",
      iconColor: "text-success",
      title: "Low Risk — No Significant Findings",
      desc: "Screening results within normal parameters. Routine follow-up as clinically indicated.",
    },
  };

  const c = config[scan.riskLevel];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-xl border p-4 flex items-start gap-4 ${c.bg}`}
    >
      <div className={`mt-0.5 ${c.iconColor}`}>
        <c.icon className="w-7 h-7" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-foreground text-sm">{c.title}</h3>
          <RiskBadge level={scan.riskLevel} />
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.desc}</p>
      </div>
    </motion.div>
  );
}

/* ─── Main Page ──────────────────────────────────────── */
export default function ResultsPage() {
  const { scanId } = useParams();
  const user = getCurrentUser();
  const scan = useMemo(() => getScans().find((s) => s.id === scanId), [scanId]);

  const [notes, setNotes] = useState(scan?.doctorNotes || "");
  const [isEditing, setIsEditing] = useState(!scan?.doctorNotes);

  if (!scan)
    return (
      <div className="text-center py-20 text-muted-foreground">
        Scan not found.{" "}
        <Link to="/history" className="text-primary hover:underline">
          Go to history
        </Link>
      </div>
    );

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("LunaDX Clinical Report", 20, 20);
    doc.setFontSize(10);
    doc.text(`Clinic: ${user?.clinicName || "—"}`, 20, 30);
    doc.text(`Doctor: ${scan.doctorName}`, 20, 36);
    doc.text(`Date: ${new Date(scan.scanDate).toLocaleDateString()}`, 20, 42);
    doc.setLineWidth(0.3);
    doc.line(20, 46, 190, 46);
    doc.setFontSize(12);
    doc.text("Patient Information", 20, 54);
    doc.setFontSize(10);
    doc.text(`Name: ${scan.patientName}`, 20, 62);
    doc.setFontSize(12);
    doc.text("AI Analysis Results", 20, 74);
    doc.setFontSize(10);
    doc.text(`TB Risk: ${scan.tbRisk}%`, 20, 82);
    doc.text(`Pneumonia Risk: ${scan.pneumoniaRisk}%`, 20, 88);
    doc.text(`Abnormality Score: ${scan.abnormalityScore}%`, 20, 94);
    doc.text(`Risk Classification: ${scan.riskLevel}`, 20, 100);
    doc.setFontSize(12);
    doc.text("Findings", 20, 112);
    doc.setFontSize(10);
    scan.findings.forEach((f, i) => doc.text(`• ${f}`, 24, 120 + i * 6));
    const sugStart = 120 + scan.findings.length * 6 + 10;
    doc.setFontSize(12);
    doc.text("Recommended Next Steps", 20, sugStart);
    doc.setFontSize(10);
    scan.suggestions.forEach((s, i) => doc.text(`${i + 1}. ${s}`, 24, sugStart + 8 + i * 6));
    let notesY = sugStart + 8 + scan.suggestions.length * 6 + 10;
    if (notes.trim()) {
      doc.setFontSize(12);
      doc.text("Doctor's Clinical Notes", 20, notesY);
      doc.setFontSize(10);
      const noteLines = doc.splitTextToSize(notes, 166);
      doc.text(noteLines, 20, notesY + 8);
      notesY = notesY + 8 + noteLines.length * 5 + 6;
    }
    const disclaimerY = notesY + 8;
    doc.setFontSize(8);
    doc.text(
      "Disclaimer: LunaDX is an AI-assisted screening tool. Results must be reviewed by a qualified healthcare professional.",
      20,
      disclaimerY
    );
    doc.save(`LunaDX_Report_${scan.patientName.replace(/\s/g, "_")}.pdf`);
  };

  return (
    <div className="animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link to="/history">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">AI Screening Results</h1>
            <p className="text-xs text-muted-foreground">
              {scan.patientName} &middot; {new Date(scan.scanDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Button onClick={exportPDF} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" /> Export PDF
        </Button>
      </div>

      {/* Risk Banner */}
      <RiskBanner scan={scan} />

      {/* Risk Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
        <RiskGauge label="TB Probability" value={scan.tbRisk} icon={Activity} />
        <RiskGauge label="Pneumonia" value={scan.pneumoniaRisk} icon={Stethoscope} />
        <RiskGauge label="Abnormality Score" value={scan.abnormalityScore} icon={TrendingUp} />
      </div>

      {/* Main content: Lung Diagram + X-ray | Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        {/* Left column */}
        <div className="space-y-5">
          {/* X-ray with heatmap */}
          <div className="relative stat-card p-0 overflow-hidden">
            <img
              src={scan.imageUrl}
              alt="Chest X-ray"
              className="w-full max-h-[380px] object-contain bg-foreground/5"
            />
            {scan.riskLevel !== "Low" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-32 h-32 rounded-full bg-destructive/20 blur-xl animate-pulse" />
                <div
                  className="absolute w-20 h-24 rounded-full bg-warning/15 blur-lg"
                  style={{ top: "30%", left: "35%" }}
                />
              </div>
            )}
            <div className="absolute bottom-3 left-3 bg-foreground/70 backdrop-blur-sm text-background text-[10px] px-2 py-1 rounded">
              AI Heatmap Overlay{" "}
              {scan.riskLevel === "Low"
                ? "(No significant areas)"
                : "(Suspicious regions highlighted)"}
            </div>
          </div>

          {/* Lung Diagram */}
          <LungDiagram scan={scan} />
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Findings */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                AI Findings
              </h2>
              <ul className="space-y-2.5">
                {scan.findings.map((f, i) => {
                  const isHighSeverity =
                    f.toLowerCase().includes("cavitary") || f.toLowerCase().includes("miliary");
                  return (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * i }}
                      className={`flex items-start gap-2.5 text-sm p-2.5 rounded-lg ${
                        isHighSeverity
                          ? "bg-destructive/6 border border-destructive/15"
                          : "bg-muted/40"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          isHighSeverity ? "bg-destructive" : "bg-warning"
                        }`}
                      />
                      <span className="text-foreground">{f}</span>
                    </motion.li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {/* Suggestions */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Recommended Next Steps
              </h2>
              <ul className="space-y-2">
                {scan.suggestions.map((s, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 * i }}
                    className="flex items-start gap-2.5 text-sm"
                  >
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-foreground">{s}</span>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Risk Legend */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
                Risk Level Guide
              </h2>
              <div className="space-y-2">
                {[
                  { color: "bg-success", label: "Low Risk (0–40%)", desc: "No significant abnormalities. Routine follow-up." },
                  { color: "bg-warning", label: "Moderate Risk (41–70%)", desc: "Potential findings. Further testing recommended." },
                  { color: "bg-destructive", label: "High Risk (71–100%)", desc: "Significant abnormalities. Urgent review needed." },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-2.5">
                    <span className={`w-3 h-3 rounded-sm ${item.color} shrink-0 mt-0.5`} />
                    <div>
                      <p className="text-xs font-medium text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 p-4 rounded-lg bg-warning/5 border border-warning/20 text-xs text-muted-foreground">
        <strong className="text-foreground">⚠ Disclaimer:</strong> This is an AI-assisted screening
        result and does not constitute a definitive medical diagnosis. All findings must be reviewed
        and confirmed by a qualified healthcare professional.
      </div>
    </div>
  );
}
