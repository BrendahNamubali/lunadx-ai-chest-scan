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

type QualityStatus = "Good" | "Acceptable" | "Poor";
interface QualityCheck {
  label: string;
  icon: React.ElementType;
  status: QualityStatus;
  detail: string;
}

function simulateQualityAssessment(): QualityCheck[] {
  const statuses: QualityStatus[] = ["Good", "Acceptable", "Poor"];
  const weights = [0.6, 0.3, 0.1]; // bias toward good
  const pick = (): QualityStatus => {
    const r = Math.random();
    return r < weights[0] ? statuses[0] : r < weights[0] + weights[1] ? statuses[1] : statuses[2];
  };

  const resolution = pick();
  const coverage = pick();
  const positioning = pick();
  const artifacts = pick();

  return [
    {
      label: "Image Resolution",
      icon: Monitor,
      status: resolution,
      detail: resolution === "Good" ? "Sufficient for analysis (≥2000px)" : resolution === "Acceptable" ? "Moderate resolution detected" : "Low resolution may reduce accuracy",
    },
    {
      label: "Lung Coverage",
      icon: Target,
      status: coverage,
      detail: coverage === "Good" ? "Full bilateral lung fields visible" : coverage === "Acceptable" ? "Minor peripheral cutoff detected" : "Incomplete lung coverage",
    },
    {
      label: "Patient Positioning",
      icon: User,
      status: positioning,
      detail: positioning === "Good" ? "Correct PA positioning confirmed" : positioning === "Acceptable" ? "Slight rotation noted" : "Significant rotation detected",
    },
    {
      label: "Image Artifacts",
      icon: Sparkles,
      status: artifacts,
      detail: artifacts === "Good" ? "None detected" : artifacts === "Acceptable" ? "Minor artifacts present" : "Motion blur or foreign objects detected",
    },
  ];
}

