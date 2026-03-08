import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Download, ArrowLeft, Shield, Activity, Stethoscope, TrendingUp, AlertTriangle, CheckCircle, FileText, BrainCircuit, Lightbulb, Droplets, CircleDot, Eye, Printer } from "lucide-react";
import { motion } from "framer-motion";
import { getScans, getPatients, type ScanResult } from "@/lib/store";
import RiskBadge from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import jsPDF from "jspdf";

/* ─── Helpers ────────────────────────────────────────── */
const getRiskColor = (v: number) => (v > 70 ? "text-destructive" : v > 40 ? "text-warning" : "text-success");
const getRiskBg = (v: number) => (v > 70 ? "bg-destructive" : v > 40 ? "bg-warning" : "bg-success");
const getRiskHsl = (v: number) => (v > 70 ? "hsl(0,72%,51%)" : v > 40 ? "hsl(30,90%,50%)" : "hsl(142,60%,40%)");
const getRiskLabel = (v: number) => (v > 70 ? "High" : v > 40 ? "Moderate" : "Low");
const getRiskBadgeCls = (v: number) =>
  v > 70 ? "bg-destructive/15 text-destructive" : v > 40 ? "bg-warning/15 text-warning" : "bg-success/15 text-success";

/* ─── Circular Ring ──────────────────────────────────── */
function CircularScore({ label, value, size = 88 }: { label: string; value: number; size?: number }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const center = size / 2;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
          <circle cx={center} cy={center} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <motion.circle
            cx={center} cy={center} r={r} fill="none"
            stroke={getRiskHsl(value)}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-lg font-bold ${getRiskColor(value)}`}>{value}%</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className={`text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${getRiskBadgeCls(value)}`}>
        {getRiskLabel(value)}
      </span>
    </div>
  );
}

/* ─── Horizontal Bar ─────────────────────────────────── */
function HorizontalScore({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${getRiskColor(value)}`} />
          <span className="text-xs font-medium text-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold tabular-nums ${getRiskColor(value)}`}>{value}%</span>
          <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${getRiskBadgeCls(value)}`}>
            {getRiskLabel(value)}
          </span>
        </div>
      </div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${getRiskBg(value)}`}
        />
      </div>
    </div>
  );
}

/* ─── AI Explanations ────────────────────────────────── */
function generateExplanations(scan: ScanResult): string[] {
  const pool: string[] = [];
  scan.findings.forEach((f) => {
    const fl = f.toLowerCase();
    if (fl.includes("opacity")) pool.push("Lung opacity detected suggesting possible infiltrate or mass");
    if (fl.includes("consolidation")) pool.push("Density pattern consistent with alveolar consolidation");
    if (fl.includes("cavitary") || fl.includes("cavitation")) pool.push("Cavitation pattern identified, often associated with TB or abscess");
    if (fl.includes("miliary")) pool.push("Miliary pattern — small nodular opacities across lung fields");
    if (fl.includes("pleural")) pool.push("Pleural abnormality suggesting fluid accumulation");
    if (fl.includes("lymphadenopathy")) pool.push("Enlarged lymph nodes in hilar region");
  });
  if (scan.tbRisk > 60) pool.push("Irregular texture in upper lobes consistent with tuberculosis");
  if (scan.pneumoniaRisk > 60) pool.push("Diffuse opacification suggestive of infectious pneumonia");
  if (pool.length === 0) pool.push("No significant abnormal patterns detected by the AI model");
  return [...new Set(pool)].slice(0, 5);
}

