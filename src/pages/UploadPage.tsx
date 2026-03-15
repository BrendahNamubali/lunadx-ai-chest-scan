import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Upload, FileImage, X, CheckCircle, AlertTriangle, Monitor, Target, User, Sparkles, Loader2, FlaskConical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AIAnalysisLoader from "@/components/AIAnalysisLoader";
import { getPatients, getCurrentUser, analyzeXray, simulateAI, saveScan, savePatient, canUploadScans, type ScanResult } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type QualityStatus = "Good" | "Acceptable" | "Poor";
interface QualityCheck {
  label: string;
  icon: React.ElementType;
  status: QualityStatus;
  detail: string;
}

function simulateQualityAssessment(): QualityCheck[] {
  const statuses: QualityStatus[] = ["Good", "Acceptable", "Poor"];
  const weights = [0.6, 0.3, 0.1];
  const pick = (): QualityStatus => {
    const r = Math.random();
    return r < weights[0] ? statuses[0] : r < weights[0] + weights[1] ? statuses[1] : statuses[2];
  };
  return [
    { label: "Image Resolution", icon: Monitor, status: pick(), detail: "Checking image resolution…" },
    { label: "Lung Coverage",    icon: Target,  status: pick(), detail: "Checking lung field coverage…" },
    { label: "Patient Positioning", icon: User, status: pick(), detail: "Checking positioning…" },
    { label: "Image Artifacts",  icon: Sparkles, status: pick(), detail: "Checking for artifacts…" },
  ].map((c) => ({
    ...c,
    detail: c.status === "Good"
      ? ({ "Image Resolution": "Sufficient for analysis (≥2000px)", "Lung Coverage": "Full bilateral lung fields visible", "Patient Positioning": "Correct PA positioning confirmed", "Image Artifacts": "None detected" }[c.label] || "Good")
      : c.status === "Acceptable"
      ? ({ "Image Resolution": "Moderate resolution detected", "Lung Coverage": "Minor peripheral cutoff detected", "Patient Positioning": "Slight rotation noted", "Image Artifacts": "Minor artifacts present" }[c.label] || "Acceptable")
      : ({ "Image Resolution": "Low resolution may reduce accuracy", "Lung Coverage": "Incomplete lung coverage", "Patient Positioning": "Significant rotation detected", "Image Artifacts": "Motion blur or foreign objects detected" }[c.label] || "Poor"),
  }));
}

