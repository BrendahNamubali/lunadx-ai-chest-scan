import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, AlertTriangle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { getScans, getCurrentUser, type ScanResult } from "@/lib/store";
import RiskBadge from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";

function RiskMeter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-semibold text-foreground">{value}%</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1, ease: "easeOut" }} className={`h-full rounded-full ${color}`} />
      </div>
    </div>
  );
}

function HeatmapOverlay({ scan }: { scan: ScanResult }) {
  // Simulated heatmap overlay
  return (
    <div className="relative stat-card p-0 overflow-hidden">
      <img src={scan.imageUrl} alt="Chest X-ray" className="w-full max-h-[420px] object-contain bg-foreground/5" />
      {scan.riskLevel !== "Low" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-32 h-32 rounded-full bg-destructive/20 blur-xl animate-pulse-soft" />
          <div className="absolute w-20 h-24 rounded-full bg-warning/15 blur-lg" style={{ top: "30%", left: "35%" }} />
        </div>
      )}
      <div className="absolute bottom-3 left-3 bg-foreground/70 backdrop-blur-sm text-background text-[10px] px-2 py-1 rounded">
        AI Heatmap Overlay {scan.riskLevel === "Low" ? "(No significant areas)" : "(Suspicious regions highlighted)"}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const { scanId } = useParams();
  const user = getCurrentUser();
  const scan = useMemo(() => getScans().find((s) => s.id === scanId), [scanId]);

  if (!scan) return <div className="text-center py-20 text-muted-foreground">Scan not found. <Link to="/history" className="text-primary hover:underline">Go to history</Link></div>;

  const exportPDF = () => {
    const doc = new jsPDF();
    const y = (start: number) => start;
    doc.setFontSize(18);
    doc.text("LunaDX Clinical Report", 20, y(20));
    doc.setFontSize(10);
    doc.text(`Clinic: ${user?.clinicName || "—"}`, 20, y(30));
    doc.text(`Doctor: ${scan.doctorName}`, 20, y(36));
    doc.text(`Date: ${new Date(scan.scanDate).toLocaleDateString()}`, 20, y(42));
    doc.setLineWidth(0.3);
    doc.line(20, 46, 190, 46);
    doc.setFontSize(12);
    doc.text("Patient Information", 20, y(54));
    doc.setFontSize(10);
    doc.text(`Name: ${scan.patientName}`, 20, y(62));
    doc.setFontSize(12);
    doc.text("AI Analysis Results", 20, y(74));
    doc.setFontSize(10);
    doc.text(`TB Risk: ${scan.tbRisk}%`, 20, y(82));
    doc.text(`Pneumonia Risk: ${scan.pneumoniaRisk}%`, 20, y(88));
    doc.text(`Abnormality Score: ${scan.abnormalityScore}%`, 20, y(94));
    doc.text(`Risk Classification: ${scan.riskLevel}`, 20, y(100));
    doc.setFontSize(12);
    doc.text("Findings", 20, y(112));
    doc.setFontSize(10);
    scan.findings.forEach((f, i) => doc.text(`• ${f}`, 24, y(120 + i * 6)));
    const sugStart = 120 + scan.findings.length * 6 + 10;
    doc.setFontSize(12);
    doc.text("Recommended Next Steps", 20, y(sugStart));
    doc.setFontSize(10);
    scan.suggestions.forEach((s, i) => doc.text(`${i + 1}. ${s}`, 24, y(sugStart + 8 + i * 6)));
    const disclaimerY = sugStart + 8 + scan.suggestions.length * 6 + 14;
    doc.setFontSize(8);
    doc.text("Disclaimer: LunaDX is an AI-assisted screening tool. Results must be reviewed by a qualified healthcare professional.", 20, y(disclaimerY));
    doc.save(`LunaDX_Report_${scan.patientName.replace(/\s/g, "_")}.pdf`);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/history"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">AI Analysis Results</h1>
            <p className="text-xs text-muted-foreground">{scan.patientName} &middot; {new Date(scan.scanDate).toLocaleDateString()}</p>
          </div>
        </div>
        <Button onClick={exportPDF} variant="outline" size="sm"><Download className="w-4 h-4 mr-2" /> Export PDF</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Image + Heatmap */}
        <div>
          <HeatmapOverlay scan={scan} />
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {/* Risk Classification */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Risk Classification</h2>
              <RiskBadge level={scan.riskLevel} />
            </div>
            <div className="space-y-4">
              <RiskMeter label="TB Probability" value={scan.tbRisk} color={scan.tbRisk > 70 ? "bg-destructive" : scan.tbRisk > 40 ? "bg-warning" : "bg-success"} />
              <RiskMeter label="Pneumonia Probability" value={scan.pneumoniaRisk} color={scan.pneumoniaRisk > 70 ? "bg-destructive" : scan.pneumoniaRisk > 40 ? "bg-warning" : "bg-success"} />
              <RiskMeter label="Lung Abnormality Score" value={scan.abnormalityScore} color={scan.abnormalityScore > 70 ? "bg-destructive" : scan.abnormalityScore > 40 ? "bg-warning" : "bg-success"} />
            </div>
          </div>

          {/* Findings */}
          <div className="stat-card">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">AI Findings</h2>
            <ul className="space-y-2">
              {scan.findings.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Suggestions */}
          <div className="stat-card">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Recommended Next Steps</h2>
            <ul className="space-y-2">
              {scan.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 rounded-lg bg-warning/5 border border-warning/20 text-xs text-muted-foreground">
        <strong className="text-foreground">⚠ Disclaimer:</strong> This is an AI-assisted screening result and does not constitute a definitive medical diagnosis. All findings must be reviewed and confirmed by a qualified healthcare professional.
      </div>
    </div>
  );
}
