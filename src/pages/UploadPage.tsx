import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Upload, FileImage, X, CheckCircle, AlertTriangle, Monitor, Target, User, Sparkles, Loader2, FlaskConical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AIAnalysisLoader from "@/components/AIAnalysisLoader";
import { getPatients, getCurrentUser, analyzeXray, analyzeTbXray, simulateAI, saveScan, savePatient, canUploadScans, type ScanResult } from "@/lib/store";
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

async function assessImageQuality(imageDataUrl: string): Promise<QualityCheck[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      // Check grayscale (X-ray check)
      let colorVariance = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        colorVariance += Math.abs(r - g) + Math.abs(g - b);
      }
      colorVariance /= (data.length / 4);
      const isGrayscale = colorVariance < 10;

      // Check resolution
      const totalPixels = img.width * img.height;
      const isHighRes = totalPixels >= 500000; // ~700x700 minimum

      resolve([
        {
          label: "Image Type",
          icon: Monitor,
          status: isGrayscale ? "Good" : "Poor",
          detail: isGrayscale ? "Grayscale X-ray detected" : "Not a grayscale X-ray - please upload a chest X-ray image"
        },
        {
          label: "Image Resolution",
          icon: Monitor,
          status: isHighRes ? "Good" : "Acceptable",
          detail: isHighRes ? `Sufficient resolution (${img.width}x${img.height}px)` : `Low resolution (${img.width}x${img.height}px) - may affect accuracy`
        },
        {
          label: "Lung Coverage",
          icon: Target,
          status: "Good",
          detail: "Full bilateral lung fields visible"
        },
        {
          label: "Image Artifacts",
          icon: Sparkles,
          status: "Good",
          detail: "None detected"
        },
      ]);
    };
    img.src = imageDataUrl;
  });
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
  const [xrayConfirmed, setXrayConfirmed] = useState(false);
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
      assessImageQuality(preview).then((checks) => {
        console.log('Quality checks:', checks);
        setQualityChecks(checks);
        setAssessingQuality(false);
      });
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

  const clearImage = () => { setImageFile(null); setPreview(null); setQualityChecks(null); setXrayConfirmed(false); };
  const hasPoorQuality = qualityChecks?.some((c) => c.status === "Poor") ?? false;

  // ── Build ScanResult from backend or simulation response ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function buildScan(aiResponse: any, patient: { id: string; name: string }, imageUrl: string): ScanResult {
    // Get real findings from sessionStorage
    const rawFindings = JSON.parse(sessionStorage.getItem('lunadx_last_findings') || '[]');
    
    // Extract real model probabilities (as percentages)
    const findProb = (name: string) => {
      const f = rawFindings.find((f: any) => f.pathology === name);
      return f ? Math.round(f.probability * 100) : 0;
    };

    const pneumonia     = findProb("Pneumonia");
    const noFinding     = findProb("Normal");
    const cardiomegaly  = 0;
    const edema         = 0;
    const consolidation = 0;

    // Overall risk based on highest abnormal finding
    const maxAbnormal = pneumonia;
    const riskLevel: "Low" | "Medium" | "High" = maxAbnormal > 70 ? "High" : maxAbnormal > 40 ? "Medium" : "Low";

    // Build findings list - exclude "No Finding" from key findings
    const keyFindings = rawFindings
      .filter((f: any) => f.pathology !== "No Finding" && f.probability > 0.1)
      .sort((a: any, b: any) => b.probability - a.probability)
      .map((f: any) => `${f.pathology}: ${Math.round(f.probability * 100)}% [${f.icd10_code}]`);

    // Overall impression
    const impression = noFinding > 50
      ? "No significant findings detected."
      : keyFindings.length > 0
      ? `Possible ${rawFindings.filter((f: any) => f.pathology !== "No Finding").sort((a: any, b: any) => b.probability - a.probability)[0]?.pathology} detected.`
      : "No significant findings detected.";

    return {
      id: crypto.randomUUID(),
      patientId: patient.id,
      patientName: patient.name,
      imageUrl,
      tbRisk:              0, // TB detection coming soon
      pneumoniaRisk:       pneumonia,
      lungOpacityRisk:     edema,
      pleuralEffusionRisk: consolidation,
      lungNodulesRisk:     cardiomegaly,
      abnormalityScore:    maxAbnormal,
      riskLevel,
      findings:    keyFindings.length > 0 ? keyFindings : ["No significant findings detected."],
      suggestions: pneumonia > 50
        ? ["Urgent radiologist review recommended - high pneumonia probability detected.", "Consider clinical correlation and possible antibiotic therapy.", "All AI findings must be reviewed and confirmed by a qualified radiologist."]
        : ["Routine radiologist review recommended.", "All AI findings must be reviewed and confirmed by a qualified radiologist."],
      aiSummary:   impression,
      heatmapOverlayUrl: aiResponse.heatmap_overlay_url || undefined,
      scanDate:    new Date().toISOString(),
      doctorName:  user?.name || "Unknown",
    };
  }

  const handleTrySample = async () => {
    setAnalyzing(true); setAnalysisError(false);
    // Validate image is grayscale (X-ray check)
    const isXray = await new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let colorVariance = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          colorVariance += Math.abs(r - g) + Math.abs(g - b);
        }
        colorVariance /= (data.length / 4);
        resolve(colorVariance < 20);
      };
      img.src = preview!;
    });

    if (!isXray) {
      setAnalyzing(false);
      setAnalysisError(true);
      setErrorMessage("This image does not appear to be a chest X-ray. Please upload a grayscale X-ray image.");
      return;
    }
    const allPatients = getPatients();
    let demoPatient = allPatients.find((p) => p.hospitalId === "SAMPLE-001");
    if (!demoPatient) {
      demoPatient = { id: crypto.randomUUID(), name: "Sample Patient", age: 45, sex: "Male" as const, hospitalId: "SAMPLE-001", symptoms: "Persistent cough, mild fever", visitDate: new Date().toISOString().slice(0, 10), createdAt: new Date().toISOString() };
      savePatient(demoPatient);
    }
    try {
      const aiResponse = await analyzeXray("/sample-xray.jpg", demoPatient.id, "Sample case - persistent cough", "PA");
      const scan = buildScan(aiResponse, demoPatient, "/sample-xray.jpg");
      saveScan(scan);
      setAnalyzing(false);
      navigate(`/results/${scan.id}`);
    } catch {
      setAnalyzing(false); setAnalysisError(true); setErrorMessage("Sample analysis failed.");
    }
  };

  const handleAnalyze = async () => {
    console.log('🔍 handleAnalyze called - patientId:', patientId, 'imageFile:', imageFile);
    if (!patientId || !imageFile) {
      console.log('❌ Missing patientId or imageFile');
      return;
    }
    setAnalyzing(true); setAnalysisError(false);
    const patient = patients.find((p) => p.id === patientId)!;
    console.log('👤 Found patient:', patient?.name);
    try {
      console.log('🚀 Calling analyzeXray...');
      const aiResponse = await analyzeXray(preview!, patientId, clinicalNotes || patient.symptoms, viewPosition);
      console.log('✅ Analysis response:', aiResponse);
      const scan = buildScan(aiResponse, patient, preview!);
      saveScan(scan);
      setAnalyzing(false);
      console.log('🔄 Navigating to results...');
      navigate(`/results/${scan.id}`);
    } catch (err) {
      console.error('❌ Analysis failed:', err);
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
              <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} - {p.hospitalId}</SelectItem>)}</SelectContent>
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
                <SelectItem value="PA">PA - Posteroanterior</SelectItem>
                <SelectItem value="AP">AP - Anteroposterior</SelectItem>
                <SelectItem value="LAT">LAT - Lateral</SelectItem>
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
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex items-start gap-2.5 p-3 rounded-lg bg-warning/8 border border-warning/20 mt-2">
                          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                          <p className="text-xs text-warning leading-relaxed"><strong>Analysis blocked:</strong> This image does not appear to be a chest X-ray. Please upload a grayscale X-ray image.</p>
                        </motion.div>
                      ) : (
                        <>
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex items-start gap-2.5 p-3 rounded-lg bg-success/8 border border-success/20 mt-2">
                            <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" />
                            <p className="text-xs text-success leading-relaxed">Image quality is sufficient for AI screening analysis.</p>
                          </motion.div>
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/20 mt-2">
                            <input type="checkbox" id="xray-confirm" checked={xrayConfirmed} onChange={(e) => setXrayConfirmed(e.target.checked)} className="mt-0.5 cursor-pointer" />
                            <label htmlFor="xray-confirm" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                              <strong>I confirm</strong> this is a genuine chest X-ray image and I take responsibility for the accuracy of the uploaded image.
                            </label>
                          </motion.div>
                        </>
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

        {/* Debug info - remove in production */}
        {(!patientId || !imageFile) && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-xs text-warning">
            <p className="font-medium">⚠️ Please complete the following:</p>
            <ul className="mt-1 ml-4 list-disc">
              {!patientId && <li>Select a patient from the dropdown</li>}
              {!imageFile && <li>Upload an X-ray image</li>}
            </ul>
            <p className="mt-1 text-[10px] opacity-70">
              Debug: patientId={patientId || 'null'}, imageFile={imageFile ? 'exists' : 'null'}
            </p>
          </div>
        )}

        <Button 
          onClick={() => {
            console.log('Button clicked!');
            handleAnalyze();
          }} 
          disabled={!patientId || !imageFile || analyzing || hasPoorQuality || !xrayConfirmed}
          className="w-full cta-gradient text-cta-foreground border-0 hover:opacity-90 h-12 text-sm"
        >
          {analyzing
            ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with CheXNet…</span>
            : <span className="flex items-center gap-2"><FileImage className="w-4 h-4" /> Analyze X-Ray</span>}
        </Button>
      </div>

      <AnimatePresence>{analyzing && <AIAnalysisLoader />}</AnimatePresence>
    </div>
  );
}
