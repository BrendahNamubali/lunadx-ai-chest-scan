import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, FileImage, Activity, Stethoscope, TrendingUp, ShieldAlert, ShieldCheck, ShieldMinus } from "lucide-react";
import { motion } from "framer-motion";
import { saveScan, savePatient, getPatients, getCurrentUser, type ScanResult, type Patient } from "@/lib/store";
import RiskBadge from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface DemoCase {
  title: string;
  description: string;
  patient: Omit<Patient, "id" | "createdAt">;
  scan: Omit<ScanResult, "id" | "patientId" | "patientName" | "imageUrl" | "scanDate" | "doctorName">;
  riskIcon: React.ElementType;
}

const DEMO_CASES: DemoCase[] = [
  {
    title: "Normal Chest X-Ray",
    description: "Healthy adult with no significant pulmonary findings. Routine screening case demonstrating low-risk AI classification.",
    patient: { name: "John Mwangi", age: 34, sex: "Male", hospitalId: "DEMO-001", symptoms: "Routine checkup, no complaints", visitDate: new Date().toISOString().slice(0, 10) },
    scan: {
      tbRisk: 8,
      pneumoniaRisk: 5,
      lungOpacityRisk: 4,
      pleuralEffusionRisk: 3,
      lungNodulesRisk: 6,
      abnormalityScore: 7,
      riskLevel: "Low",
      findings: ["No significant abnormalities detected", "Heart size within normal limits"],
      suggestions: ["Routine follow-up recommended", "No immediate intervention required"],
    },
    riskIcon: ShieldCheck,
  },
  {
    title: "Suspected Tuberculosis",
    description: "Patient presenting with persistent cough and weight loss. AI screening identifies upper lobe cavitary lesion consistent with TB.",
    patient: { name: "Amina Osei", age: 28, sex: "Female", hospitalId: "DEMO-002", symptoms: "Persistent cough (3 weeks), night sweats, weight loss", visitDate: new Date().toISOString().slice(0, 10) },
    scan: {
      tbRisk: 87,
      pneumoniaRisk: 22,
      lungOpacityRisk: 74,
      pleuralEffusionRisk: 18,
      lungNodulesRisk: 45,
      abnormalityScore: 82,
      riskLevel: "High",
      findings: ["Cavitary lesion in left upper lobe", "Opacity detected in upper right lobe", "Miliary pattern observed"],
      suggestions: ["Recommend sputum AFB smear and culture", "Consider GeneXpert MTB/RIF test", "Suggest CT scan for detailed evaluation", "Refer to radiologist for confirmation"],
    },
    riskIcon: ShieldAlert,
  },
  {
    title: "Pneumonia Case",
    description: "Elderly patient with fever and dyspnea. AI screening detects bilateral consolidation and pleural effusion suggestive of pneumonia.",
    patient: { name: "Robert Kamau", age: 62, sex: "Male", hospitalId: "DEMO-003", symptoms: "High fever, shortness of breath, productive cough", visitDate: new Date().toISOString().slice(0, 10) },
    scan: {
      tbRisk: 15,
      pneumoniaRisk: 78,
      abnormalityScore: 71,
      riskLevel: "High",
      findings: ["Patchy consolidation in right middle lobe", "Pleural effusion suspected in left lower zone", "Bilateral hilar lymphadenopathy noted"],
      suggestions: ["Initiate empiric antibiotic therapy pending results", "Suggest CT scan for detailed evaluation", "Schedule follow-up imaging in 2 weeks", "Refer to radiologist for confirmation"],
    },
    riskIcon: ShieldMinus,
  },
];

function RiskMeter({ label, value }: { label: string; value: number }) {
  const color = value > 70 ? "text-destructive" : value > 40 ? "text-warning" : "text-success";
  const bg = value > 70 ? "bg-destructive" : value > 40 ? "bg-warning" : "bg-success";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-20">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${bg}`}
        />
      </div>
      <span className={`text-xs font-semibold w-10 text-right ${color}`}>{value}%</span>
    </div>
  );
}

export default function DemoCasesPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const loadDemoCase = (demo: DemoCase) => {
    // Ensure patient exists
    const existing = getPatients().find((p) => p.hospitalId === demo.patient.hospitalId);
    const patientId = existing?.id || crypto.randomUUID();
    if (!existing) {
      savePatient({ ...demo.patient, id: patientId, createdAt: new Date().toISOString() });
    }

    const scan: ScanResult = {
      id: crypto.randomUUID(),
      patientId,
      patientName: demo.patient.name,
      imageUrl: "/placeholder.svg",
      ...demo.scan,
      scanDate: new Date().toISOString(),
      doctorName: user?.name || "Demo Doctor",
    };
    saveScan(scan);
    toast.success(`Demo case "${demo.title}" loaded`);
    navigate(`/results/${scan.id}`);
  };

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Demo Cases</h1>
          <p className="text-xs text-muted-foreground">Preloaded clinical scenarios for platform demonstration</p>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-primary/5 border border-primary/15 text-xs text-muted-foreground mb-6">
        <strong className="text-foreground">ℹ️ Demo Mode:</strong> These cases use simulated patient data and AI screening results. Select a case to generate a full report you can explore.
      </div>

      {/* Case Cards */}
      <div className="space-y-4">
        {DEMO_CASES.map((demo, i) => (
          <motion.div
            key={demo.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    demo.scan.riskLevel === "High" ? "bg-destructive/10" : demo.scan.riskLevel === "Medium" ? "bg-warning/10" : "bg-success/10"
                  }`}>
                    <demo.riskIcon className={`w-6 h-6 ${
                      demo.scan.riskLevel === "High" ? "text-destructive" : demo.scan.riskLevel === "Medium" ? "text-warning" : "text-success"
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-bold text-foreground">{demo.title}</h3>
                      <RiskBadge level={demo.scan.riskLevel} />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">{demo.description}</p>

                    {/* Patient Info */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                      <span><strong className="text-foreground">Patient:</strong> {demo.patient.name}</span>
                      <span>{demo.patient.age}y, {demo.patient.sex}</span>
                      <span>ID: {demo.patient.hospitalId}</span>
                    </div>

                    {/* Risk Meters */}
                    <div className="space-y-1.5 mb-4 max-w-sm">
                      <RiskMeter label="TB Risk" value={demo.scan.tbRisk} />
                      <RiskMeter label="Pneumonia" value={demo.scan.pneumoniaRisk} />
                      <RiskMeter label="Abnormality" value={demo.scan.abnormalityScore} />
                    </div>

                    {/* Findings preview */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {demo.scan.findings.slice(0, 2).map((f, j) => (
                        <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {f}
                        </span>
                      ))}
                      {demo.scan.findings.length > 2 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          +{demo.scan.findings.length - 2} more
                        </span>
                      )}
                    </div>

                    <Button size="sm" onClick={() => loadDemoCase(demo)}>
                      <Play className="w-3.5 h-3.5 mr-1" /> Load & View Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
