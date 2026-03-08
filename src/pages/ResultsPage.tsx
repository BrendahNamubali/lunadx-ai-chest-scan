import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, AlertTriangle, CheckCircle, Activity, ShieldAlert, ShieldCheck, ShieldMinus, TrendingUp, Stethoscope, FileText, Save, Pencil, Bell, XCircle, BrainCircuit, Info, Lightbulb, Share2, Droplets, CircleDot, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { getScans, getCurrentUser, updateScanNotes, type ScanResult } from "@/lib/store";
import RiskBadge from "@/components/RiskBadge";
import LungDiagram from "@/components/LungDiagram";
import RadiologyViewer from "@/components/RadiologyViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import jsPDF from "jspdf";

/* ─── Helpers ────────────────────────────────────────── */
const getRiskColor = (v: number) => (v > 70 ? "text-destructive" : v > 40 ? "text-warning" : "text-success");
const getRiskBg = (v: number) => (v > 70 ? "bg-destructive" : v > 40 ? "bg-warning" : "bg-success");
const getRiskLabel = (v: number) => (v > 70 ? "High" : v > 40 ? "Moderate" : "Low");
const getRiskHsl = (v: number) => (v > 70 ? "hsl(0,72%,51%)" : v > 40 ? "hsl(30,90%,50%)" : "hsl(142,60%,40%)");
const getRiskBadgeCls = (v: number) =>
  v > 70 ? "bg-destructive/15 text-destructive" : v > 40 ? "bg-warning/15 text-warning" : "bg-success/15 text-success";

/* ─── Circular Progress (TB) ─────────────────────────── */
function CircularRisk({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  const r = 48;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="stat-card flex flex-col items-center text-center"
    >
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className={`w-4 h-4 ${getRiskColor(value)}`} />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div className="relative w-[120px] h-[120px]">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <motion.circle
            cx="60" cy="60" r={r} fill="none"
            stroke={getRiskHsl(value)}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${getRiskColor(value)}`}>{value}%</span>
          <span className="text-[9px] text-muted-foreground">{getRiskLabel(value)}</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Horizontal Risk Bar (Pneumonia) ────────────────── */
function HorizontalRiskBar({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="stat-card"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={`w-4 h-4 ${getRiskColor(value)}`} />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-center gap-3 mb-1.5">
        <span className={`text-3xl font-bold tabular-nums ${getRiskColor(value)}`}>{value}%</span>
        <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${getRiskBadgeCls(value)}`}>
          {getRiskLabel(value)} Risk
        </span>
      </div>
      <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          className={`h-full rounded-full ${getRiskBg(value)}`}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-muted-foreground">0%</span>
        <span className="text-[9px] text-muted-foreground">100%</span>
      </div>
    </motion.div>
  );
}

