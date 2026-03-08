import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Upload, FileImage, X } from "lucide-react";
import { getPatients, getCurrentUser, simulateAI, saveScan, type ScanResult } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function UploadPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const patients = getPatients();
  const user = getCurrentUser();

  const [patientId, setPatientId] = useState(searchParams.get("patientId") || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!patientId || !imageFile) return;
    setAnalyzing(true);
    // Simulate AI processing delay
    await new Promise((r) => setTimeout(r, 2000));
    const patient = patients.find((p) => p.id === patientId)!;
    const ai = simulateAI();
    const scan: ScanResult = {
      id: crypto.randomUUID(),
      patientId,
      patientName: patient.name,
      imageUrl: preview!,
      ...ai,
      scanDate: new Date().toISOString(),
      doctorName: user?.name || "Unknown",
    };
    saveScan(scan);
    setAnalyzing(false);
    navigate(`/results/${scan.id}`);
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground mb-1">Upload Chest X-Ray</h1>
      <p className="text-sm text-muted-foreground mb-8">Select a patient and upload their chest X-ray for AI screening analysis.</p>

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
              <button onClick={() => { setImageFile(null); setPreview(null); }} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-foreground/80 flex items-center justify-center hover:bg-foreground transition-colors">
                <X className="w-4 h-4 text-background" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`mt-2 border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <Upload className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Drop X-ray image here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG formats</p>
              <input id="file-input" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          )}
        </div>

        <Button onClick={handleAnalyze} disabled={!patientId || !imageFile || analyzing} className="w-full medical-gradient text-primary-foreground border-0 hover:opacity-90 h-12 text-sm">
          {analyzing ? (
            <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Analyzing X-Ray...</span>
          ) : (
            <span className="flex items-center gap-2"><FileImage className="w-4 h-4" /> Analyze X-Ray</span>
          )}
        </Button>
      </div>
    </div>
  );
}
