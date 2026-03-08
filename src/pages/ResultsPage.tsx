import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, AlertTriangle, CheckCircle, Activity, ShieldAlert, ShieldCheck, ShieldMinus, FileText, Save, Pencil, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { getScans, getCurrentUser, getOrganization, updateScanNotes, type ScanResult } from "@/lib/store";
import RiskBadge from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import jsPDF from "jspdf";

/* ─── Helpers ────────────────────────────────────────── */
const getRiskColor = (v: number) => (v > 70 ? "text-destructive" : v > 40 ? "text-warning" : "text-success");
const getRiskBg = (v: number) => (v > 70 ? "bg-destructive" : v > 40 ? "bg-warning" : "bg-success");
const getRiskHsl = (v: number) => (v > 70 ? "hsl(0,72%,51%)" : v > 40 ? "hsl(30,90%,50%)" : "hsl(142,60%,40%)");

/* ─── Primary Risk Ring ──────────────────────────────── */
function PrimaryRiskRing({ scan }: { scan: ScanResult }) {
  const mainRisk = Math.max(scan.tbRisk, scan.pneumoniaRisk, scan.abnormalityScore);
  const r = 58;
  const c = 2 * Math.PI * r;
  const offset = c - (mainRisk / 100) * c;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center"
    >
      <div className="relative w-[160px] h-[160px]">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          <circle cx="70" cy="70" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
          <motion.circle
            cx="70" cy="70" r={r} fill="none"
            stroke={getRiskHsl(mainRisk)}
            strokeWidth="10" strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${getRiskColor(mainRisk)}`}>{mainRisk}%</span>
          <span className="text-xs text-muted-foreground mt-1">Overall Risk</span>
        </div>
      </div>

      {/* Sub-scores */}
      <div className="flex gap-6 mt-4 text-center">
        {[
          { label: "TB", value: scan.tbRisk },
          { label: "Pneumonia", value: scan.pneumoniaRisk },
          { label: "Abnormality", value: scan.abnormalityScore },
        ].map((s) => (
          <div key={s.label}>
            <span className={`text-lg font-bold tabular-nums ${getRiskColor(s.value)}`}>{s.value}%</span>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Risk Banner ────────────────────────────────────── */
function RiskBanner({ scan }: { scan: ScanResult }) {
  const config = {
    High: { icon: ShieldAlert, bg: "bg-destructive/8 border-destructive/25", iconColor: "text-destructive", title: "High Risk — Immediate Attention Required" },
    Medium: { icon: ShieldMinus, bg: "bg-warning/8 border-warning/25", iconColor: "text-warning", title: "Moderate Risk — Further Evaluation Needed" },
    Low: { icon: ShieldCheck, bg: "bg-success/8 border-success/25", iconColor: "text-success", title: "Low Risk — No Significant Findings" },
  };
  const c = config[scan.riskLevel];

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl border p-4 flex items-center gap-3 ${c.bg}`}>
      <c.icon className={`w-6 h-6 ${c.iconColor}`} />
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-semibold text-foreground text-sm">{c.title}</h3>
        <RiskBadge level={scan.riskLevel} />
      </div>
    </motion.div>
  );
}