function QualityBadge({ status }: { status: QualityStatus }) {
  const styles = { Good: "bg-success/15 text-success", Acceptable: "bg-warning/15 text-warning", Poor: "bg-destructive/15 text-destructive" };
  return <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${styles[status]}`}>{status}</span>;
}

export default function UploadPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const patients = getPatients();
  const user = getCurrentUser();

  const [patientId, setPatientId]           = useState(searchParams.get("patientId") || "");
  const [viewPosition, setViewPosition]     = useState("PA");
  const [clinicalNotes, setClinicalNotes]   = useState("");
  const [imageFile, setImageFile]           = useState<File | null>(null);
  const [preview, setPreview]               = useState<string | null>(null);
  const [analyzing, setAnalyzing]           = useState(false);
  const [analysisError, setAnalysisError]   = useState(false);
  const [errorMessage, setErrorMessage]     = useState("");
  const [dragOver, setDragOver]             = useState(false);
  const [qualityChecks, setQualityChecks]   = useState<QualityCheck[] | null>(null);
  const [assessingQuality, setAssessingQuality] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    setQualityChecks(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    if (!preview) { setQualityChecks(null); return; }
    setAssessingQuality(true);
    const timer = setTimeout(() => { setQualityChecks(simulateQualityAssessment()); setAssessingQuality(false); }, 1200);
    return () => clearTimeout(timer);
  }, [preview]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  if (!canUploadScans(user?.role)) {
    return (
      <div className="animate-fade-in max-w-2xl mx-auto text-center py-20">
        <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Access Restricted</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Only Radiologists and Admins can upload and analyze X-rays. As a Clinician, you can view existing results in the{" "}
          <button onClick={() => navigate("/history")} className="text-primary hover:underline">scan history</button>.
        </p>
      </div>
    );
  }

  const clearImage = () => { setImageFile(null); setPreview(null); setQualityChecks(null); };
  const hasPoorQuality = qualityChecks?.some((c) => c.status === "Poor") ?? false;

  // ── Build ScanResult from backend or simulation response ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function buildScan(aiResponse: any, patient: { id: string; name: string }, imageUrl: string): ScanResult {
    // If backend returned extra fields, use them; otherwise simulate
    const sim = simulateAI();
    return {
      id: crypto.randomUUID(),
      patientId: patient.id,
      patientName: patient.name,
      imageUrl,
      tbRisk:              aiResponse.tb_probability        ?? sim.tbRisk,
      pneumoniaRisk:       aiResponse.pneumonia_probability ?? sim.pneumoniaRisk,
      lungOpacityRisk:     aiResponse._lungOpacityRisk      ?? sim.lungOpacityRisk,
      pleuralEffusionRisk: aiResponse._pleuralEffusionRisk  ?? sim.pleuralEffusionRisk,
      lungNodulesRisk:     aiResponse._lungNodulesRisk      ?? sim.lungNodulesRisk,
      abnormalityScore: Math.min(
        Math.round(
          (aiResponse.tb_probability        ?? sim.tbRisk)             * 0.3 +
          (aiResponse.pneumonia_probability ?? sim.pneumoniaRisk)      * 0.2 +
          (aiResponse._lungOpacityRisk      ?? sim.lungOpacityRisk)    * 0.2 +
          (aiResponse._pleuralEffusionRisk  ?? sim.pleuralEffusionRisk)* 0.15 +
          (aiResponse._lungNodulesRisk      ?? sim.lungNodulesRisk)    * 0.15
        ), 100
      ),
      riskLevel: Math.max(
        aiResponse.tb_probability        ?? 0,
        aiResponse.pneumonia_probability ?? 0
      ) > 70 ? "High" : Math.max(
        aiResponse.tb_probability        ?? 0,
        aiResponse.pneumonia_probability ?? 0
      ) > 40 ? "Medium" : "Low",
      findings:    aiResponse._findings    ?? sim.findings,
      suggestions: aiResponse._suggestions ?? sim.suggestions,
      aiSummary:   aiResponse.ai_summary,
      heatmapOverlayUrl: aiResponse.heatmap_overlay_url || undefined,
      scanDate:    new Date().toISOString(),
      doctorName:  user?.name || "Unknown",
    };
  }

  const handleTrySample = async () => {
    setAnalyzing(true); setAnalysisError(false);
    const allPatients = getPatients();
    let demoPatient = allPatients.find((p) => p.hospitalId === "SAMPLE-001");
    if (!demoPatient) {
      demoPatient = { id: crypto.randomUUID(), name: "Sample Patient", age: 45, sex: "Male" as const, hospitalId: "SAMPLE-001", symptoms: "Persistent cough, mild fever", visitDate: new Date().toISOString().slice(0, 10), createdAt: new Date().toISOString() };
      savePatient(demoPatient);
    }
    try {
      const aiResponse = await analyzeXray("/sample-xray.jpg", demoPatient.id, "Sample case — persistent cough", "PA");
      const scan = buildScan(aiResponse, demoPatient, "/sample-xray.jpg");
      saveScan(scan);
      setAnalyzing(false);
      navigate(`/results/${scan.id}`);
    } catch {
      setAnalyzing(false); setAnalysisError(true); setErrorMessage("Sample analysis failed.");
    }
  };

  const handleAnalyze = async () => {
    if (!patientId || !imageFile) return;
    setAnalyzing(true); setAnalysisError(false);
    const patient = patients.find((p) => p.id === patientId)!;
    try {
      // Pass patient context to backend for better report generation
      const aiResponse = await analyzeXray(preview!, patientId, clinicalNotes || patient.symptoms, viewPosition);
      const scan = buildScan(aiResponse, patient, preview!);
      saveScan(scan);
      setAnalyzing(false);
      navigate(`/results/${scan.id}`);
    } catch (err) {
      setAnalyzing(false);
      setAnalysisError(true);
      setErrorMessage(err instanceof Error ? err.message : "Analysis failed.");
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Upload Chest X-Ray</h1>
      <p className="text-sm text-muted-foreground mb-6 sm:mb-8">Select a patient and upload their chest X-ray for AI screening analysis.</p>

      <div className="space-y-6">
        {/* Patient */}
        <div>
          <Label>Patient</Label>
          {patients.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">No patients registered. <button onClick={() => navigate("/patients")} className="text-primary hover:underline">Add a patient first</button>.</p>
          ) : (
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select patient…" /></SelectTrigger>
              <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {p.hospitalId}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>

        {/* View position + clinical notes */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>View Position</Label>
            <Select value={viewPosition} onValueChange={setViewPosition}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PA">PA — Posteroanterior</SelectItem>
                <SelectItem value="AP">AP — Anteroposterior</SelectItem>
                <SelectItem value="LAT">LAT — Lateral</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Clinical Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="e.g. 45M, cough, fever 3 days…" className="mt-1.5 min-h-[38px] text-sm resize-none" />
          </div>
        </div>

        {/* Upload area */}
        <div>
          <Label>Chest X-Ray Image</Label>
          {preview ? (
            <div className="mt-2 relative stat-card p-0 overflow-hidden">
              <img src={preview} alt="X-ray preview" className="w-full max-h-96 object-contain bg-foreground/5" />
              <button onClick={clearImage} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-foreground/80 flex items-center justify-center hover:bg-foreground transition-colors">
                <X className="w-4 h-4 text-background" />
              </button>
            </div>
          ) : (
            <div className="mt-2 space-y-3">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <Upload className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">Drop X-ray image here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG, DICOM formats</p>
                <input id="file-input" type="file" accept="image/*,.dcm,.dicom" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <span className="relative bg-background px-3 text-xs text-muted-foreground">or</span>
              </div>

              <Button variant="outline" className="w-full h-12 border-dashed border-primary/30 hover:bg-primary/5 hover:border-primary/50" onClick={(e) => { e.stopPropagation(); handleTrySample(); }} disabled={analyzing}>
                <FlaskConical className="w-4 h-4 mr-2 text-primary" />
                <span className="text-sm font-medium">Try with Sample X-ray</span>
              </Button>
            </div>
          )}
        </div>

        {/* Quality assessment */}
        <AnimatePresence>
          {(assessingQuality || qualityChecks) && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
              <Card>
                <CardContent className="pt-5 pb-5">
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-primary" /> Image Quality Assessment
                  </h2>
                  {assessingQuality ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Assessing image quality…
                    </div>
                  ) : qualityChecks && (
                    <div className="space-y-3">
                      {qualityChecks.map((check, i) => (
                        <motion.div key={check.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/40">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <check.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">{check.label}</p>
                              <p className="text-xs text-muted-foreground truncate">{check.detail}</p>
                            </div>
                          </div>
                          <QualityBadge status={check.status} />
                        </motion.div>
                      ))}
                      {hasPoorQuality ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/8 border border-destructive/20 mt-2">
                          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                          <p className="text-xs text-destructive leading-relaxed"><strong>Warning:</strong> Image quality may affect AI screening accuracy.</p>
                        </motion.div>
                      ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex items-start gap-2.5 p-3 rounded-lg bg-success/8 border border-success/20 mt-2">
                          <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" />
                          <p className="text-xs text-success leading-relaxed">Image quality is sufficient for AI screening analysis.</p>
                        </motion.div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {analysisError && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="rounded-xl border border-destructive/25 bg-destructive/8 p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">AI analysis unavailable. {errorMessage}</p>
                <p className="text-xs text-muted-foreground">Make sure the backend is running: <code className="text-xs bg-muted px-1 rounded">./venv/bin/uvicorn main:app --port 8000</code></p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleAnalyze} disabled={!patientId || !imageFile}>Retry Analysis</Button>
                  <Button size="sm" variant="outline" onClick={() => { clearImage(); setAnalysisError(false); }}>Re-upload X-Ray</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button onClick={handleAnalyze} disabled={!patientId || !imageFile || analyzing || assessingQuality} className="w-full cta-gradient text-cta-foreground border-0 hover:opacity-90 h-12 text-sm">
          {analyzing
            ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with CheXNet…</span>
            : <span className="flex items-center gap-2"><FileImage className="w-4 h-4" /> Analyze X-Ray</span>}
        </Button>
      </div>

      <AnimatePresence>{analyzing && <AIAnalysisLoader />}</AnimatePresence>
    </div>
  );
}