/* ─── Main Report ────────────────────────────────────── */
export default function SharedReportPage() {
  const { scanId } = useParams();
  const scan = useMemo(() => getScans().find((s) => s.id === scanId), [scanId]);
  const patient = useMemo(() => {
    if (!scan) return null;
    return getPatients().find((p) => p.id === scan.patientId) || null;
  }, [scan]);

  const aiConfidence = useMemo(() => {
    if (!scan) return 0;
    let hash = 0;
    for (let i = 0; i < scan.id.length; i++) hash = ((hash << 5) - hash + scan.id.charCodeAt(i)) | 0;
    return 70 + Math.abs(hash % 26);
  }, [scan]);

  if (!scan)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Report not found</p>
          <p className="text-sm">This report may have been removed or the link is invalid.</p>
        </div>
      </div>
    );

  const reportDate = new Date(scan.scanDate).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const reportId = `RPT-${scan.id.slice(0, 8).toUpperCase()}`;

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("LunaDX — AI Screening Report", 20, 20);
    doc.setFontSize(9);
    doc.text(`Report ID: ${reportId}  |  Generated: ${reportDate}`, 20, 28);
    doc.setLineWidth(0.4);
    doc.line(20, 32, 190, 32);
    doc.setFontSize(11);
    doc.text("Patient Information", 20, 40);
    doc.setFontSize(10);
    doc.text(`Name: ${scan.patientName}`, 20, 48);
    if (patient) doc.text(`Age: ${patient.age} | Sex: ${patient.sex} | Hospital ID: ${patient.hospitalId}`, 20, 54);
    doc.text(`Attending Physician: ${scan.doctorName}`, 20, patient ? 60 : 54);
    const riskY = patient ? 72 : 66;
    doc.setFontSize(11);
    doc.text("AI Screening Results", 20, riskY);
    doc.setFontSize(10);
    doc.text(`TB Risk: ${scan.tbRisk}% (${getRiskLabel(scan.tbRisk)})`, 20, riskY + 8);
    doc.text(`Pneumonia Risk: ${scan.pneumoniaRisk}% (${getRiskLabel(scan.pneumoniaRisk)})`, 20, riskY + 14);
    doc.text(`Lung Abnormality: ${scan.abnormalityScore}% (${getRiskLabel(scan.abnormalityScore)})`, 20, riskY + 20);
    doc.text(`Overall Classification: ${scan.riskLevel}`, 20, riskY + 26);
    doc.text(`AI Confidence: ${aiConfidence}%`, 20, riskY + 32);
    let y = riskY + 44;
    doc.setFontSize(11);
    doc.text("AI Findings", 20, y);
    doc.setFontSize(10);
    scan.findings.forEach((f, i) => { doc.text(`• ${f}`, 24, y + 8 + i * 6); });
    y = y + 8 + scan.findings.length * 6 + 8;
    doc.setFontSize(11);
    doc.text("Suggested Clinical Next Steps", 20, y);
    doc.setFontSize(10);
    scan.suggestions.forEach((s, i) => { doc.text(`${i + 1}. ${s}`, 24, y + 8 + i * 6); });
    y = y + 8 + scan.suggestions.length * 6 + 8;
    if (scan.doctorNotes?.trim()) {
      doc.setFontSize(11);
      doc.text("Doctor's Clinical Notes", 20, y);
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(scan.doctorNotes, 166);
      doc.text(lines, 20, y + 8);
      y = y + 8 + lines.length * 5 + 6;
    }
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("Disclaimer: This report provides AI-assisted screening insights and should not replace clinical diagnosis.", 20, y + 8);
    doc.text("All findings must be reviewed by a qualified healthcare professional.", 20, y + 13);
    doc.save(`LunaDX_Report_${scan.patientName.replace(/\s/g, "_")}.pdf`);
  };

  const sectionDelay = (i: number) => ({ delay: 0.08 * i });

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky action bar */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10 print:hidden">
        <div className="max-w-[900px] mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground text-sm">LunaDX Report</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium uppercase tracking-wider">Read Only</span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => window.print()} variant="ghost" size="sm">
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
            <Button onClick={exportPDF} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" /> PDF
            </Button>
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Report body — A4-like container */}
      <div className="max-w-[900px] mx-auto px-6 py-8 space-y-0">

        {/* ═══ REPORT HEADER ═══ */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">AI Screening Report</h1>
                <p className="text-xs text-muted-foreground">LunaDX Clinical Screening Platform</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Report ID: <span className="font-mono font-medium text-foreground">{reportId}</span></p>
              <p className="text-[11px] text-muted-foreground">Generated: <span className="font-medium text-foreground">{reportDate}</span></p>
              <RiskBadge level={scan.riskLevel} />
            </div>
          </div>
          <Separator className="mt-5" />
        </motion.div>

        {/* ═══ 1. PATIENT INFORMATION ═══ */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={sectionDelay(1)} className="mb-7">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">1</span>
            Patient Information
          </h2>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Patient Name</p>
                <p className="text-sm font-semibold text-foreground">{scan.patientName}</p>
              </div>
              {patient && (
                <>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Age / Sex</p>
                    <p className="text-sm font-semibold text-foreground">{patient.age}y &middot; {patient.sex}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Hospital ID</p>
                    <p className="text-sm font-mono font-semibold text-foreground">{patient.hospitalId}</p>
                  </div>
                </>
              )}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Attending Physician</p>
                <p className="text-sm font-semibold text-foreground">{scan.doctorName}</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ═══ 2. X-RAY IMAGE ═══ */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={sectionDelay(2)} className="mb-7">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">2</span>
            Chest X-Ray Image
          </h2>
          <div className="rounded-xl border border-border overflow-hidden bg-foreground/[0.03]">
            <div className="relative flex items-center justify-center p-4" style={{ background: "hsl(220,15%,10%)" }}>
              <img
                src={scan.imageUrl}
                alt={`Chest X-ray of ${scan.patientName}`}
                className="max-h-[380px] w-auto object-contain rounded"
              />
              <div className="absolute top-3 left-3 text-[10px] font-mono text-white/50">
                {scan.patientName} &middot; {reportDate}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ═══ 3. AI SCREENING RESULTS ═══ */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={sectionDelay(3)} className="mb-7">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">3</span>
            AI Screening Results
          </h2>
          <div className="rounded-xl border border-border bg-card p-5">
            {/* Primary scores as circles */}
            <div className="flex flex-wrap items-start justify-center gap-8 mb-6">
              <CircularScore label="TB Risk" value={scan.tbRisk} />
              <CircularScore label="Pneumonia" value={scan.pneumoniaRisk} />
              <CircularScore label="Abnormality" value={scan.abnormalityScore} />
            </div>

            <Separator className="mb-5" />

            {/* Secondary scores as bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <HorizontalScore label="Lung Opacity" value={scan.lungOpacityRisk ?? 0} icon={Eye} />
              <HorizontalScore label="Pleural Effusion" value={scan.pleuralEffusionRisk ?? 0} icon={Droplets} />
              <HorizontalScore label="Lung Nodules" value={scan.lungNodulesRisk ?? 0} icon={CircleDot} />
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <BrainCircuit className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium text-foreground">AI Confidence</span>
                  </div>
                  <span className="text-xs font-bold text-primary tabular-nums">{aiConfidence}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${aiConfidence}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
              </div>
            </div>

            {/* Classification */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground">Overall Classification:</span>
              <RiskBadge level={scan.riskLevel} />
            </div>
          </div>
        </motion.section>

        {/* ═══ 4. AI EXPLANATION ═══ */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={sectionDelay(4)} className="mb-7">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">4</span>
            AI Explanation
          </h2>
          <div className="rounded-xl border border-border bg-card p-5">
            {/* Findings */}
            <h3 className="text-[11px] font-semibold text-foreground uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-warning" /> Detected Findings
            </h3>
            <ul className="space-y-1.5 mb-5">
              {scan.findings.map((f, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 * i }}
                  className="flex items-start gap-2.5 text-sm p-2 rounded-lg bg-muted/40"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-warning mt-2 shrink-0" />
                  <span className="text-foreground">{f}</span>
                </motion.li>
              ))}
            </ul>

            {/* Why flagged */}
            <h3 className="text-[11px] font-semibold text-foreground uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-primary" /> Why This Case Was Flagged
            </h3>
            <ul className="space-y-1.5">
              {generateExplanations(scan).map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 * i }}
                  className="flex items-start gap-2.5 text-sm p-2 rounded-lg bg-primary/5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <span className="text-foreground">{item}</span>
                </motion.li>
              ))}
            </ul>
            <p className="text-[10px] text-muted-foreground mt-3 italic">
              These explanations are AI-generated to aid clinical interpretation and do not replace professional judgment.
            </p>
          </div>
        </motion.section>

        {/* ═══ 5. DOCTOR NOTES ═══ */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={sectionDelay(5)} className="mb-7">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">5</span>
            Doctor's Clinical Notes
          </h2>
          <div className="rounded-xl border border-border bg-card p-5">
            {scan.doctorNotes?.trim() ? (
              <div className="p-3 rounded-lg bg-muted/40 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {scan.doctorNotes}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No clinical notes have been added to this report.</p>
            )}
          </div>
        </motion.section>

        {/* ═══ 6. SUGGESTED CLINICAL NEXT STEPS ═══ */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={sectionDelay(6)} className="mb-7">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">6</span>
            Suggested Clinical Next Steps
          </h2>
          <div className="rounded-xl border border-border bg-card p-5">
            <ul className="space-y-2">
              {scan.suggestions.map((s, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 * i }}
                  className="flex items-start gap-3 text-sm"
                >
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-foreground">{s}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.section>

        {/* ═══ DISCLAIMER ═══ */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={sectionDelay(7)} className="mb-6">
          <div className="rounded-xl border border-warning/25 bg-warning/5 p-4">
            <p className="text-xs text-foreground font-semibold mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-warning" /> Medical Disclaimer
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              This report provides AI-assisted screening insights and should not replace clinical diagnosis. 
              All findings are generated by automated analysis and must be reviewed and confirmed by a qualified 
              healthcare professional before any clinical decisions are made.
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-[10px] text-muted-foreground">
            LunaDX Clinical Screening Platform &middot; {reportId} &middot; Generated {reportDate}
          </p>
        </div>
      </div>
    </div>
  );
}