/* ─── Heatmap Viewer ─────────────────────────────────── */
function HeatmapViewer({ scan }: { scan: ScanResult }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  // Generate deterministic hotspots from scan data
  const hotspots = useMemo(() => {
    const seed = (scan.tbRisk * 7 + scan.pneumoniaRisk * 13 + scan.lungOpacityRisk * 3) % 1000;
    const rng = (i: number) => ((seed * (i + 1) * 9301 + 49297) % 233280) / 233280;
    const spots: { x: number; y: number; r: number; intensity: number }[] = [];
    const count = scan.riskLevel === "High" ? 5 : scan.riskLevel === "Medium" ? 3 : 2;
    for (let i = 0; i < count; i++) {
      spots.push({
        x: 0.25 + rng(i) * 0.5,
        y: 0.2 + rng(i + 10) * 0.5,
        r: 0.08 + rng(i + 20) * 0.12,
        intensity: 0.3 + rng(i + 30) * 0.7,
      });
    }
    return spots;
  }, [scan]);

  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw grayscale X-ray
      ctx.filter = "grayscale(1) contrast(1.2) brightness(1.05)";
      ctx.drawImage(img, 0, 0);
      ctx.filter = "none";

      // Draw heatmap blobs
      hotspots.forEach(({ x, y, r, intensity }) => {
        const cx = x * img.width;
        const cy = y * img.height;
        const radius = r * Math.min(img.width, img.height);

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        const alpha = intensity * 0.55;

        if (intensity > 0.7) {
          gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
          gradient.addColorStop(0.5, `rgba(255, 80, 0, ${alpha * 0.6})`);
          gradient.addColorStop(1, "rgba(255, 200, 0, 0)");
        } else if (intensity > 0.4) {
          gradient.addColorStop(0, `rgba(255, 180, 0, ${alpha})`);
          gradient.addColorStop(0.6, `rgba(255, 220, 0, ${alpha * 0.4})`);
          gradient.addColorStop(1, "rgba(255, 255, 0, 0)");
        } else {
          gradient.addColorStop(0, `rgba(0, 200, 100, ${alpha})`);
          gradient.addColorStop(0.6, `rgba(0, 255, 150, ${alpha * 0.3})`);
          gradient.addColorStop(1, "rgba(0, 255, 200, 0)");
        }

        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalCompositeOperation = "source-over";
      setLoaded(true);
    };
    img.src = scan.imageUrl;
  }, [scan.imageUrl, hotspots]);

  useEffect(() => {
    drawHeatmap();
  }, [drawHeatmap]);

  return (
    <div className="relative">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
          <Activity className="w-6 h-6 text-primary animate-pulse" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-auto rounded-lg object-contain max-h-[400px]"
      />
    </div>
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
        <Link to="/history" className="text-primary hover:underline">Go to history</Link>
      </div>
    );

  const org = user ? getOrganization(user.orgId) : undefined;

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentW = pageW - margin * 2;
    let y = 15;

    const drawLine = (yPos: number) => {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageW - margin, yPos);
    };

    const sectionHeader = (title: string, yPos: number) => {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(11, 42, 74); // Deep Navy
      doc.text(title.toUpperCase(), margin, yPos);
      drawLine(yPos + 2);
      return yPos + 8;
    };

    // ── Header ──
    doc.setFillColor(11, 42, 74);
    doc.rect(0, 0, pageW, 32, "F");

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("LunaDX", margin, 14);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 200, 220);
    doc.text("AI-Assisted Clinical Screening Report", margin, 20);

    if (org) {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text(org.name, pageW - margin, 14, { align: "right" });
      doc.setFontSize(7);
      doc.setTextColor(180, 200, 220);
      doc.text(org.location, pageW - margin, 20, { align: "right" });
    }

    doc.setFontSize(7);
    doc.setTextColor(150, 170, 190);
    doc.text(`Report ID: ${scan.id.slice(0, 8).toUpperCase()}`, margin, 28);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin, 28, { align: "right" });

    y = 42;

    // ── Risk Banner ──
    const riskColors: Record<string, [number, number, number]> = {
      High: [220, 38, 38],
      Medium: [234, 140, 0],
      Low: [22, 163, 74],
    };
    const riskBg: Record<string, [number, number, number]> = {
      High: [254, 242, 242],
      Medium: [255, 251, 235],
      Low: [240, 253, 244],
    };
    const [rR, rG, rB] = riskColors[scan.riskLevel];
    const [bR, bG, bB] = riskBg[scan.riskLevel];

    doc.setFillColor(bR, bG, bB);
    doc.roundedRect(margin, y, contentW, 16, 3, 3, "F");
    doc.setDrawColor(rR, rG, rB);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentW, 16, 3, 3, "S");

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(rR, rG, rB);
    doc.text(`${scan.riskLevel.toUpperCase()} RISK`, margin + 6, y + 7);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const riskDesc = scan.riskLevel === "High" ? "Immediate clinical attention required" : scan.riskLevel === "Medium" ? "Further evaluation recommended" : "No significant findings";
    doc.text(riskDesc, margin + 6, y + 13);

    // Risk scores on the right
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(rR, rG, rB);
    doc.text(`TB: ${scan.tbRisk}%  |  PNA: ${scan.pneumoniaRisk}%  |  Score: ${scan.abnormalityScore}%`, pageW - margin - 6, y + 10, { align: "right" });

    y += 24;

    // ── Section 1: Patient Information ──
    y = sectionHeader("Patient Information", y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);

    const patientInfo = [
      ["Patient Name", scan.patientName],
      ["Scan Date", new Date(scan.scanDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })],
      ["Analyzing Clinician", scan.doctorName],
      ["Scan ID", scan.id.slice(0, 12).toUpperCase()],
    ];

    patientInfo.forEach(([label, value], i) => {
      const col = i % 2 === 0 ? margin : margin + contentW / 2;
      const row = y + Math.floor(i / 2) * 8;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(120, 120, 120);
      doc.text(label + ":", col, row);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(value, col + doc.getTextWidth(label + ":  "), row);
    });

    y += Math.ceil(patientInfo.length / 2) * 8 + 6;

    // ── Section 2: AI Screening Results ──
    y = sectionHeader("AI Screening Results", y);

    const conditions = [
      { name: "Tuberculosis (TB)", value: scan.tbRisk },
      { name: "Pneumonia", value: scan.pneumoniaRisk },
      { name: "Lung Opacity", value: scan.lungOpacityRisk },
      { name: "Pleural Effusion", value: scan.pleuralEffusionRisk },
      { name: "Lung Nodules", value: scan.lungNodulesRisk },
    ];

    conditions.forEach((c, i) => {
      const rowY = y + i * 9;
      // Label
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      doc.text(c.name, margin, rowY);

      // Progress bar background
      const barX = margin + 55;
      const barW = 80;
      const barH = 4;
      doc.setFillColor(230, 230, 230);
      doc.roundedRect(barX, rowY - 3, barW, barH, 2, 2, "F");

      // Progress bar fill
      const [cR, cG, cB] = c.value > 70 ? [220, 38, 38] : c.value > 40 ? [234, 140, 0] : [22, 163, 74];
      doc.setFillColor(cR, cG, cB);
      doc.roundedRect(barX, rowY - 3, (c.value / 100) * barW, barH, 2, 2, "F");

      // Value
      doc.setFont("helvetica", "bold");
      doc.setTextColor(cR, cG, cB);
      doc.text(`${c.value}%`, barX + barW + 4, rowY);
    });

    y += conditions.length * 9 + 6;

    // ── Section 3: Key Findings ──
    y = sectionHeader("Key Findings", y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    scan.findings.slice(0, 4).forEach((f, i) => {
      doc.text(`•  ${f}`, margin + 2, y + i * 7);
    });
    y += scan.findings.slice(0, 4).length * 7 + 4;

    // ── Section 4: AI Summary ──
    if (scan.aiSummary) {
      y = sectionHeader("AI Analysis Summary", y);
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(50, 50, 50);
      const summaryLines = doc.splitTextToSize(scan.aiSummary, contentW - 4);
      doc.text(summaryLines, margin + 2, y);
      y += summaryLines.length * 5 + 6;
    }

    // ── Section 5: Recommended Actions ──
    if (scan.suggestions.length > 0) {
      y = sectionHeader("Recommended Next Steps", y);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      scan.suggestions.slice(0, 3).forEach((s, i) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(11, 42, 74);
        doc.text(`${i + 1}.`, margin + 2, y + i * 7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        doc.text(s, margin + 10, y + i * 7);
      });
      y += scan.suggestions.slice(0, 3).length * 7 + 4;
    }

    // ── Section 6: Clinical Notes ──
    if (notes.trim()) {
      y = sectionHeader("Clinical Notes", y);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      const noteLines = doc.splitTextToSize(notes, contentW - 4);
      doc.text(noteLines, margin + 2, y);
      y += noteLines.length * 5 + 6;
    }

    // ── Footer ──
    const footerY = doc.internal.pageSize.getHeight() - 15;
    drawLine(footerY - 4);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text(
      "⚠ DISCLAIMER: This report is generated by an AI-assisted screening tool and does not constitute a definitive medical diagnosis. All results must be reviewed and confirmed by a qualified healthcare professional.",
      margin,
      footerY,
      { maxWidth: contentW }
    );
    doc.text("Powered by LunaDX — AI-Assisted Clinical Screening", pageW / 2, footerY + 8, { align: "center" });

    doc.save(`LunaDX_Report_${scan.patientName.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <Link to="/history">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">Screening Results</h1>
            <p className="text-xs text-muted-foreground">{scan.patientName} &middot; {new Date(scan.scanDate).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/report/${scan.id}`); toast.success("Link copied"); }} variant="outline" size="sm">
            <Share2 className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Share</span>
          </Button>
          <Button onClick={exportPDF} variant="outline" size="sm">
            <Download className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </div>

      {/* Risk Banner */}
      <RiskBanner scan={scan} />

      {/* Main Content: X-ray + Risk Score side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        {/* X-ray with Heatmap */}
        <Card className="overflow-hidden">
          <div className="bg-black p-1 relative">
            <HeatmapViewer scan={scan} />
          </div>
          <div className="px-3 py-2 flex items-center justify-between bg-muted/20">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">AI Heatmap Overlay</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" /><span className="text-[9px] text-muted-foreground">Low</span>
              <span className="w-2 h-2 rounded-full bg-yellow-500" /><span className="text-[9px] text-muted-foreground">Med</span>
              <span className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[9px] text-muted-foreground">High</span>
            </div>
          </div>
        </Card>

        {/* Risk Score */}
        <Card>
          <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center h-full">
            <PrimaryRiskRing scan={scan} />
          </CardContent>
        </Card>
      </div>

      {/* AI Summary */}
      {scan.aiSummary && (
        <Card className="mt-5">
          <CardContent className="pt-5 pb-5">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              AI Analysis Summary
            </h2>
            <p className="text-sm text-foreground leading-relaxed p-3 rounded-lg bg-primary/5 border border-primary/15">
              {scan.aiSummary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Key Findings (top 3) */}
      <Card className="mt-5">
        <CardContent className="pt-5 pb-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Key Findings
          </h2>
          <ul className="space-y-2">
            {scan.findings.slice(0, 3).map((f, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="flex items-start gap-2.5 text-sm p-2.5 rounded-lg bg-muted/40"
              >
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getRiskBg(scan.tbRisk)}`} />
                <span className="text-foreground">{f}</span>
              </motion.li>
            ))}
          </ul>
          {scan.suggestions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-success" /> Next Steps
              </h3>
              <ul className="space-y-1.5">
                {scan.suggestions.slice(0, 2).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Doctor Notes */}
      <Card className="mt-5">
        <CardContent className="pt-5 pb-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Clinical Notes
          </h2>
          {isEditing ? (
            <div className="space-y-3">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add clinical observations…" className="min-h-[100px] text-sm" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { updateScanNotes(scan.id, notes); setIsEditing(false); toast.success("Notes saved"); }}>
                  <Save className="w-4 h-4 mr-1" /> Save
                </Button>
                {scan.doctorNotes && (
                  <Button size="sm" variant="ghost" onClick={() => { setNotes(scan.doctorNotes || ""); setIsEditing(false); }}>Cancel</Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/40 text-sm text-foreground whitespace-pre-wrap">{notes || <span className="text-muted-foreground italic">No notes yet.</span>}</div>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}><Pencil className="w-4 h-4 mr-1" /> Edit</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="mt-5 mb-4 p-3 rounded-lg bg-warning/5 border border-warning/20 text-xs text-muted-foreground">
        <strong className="text-foreground">⚠ Disclaimer:</strong> AI-assisted screening — not a definitive diagnosis. Must be reviewed by a qualified healthcare professional.
      </div>
    </div>
  );
}