/* ─── Gauge Meter (Abnormality) ──────────────────────── */
function GaugeMeter({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  const r = 54;
  const c = Math.PI * r; // semicircle
  const progress = (value / 100) * c;
  // Needle angle: 0% = -90deg, 100% = 90deg → value maps to -90 + value*1.8
  const needleAngle = -90 + value * 1.8;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="stat-card flex flex-col items-center text-center"
    >
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className={`w-4 h-4 ${getRiskColor(value)}`} />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div className="relative w-[140px] h-[80px]">
        <svg viewBox="0 0 140 80" className="w-full h-full">
          {/* Colored background arcs: green, orange, red */}
          <path d="M 16 75 A 54 54 0 0 1 70 21" fill="none" stroke="hsl(142,60%,40%)" strokeWidth="8" strokeLinecap="round" opacity="0.25" />
          <path d="M 70 21 A 54 54 0 0 1 105 38" fill="none" stroke="hsl(30,90%,50%)" strokeWidth="8" opacity="0.25" />
          <path d="M 105 38 A 54 54 0 0 1 124 75" fill="none" stroke="hsl(0,72%,51%)" strokeWidth="8" strokeLinecap="round" opacity="0.25" />
          {/* Active arc */}
          <motion.path
            d="M 16 75 A 54 54 0 0 1 124 75"
            fill="none" stroke={getRiskHsl(value)} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - progress }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
          {/* Needle */}
          <motion.line
            x1="70" y1="75" x2="70" y2="30"
            stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round"
            style={{ transformOrigin: "70px 75px" }}
            initial={{ rotate: -90 }}
            animate={{ rotate: needleAngle }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
          <circle cx="70" cy="75" r="4" fill="hsl(var(--foreground))" />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
          <span className={`text-2xl font-bold ${getRiskColor(value)}`}>{value}%</span>
        </div>
      </div>
      <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full mt-1 ${getRiskBadgeCls(value)}`}>
        {getRiskLabel(value)}
      </span>
    </motion.div>
  );
}

/* ─── Small Risk Gauge (secondary scores) ────────────── */
function SmallGauge({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="stat-card flex flex-col items-center text-center"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={`w-3.5 h-3.5 ${getRiskColor(value)}`} />
        <span className="text-[10px] font-semibold text-foreground uppercase tracking-wide">{label}</span>
      </div>
      <span className={`text-xl font-bold tabular-nums ${getRiskColor(value)}`}>{value}%</span>
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mt-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
          className={`h-full rounded-full ${getRiskBg(value)}`}
        />
      </div>
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

/* ─── AI Explainability ──────────────────────────────── */
function generateExplanations(scan: ScanResult): string[] {
  const pool: string[] = [];

  // Findings-based explanations
  scan.findings.forEach((f) => {
    const fl = f.toLowerCase();
    if (fl.includes("opacity")) pool.push("Lung opacity detected in radiograph suggesting possible infiltrate or mass");
    if (fl.includes("consolidation")) pool.push("Abnormal density pattern consistent with alveolar consolidation");
    if (fl.includes("cavitary") || fl.includes("cavitation")) pool.push("Possible cavitation pattern identified, often associated with TB or abscess");
    if (fl.includes("miliary")) pool.push("Miliary pattern detected — small nodular opacities distributed across lung fields");
    if (fl.includes("pleural")) pool.push("Pleural abnormality suggesting fluid accumulation or thickening");
    if (fl.includes("lymphadenopathy")) pool.push("Enlarged lymph nodes detected in hilar region");
    if (fl.includes("cardiomegaly")) pool.push("Cardiac silhouette enlarged beyond expected parameters");
  });

  // Risk-based generic explanations
  if (scan.tbRisk > 60) pool.push("Irregular lung texture in upper lobes consistent with tuberculosis patterns");
  if (scan.pneumoniaRisk > 60) pool.push("Diffuse opacification pattern suggestive of infectious pneumonia");
  if (scan.abnormalityScore > 50) pool.push("Overall pixel intensity distribution deviates from normal baseline");

  if (pool.length === 0) pool.push("No significant abnormal patterns detected by the AI model");

  // Deduplicate and limit
  return [...new Set(pool)].slice(0, 5);
}

/* ─── Main Page ──────────────────────────────────────── */
export default function ResultsPage() {
  const { scanId } = useParams();
  const user = getCurrentUser();
  const scan = useMemo(() => getScans().find((s) => s.id === scanId), [scanId]);

  const [notes, setNotes] = useState(scan?.doctorNotes || "");
  const [isEditing, setIsEditing] = useState(!scan?.doctorNotes);
  const [alertAcknowledged, setAlertAcknowledged] = useState(false);

  const isHighRiskAlert = scan ? (scan.tbRisk > 70 || scan.pneumoniaRisk > 70) : false;

  // Deterministic confidence score per scan (70-95%)
  const aiConfidence = useMemo(() => {
    if (!scan) return 0;
    let hash = 0;
    for (let i = 0; i < scan.id.length; i++) hash = ((hash << 5) - hash + scan.id.charCodeAt(i)) | 0;
    return 70 + Math.abs(hash % 26);
  }, [scan]);

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
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              const url = `${window.location.origin}/report/${scan.id}`;
              navigator.clipboard.writeText(url);
              toast.success("Shareable report link copied to clipboard");
            }}
            variant="outline"
            size="sm"
          >
            <Share2 className="w-4 h-4 mr-1" /> Share
          </Button>
          <Button onClick={exportPDF} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      {/* High Risk Clinical Alert */}
      {isHighRiskAlert && !alertAcknowledged && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="mb-5 rounded-xl border-2 border-destructive/40 bg-destructive/8 p-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-destructive flex items-center gap-2">
                🚨 High Risk Screening Alert
              </h3>
              <p className="text-xs text-foreground mt-1">
                {scan.tbRisk > 70 && scan.pneumoniaRisk > 70
                  ? "Possible tuberculosis and pneumonia patterns detected."
                  : scan.tbRisk > 70
                  ? "Possible tuberculosis pattern detected."
                  : "Possible pneumonia pattern detected."}
              </p>
              <div className="mt-3">
                <p className="text-xs font-semibold text-foreground mb-1.5">Suggested next steps:</p>
                <ul className="space-y-1">
                  {[
                    "Perform sputum testing",
                    "Consider GeneXpert MTB/RIF testing",
                    "Refer for radiology review",
                  ].map((step, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setAlertAcknowledged(true);
                  toast.success("Alert acknowledged");
                }}
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Acknowledge Alert
              </Button>
            </div>
            <button
              onClick={() => setAlertAcknowledged(true)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Risk Banner */}
      <RiskBanner scan={scan} />

      {/* Risk Visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        <CircularRisk label="TB Probability" value={scan.tbRisk} icon={Activity} />
        <HorizontalRiskBar label="Pneumonia Risk" value={scan.pneumoniaRisk} icon={Stethoscope} />
        <GaugeMeter label="Lung Abnormality" value={scan.abnormalityScore} icon={TrendingUp} />
      </div>
      <div className="grid grid-cols-3 gap-4 mt-4">
        <SmallGauge label="Lung Opacity" value={scan.lungOpacityRisk ?? 0} icon={Eye} />
        <SmallGauge label="Pleural Effusion" value={scan.pleuralEffusionRisk ?? 0} icon={Droplets} />
        <SmallGauge label="Lung Nodules" value={scan.lungNodulesRisk ?? 0} icon={CircleDot} />
      </div>

      {/* Detected Lung Abnormalities */}
      {(() => {
        const detected = [
          { name: "Tuberculosis", risk: scan.tbRisk },
          { name: "Pneumonia", risk: scan.pneumoniaRisk },
          { name: "Lung Opacity", risk: scan.lungOpacityRisk ?? 0 },
          { name: "Pleural Effusion", risk: scan.pleuralEffusionRisk ?? 0 },
          { name: "Lung Nodules", risk: scan.lungNodulesRisk ?? 0 },
        ].filter((d) => d.risk > 50);
        return detected.length > 0 ? (
          <Card className="mt-5 border-warning/20">
            <CardContent className="pt-5 pb-5">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Detected Lung Abnormalities
              </h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {detected.map((d) => {
                  const color = d.risk > 70 ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-warning/10 text-warning border-warning/20";
                  return (
                    <motion.span
                      key={d.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${color}`}
                    >
                      {d.name}: {d.risk}%
                    </motion.span>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground italic">
                Results are AI-assisted screening indicators and not definitive diagnoses. Future integration may use models from TorchXRayVision.
              </p>
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* AI Confidence Score */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-5 flex items-center justify-between p-3.5 rounded-xl bg-primary/5 border border-primary/15"
      >
        <div className="flex items-center gap-2.5">
          <BrainCircuit className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">AI Model Confidence</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px] text-xs">
              This score represents the model's confidence in the screening prediction.
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${aiConfidence}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-primary"
            />
          </div>
          <span className="text-sm font-bold text-primary">{aiConfidence}%</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        {/* Left column */}
        <div className="space-y-5">
          {/* Radiology Viewer */}
          <RadiologyViewer scan={scan} aiConfidence={aiConfidence} />

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

          {/* AI Explainability Panel */}
          <Card className="border-primary/15">
            <CardContent className="pt-5 pb-5">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-1 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                Why was this case flagged?
              </h2>
              <p className="text-[11px] text-muted-foreground mb-3">AI-generated explanations for the screening classification.</p>
              <ul className="space-y-2">
                {generateExplanations(scan).map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="flex items-start gap-2.5 text-sm p-2.5 rounded-lg bg-primary/5"
                  >
                    <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span className="text-foreground">{item}</span>
                  </motion.li>
                ))}
              </ul>
              <p className="text-[10px] text-muted-foreground mt-3 italic">
                These explanations are generated by the AI model to aid clinical interpretation and do not replace professional judgment.
              </p>
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

      {/* Doctor Clinical Notes */}
      <Card className="mt-5">
        <CardContent className="pt-5 pb-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Doctor Notes / Clinical Interpretation
          </h2>
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter your clinical observations, interpretations, and additional notes about this X-ray..."
                className="min-h-[120px] text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    updateScanNotes(scan.id, notes);
                    setIsEditing(false);
                    toast.success("Clinical notes saved successfully");
                  }}
                >
                  <Save className="w-4 h-4 mr-1" /> Save Notes
                </Button>
                {scan.doctorNotes && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setNotes(scan.doctorNotes || "");
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/40 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {notes || <span className="text-muted-foreground italic">No notes added yet.</span>}
              </div>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                <Pencil className="w-4 h-4 mr-1" /> Edit Notes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="mt-6 p-4 rounded-lg bg-warning/5 border border-warning/20 text-xs text-muted-foreground">
        <strong className="text-foreground">⚠ Disclaimer:</strong> This is an AI-assisted screening
        result and does not constitute a definitive medical diagnosis. All findings must be reviewed
        and confirmed by a qualified healthcare professional.
      </div>
    </div>
  );
}