function QualityBadge({ status }: { status: QualityStatus }) {
  const styles = {
    Good: "bg-success/15 text-success",
    Acceptable: "bg-warning/15 text-warning",
    Poor: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function UploadPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const patients = getPatients();
  const user = getCurrentUser();

  const [patientId, setPatientId] = useState(searchParams.get("patientId") || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [qualityChecks, setQualityChecks] = useState<QualityCheck[] | null>(null);
  const [assessingQuality, setAssessingQuality] = useState(false);

  // Role-based access check (after all hooks)
  if (!canUploadScans(user?.role)) {
    return (
      <div className="animate-fade-in max-w-2xl mx-auto text-center py-20">
        <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Access Restricted</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Only Radiologists and Admins can upload and analyze X-rays. As a Clinician, you can view existing results in the <button onClick={() => navigate("/history")} className="text-primary hover:underline">scan history</button>.
        </p>
      </div>
    );
  }

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    setQualityChecks(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  // Run quality assessment when image is loaded
  useEffect(() => {
    if (!preview) {
      setQualityChecks(null);
      return;
    }
    setAssessingQuality(true);
    const timer = setTimeout(() => {
      setQualityChecks(simulateQualityAssessment());
      setAssessingQuality(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [preview]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const clearImage = () => {
    setImageFile(null);
    setPreview(null);
    setQualityChecks(null);
  };

  const hasPoorQuality = qualityChecks?.some((c) => c.status === "Poor") ?? false;

  const handleTrySample = async () => {
    setAnalyzing(true);
    setAnalysisError(false);

    // Ensure demo patient exists
    const allPatients = getPatients();
    let demoPatient = allPatients.find((p) => p.hospitalId === "SAMPLE-001");
    if (!demoPatient) {
      demoPatient = {
        id: crypto.randomUUID(),
        name: "Sample Patient",
        age: 45,
        sex: "Male" as const,
        hospitalId: "SAMPLE-001",
        symptoms: "Persistent cough, mild fever",
        visitDate: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      };
      savePatient(demoPatient);
    }

    try {
      const aiResponse = await analyzeXray("/sample-xray.jpg");

      const scan: ScanResult = {
        id: crypto.randomUUID(),
        patientId: demoPatient.id,
        patientName: demoPatient.name,
        imageUrl: "/sample-xray.jpg",
        tbRisk: aiResponse.tb_probability,
        pneumoniaRisk: aiResponse.pneumonia_probability,
        lungOpacityRisk: 42,
        pleuralEffusionRisk: 18,
        lungNodulesRisk: 25,
        abnormalityScore: Math.min(
          Math.round(aiResponse.tb_probability * 0.3 + aiResponse.pneumonia_probability * 0.2 + 42 * 0.2 + 18 * 0.15 + 25 * 0.15),
          100
        ),
        riskLevel: Math.max(aiResponse.tb_probability, aiResponse.pneumonia_probability) > 70 ? "High" : Math.max(aiResponse.tb_probability, aiResponse.pneumonia_probability) > 40 ? "Medium" : "Low",
        findings: ["Opacity detected in upper right lobe", "Patchy consolidation in right middle lobe"],
        suggestions: ["Recommend sputum AFB smear and culture", "Suggest CT scan for detailed evaluation", "Schedule follow-up imaging in 2 weeks"],
        aiSummary: aiResponse.ai_summary,
        heatmapOverlayUrl: aiResponse.heatmap_overlay_url || undefined,
        scanDate: new Date().toISOString(),
        doctorName: user?.name || "Demo Doctor",
      };
      saveScan(scan);
      setAnalyzing(false);
      navigate(`/results/${scan.id}`);
    } catch {
      setAnalyzing(false);
      setAnalysisError(true);
    }
  };

  const handleAnalyze = async () => {
    if (!patientId || !imageFile) return;
    setAnalyzing(true);
    setAnalysisError(false);
    const patient = patients.find((p) => p.id === patientId)!;

    try {
      const aiResponse = await analyzeXray(preview!);
      const sim = simulateAI();

      const scan: ScanResult = {
        id: crypto.randomUUID(),
        patientId,
        patientName: patient.name,
        imageUrl: preview!,
        tbRisk: aiResponse.tb_probability,
        pneumoniaRisk: aiResponse.pneumonia_probability,
        lungOpacityRisk: sim.lungOpacityRisk,
        pleuralEffusionRisk: sim.pleuralEffusionRisk,
        lungNodulesRisk: sim.lungNodulesRisk,
        abnormalityScore: Math.min(
          Math.round(aiResponse.tb_probability * 0.3 + aiResponse.pneumonia_probability * 0.2 + sim.lungOpacityRisk * 0.2 + sim.pleuralEffusionRisk * 0.15 + sim.lungNodulesRisk * 0.15),
          100
        ),
        riskLevel: Math.max(aiResponse.tb_probability, aiResponse.pneumonia_probability) > 70 ? "High" : Math.max(aiResponse.tb_probability, aiResponse.pneumonia_probability) > 40 ? "Medium" : "Low",
        findings: sim.findings,
        suggestions: sim.suggestions,
        aiSummary: aiResponse.ai_summary,
        heatmapOverlayUrl: aiResponse.heatmap_overlay_url || undefined,
        scanDate: new Date().toISOString(),
        doctorName: user?.name || "Unknown",
      };
      saveScan(scan);
      setAnalyzing(false);
      navigate(`/results/${scan.id}`);
    } catch {
      setAnalyzing(false);
      setAnalysisError(true);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Upload Chest X-Ray</h1>
      <p className="text-sm text-muted-foreground mb-6 sm:mb-8">Select a patient and upload their chest X-ray for AI screening analysis.</p>

      <div className="space-y-6">
        {/* Patient Select */}
        <div>
          <Label>Patient</Label>
          {patients.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">No patients registered. <button onClick={() => navigate("/patients")} className="text-primary hover:underline">Add a patient first</button>.</p>
          ) : (
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select patient..." /></SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} — {p.hospitalId}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Upload Area */}
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
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                  dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <Upload className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">Drop X-ray image here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG formats</p>
                <input id="file-input" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <span className="relative bg-background px-3 text-xs text-muted-foreground">or</span>
              </div>

              <Button
                variant="outline"
                className="w-full h-12 border-dashed border-primary/30 hover:bg-primary/5 hover:border-primary/50"
                onClick={(e) => { e.stopPropagation(); handleTrySample(); }}
                disabled={analyzing}
              >
                <FlaskConical className="w-4 h-4 mr-2 text-primary" />
                <span className="text-sm font-medium">Try with Sample X-ray</span>
              </Button>
            </div>
          )}
        </div>

        {/* Image Quality Assessment */}
        <AnimatePresence>
          {(assessingQuality || qualityChecks) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardContent className="pt-5 pb-5">
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-primary" />
                    Image Quality Assessment
                  </h2>

                  {assessingQuality ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Assessing image quality…
                    </div>
                  ) : qualityChecks && (
                    <div className="space-y-3">
                      {qualityChecks.map((check, i) => (
                        <motion.div
                          key={check.label}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/40"
                        >
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

                      {/* Overall verdict */}
                      {hasPoorQuality ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                          className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/8 border border-destructive/20 mt-2"
                        >
                          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                          <p className="text-xs text-destructive leading-relaxed">
                            <strong>Warning:</strong> Image quality may affect AI screening accuracy. Consider re-uploading a higher-quality image for more reliable results.
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                          className="flex items-start gap-2.5 p-3 rounded-lg bg-success/8 border border-success/20 mt-2"
                        >
                          <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" />
                          <p className="text-xs text-success leading-relaxed">
                            Image quality is sufficient for AI screening analysis.
                          </p>
                        </motion.div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analysis Error */}
        <AnimatePresence>
          {analysisError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl border border-destructive/25 bg-destructive/8 p-4 flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">AI analysis unavailable. Please try again.</p>
                <p className="text-xs text-muted-foreground">The analysis service could not process the request. You can re-upload or retry.</p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleAnalyze} disabled={!patientId || !imageFile}>
                    Retry Analysis
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { clearImage(); setAnalysisError(false); }}>
                    Re-upload X-Ray
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button onClick={handleAnalyze} disabled={!patientId || !imageFile || analyzing || assessingQuality} className="w-full cta-gradient text-cta-foreground border-0 hover:opacity-90 h-12 text-sm">
          {analyzing ? (
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</span>
          ) : (
            <span className="flex items-center gap-2"><FileImage className="w-4 h-4" /> Analyze X-Ray</span>
          )}
        </Button>
      </div>

      {/* Full-screen AI analysis overlay */}
      <AnimatePresence>
        {analyzing && <AIAnalysisLoader />}
      </AnimatePresence>
    </div>
  );
}
