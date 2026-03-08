import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Camera, Upload, FileImage, X, AlertTriangle, Loader2, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getPatients, getCurrentUser, analyzeXray, simulateAI, saveScan, type ScanResult } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function MobileUploadPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const patients = getPatients();
  const user = getCurrentUser();

  const [patientId, setPatientId] = useState(searchParams.get("patientId") || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const clearImage = () => {
    setImageFile(null);
    setPreview(null);
  };

  const handleAnalyze = async () => {
    if (!patientId || !imageFile) return;
    setAnalyzing(true);
    const patient = patients.find((p) => p.id === patientId)!;

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
      doctorNotes: clinicalNotes || undefined,
    };
    saveScan(scan);
    setAnalyzing(false);
    navigate(`/results/${scan.id}`);
  };

  return (
    <div className="animate-fade-in max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Mobile Screening Upload</h1>
          <p className="text-xs text-muted-foreground">Capture or upload chest X-ray for AI analysis</p>
        </div>
      </div>

      {/* Notice */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/15 text-[11px] text-muted-foreground mb-6">
        <strong className="text-foreground">ℹ️</strong> Mobile capture is intended for screening support in clinics without digital radiology systems.
      </div>

      <div className="space-y-5">
        {/* Patient Select */}
        <div>
          <Label className="text-sm">Select Patient</Label>
          {patients.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">
              No patients registered.{" "}
              <button onClick={() => navigate("/patients")} className="text-primary hover:underline">Add a patient first</button>.
            </p>
          ) : (
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger className="mt-1.5 h-12 text-base">
                <SelectValue placeholder="Choose patient..." />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} — {p.hospitalId}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Capture / Upload Area */}
        <div>
          <Label className="text-sm">Capture or Upload X-Ray Image</Label>

          {preview ? (
            <div className="mt-2 relative rounded-xl overflow-hidden border">
              <img src={preview} alt="X-ray preview" className="w-full max-h-80 object-contain bg-foreground/5" />
              <button
                onClick={clearImage}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-foreground/80 flex items-center justify-center hover:bg-foreground transition-colors"
              >
                <X className="w-4 h-4 text-background" />
              </button>
            </div>
          ) : (
            <div className="mt-2 space-y-3">
              {/* Camera capture button */}
              <Button
                variant="outline"
                className="w-full h-20 border-2 border-dashed flex flex-col gap-1"
                onClick={() => document.getElementById("camera-input")?.click()}
              >
                <Camera className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium">Capture Image</span>
                <span className="text-[10px] text-muted-foreground">Use device camera to photograph X-ray film</span>
              </Button>
              <input
                id="camera-input"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />

              {/* File upload button */}
              <Button
                variant="outline"
                className="w-full h-14 flex gap-2"
                onClick={() => document.getElementById("file-input-mobile")?.click()}
              >
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm">Upload from Device</span>
              </Button>
              <input
                id="file-input-mobile"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          )}
        </div>

        {/* Clinical Notes (optional) */}
        <div>
          <Label className="text-sm">Clinical Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            className="mt-1.5 text-base min-h-[80px]"
            placeholder="Add any clinical observations or context..."
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
          />
        </div>

        {/* Analyze Button */}
        <Button
          onClick={handleAnalyze}
          disabled={!patientId || !imageFile || analyzing}
          className="w-full cta-gradient text-cta-foreground border-0 hover:opacity-90 h-14 text-base"
        >
          {analyzing ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Analyzing X-Ray...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <FileImage className="w-5 h-5" /> Run AI Screening
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
