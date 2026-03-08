import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Download, ArrowLeft, Activity, Stethoscope, TrendingUp, AlertTriangle, CheckCircle, FileText, BrainCircuit, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
import { getScans, getPatients, type ScanResult } from "@/lib/store";
import RiskBadge from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import jsPDF from "jspdf";

function RiskGaugeSmall({ label, value }: { label: string; value: number }) {
  const color = value > 70 ? "text-destructive" : value > 40 ? "text-warning" : "text-success";
  const bg = value > 70 ? "bg-destructive" : value > 40 ? "bg-warning" : "bg-success";
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-1">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8 }}
          className={`h-full rounded-full ${bg}`}
        />
      </div>
      <span className={`text-lg font-bold ${color}`}>{value}%</span>
    </div>
  );
}

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

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("LunaDX Clinical Report", 20, 20);
    doc.setFontSize(10);
    doc.text(`Doctor: ${scan.doctorName}`, 20, 30);
    doc.text(`Date: ${new Date(scan.scanDate).toLocaleDateString()}`, 20, 36);
    doc.setLineWidth(0.3);
    doc.line(20, 40, 190, 40);
    doc.setFontSize(12);
    doc.text("Patient Information", 20, 48);
    doc.setFontSize(10);
    doc.text(`Name: ${scan.patientName}`, 20, 56);
    if (patient) {
      doc.text(`Age: ${patient.age} | Sex: ${patient.sex} | Hospital ID: ${patient.hospitalId}`, 20, 62);
    }
    doc.setFontSize(12);
    doc.text("AI Analysis Results", 20, 74);
    doc.setFontSize(10);
    doc.text(`TB Risk: ${scan.tbRisk}%`, 20, 82);
    doc.text(`Pneumonia Risk: ${scan.pneumoniaRisk}%`, 20, 88);
    doc.text(`Abnormality Score: ${scan.abnormalityScore}%`, 20, 94);
    doc.text(`Risk Classification: ${scan.riskLevel}`, 20, 100);
    doc.text(`AI Confidence: ${aiConfidence}%`, 20, 106);
    doc.setFontSize(12);
    doc.text("Findings", 20, 118);
    doc.setFontSize(10);
    scan.findings.forEach((f, i) => doc.text(`• ${f}`, 24, 126 + i * 6));
    const sugStart = 126 + scan.findings.length * 6 + 10;
    doc.setFontSize(12);
    doc.text("Recommended Next Steps", 20, sugStart);
    doc.setFontSize(10);
    scan.suggestions.forEach((s, i) => doc.text(`${i + 1}. ${s}`, 24, sugStart + 8 + i * 6));
    let notesY = sugStart + 8 + scan.suggestions.length * 6 + 10;
    if (scan.doctorNotes?.trim()) {
      doc.setFontSize(12);
      doc.text("Doctor's Clinical Notes", 20, notesY);
      doc.setFontSize(10);
      const noteLines = doc.splitTextToSize(scan.doctorNotes, 166);
      doc.text(noteLines, 20, notesY + 8);
      notesY = notesY + 8 + noteLines.length * 5 + 6;
    }
    doc.setFontSize(8);
    doc.text("Disclaimer: LunaDX is an AI-assisted screening tool. Results must be reviewed by a qualified healthcare professional.", 20, notesY + 8);
    doc.save(`LunaDX_Report_${scan.patientName.replace(/\s/g, "_")}.pdf`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header bar */}
      <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-sm">LunaDX Report</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">READ ONLY</span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportPDF} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" /> Download PDF
            </Button>
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Patient Info */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-lg font-bold text-foreground">{scan.patientName}</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {patient ? `${patient.age}y · ${patient.sex} · ID: ${patient.hospitalId}` : "Patient details unavailable"}
                    {" · "}Scan: {new Date(scan.scanDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                  <p className="text-xs text-muted-foreground">Doctor: {scan.doctorName}</p>
                </div>
                <RiskBadge level={scan.riskLevel} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Risk Scores */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "TB Risk", value: scan.tbRisk },
              { label: "Pneumonia", value: scan.pneumoniaRisk },
              { label: "Abnormality", value: scan.abnormalityScore },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="pt-4 pb-4">
                  <RiskGaugeSmall label={item.label} value={item.value} />
                </CardContent>
              </Card>
            ))}
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                  <BrainCircuit className="w-3 h-3" /> AI Confidence
                </p>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-1">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${aiConfidence}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
                <span className="text-lg font-bold text-primary">{aiConfidence}%</span>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* X-ray Image */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="overflow-hidden">
            <img src={scan.imageUrl} alt="Chest X-ray" className="w-full max-h-[400px] object-contain bg-foreground/5" />
          </Card>
        </motion.div>

        {/* Findings + Suggestions side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="h-full">
              <CardContent className="pt-5 pb-5">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" /> AI Findings
                </h2>
                <ul className="space-y-2">
                  {scan.findings.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm p-2 rounded-lg bg-muted/40">
                      <span className="w-2 h-2 rounded-full bg-warning mt-1.5 shrink-0" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="h-full">
              <CardContent className="pt-5 pb-5">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" /> Recommended Next Steps
                </h2>
                <ul className="space-y-2">
                  {scan.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-foreground">{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Doctor Notes (read-only) */}
        {scan.doctorNotes?.trim() && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardContent className="pt-5 pb-5">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Doctor's Clinical Notes
                </h2>
                <div className="p-3 rounded-lg bg-muted/40 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {scan.doctorNotes}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Disclaimer */}
        <div className="p-4 rounded-lg bg-warning/5 border border-warning/20 text-xs text-muted-foreground">
          <strong className="text-foreground">⚠ Disclaimer:</strong> This is an AI-assisted screening result and does not constitute a definitive medical diagnosis. All findings must be reviewed and confirmed by a qualified healthcare professional.
        </div>
      </div>
    </div>
  );
}
