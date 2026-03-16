import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  UploadIcon, 
  BrainIcon, 
  ActivityIcon, 
  FileTextIcon,
  UsersIcon,
  ShieldIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  EyeIcon
} from "@/components/icons/CustomIcons";

/* ─── workflow steps ─── */
const STEPS = [
  {
    id: "login",
    label: "Sign In",
    icon: ShieldIcon,
    duration: 4000,
    title: "Doctor Signs In",
    subtitle: "Secure authentication with role-based access",
  },
  {
    id: "patient",
    label: "Patient",
    icon: UsersIcon,
    duration: 5000,
    title: "Select or Create Patient",
    subtitle: "Quick patient lookup or new record creation",
  },
  {
    id: "upload",
    label: "Upload",
    icon: UploadIcon,
    duration: 4000,
    title: "Upload Chest X-Ray",
    subtitle: "Supports JPG, PNG, and DICOM formats",
  },
  {
    id: "analysis",
    label: "AI Analysis",
    icon: BrainIcon,
    duration: 6000,
    title: "AI Analysis In Progress",
    subtitle: "Evaluating lung regions for abnormalities…",
  },
  {
    id: "results",
    label: "Results",
    icon: ActivityIcon,
    duration: 7000,
    title: "Risk Assessment & Heatmap",
    subtitle: "TB & Pneumonia risk scores with visual overlay",
  },
  {
    id: "report",
    label: "Report",
    icon: FileTextIcon,
    duration: 5000,
    title: "Download Clinical Report",
    subtitle: "Structured PDF with findings and next steps",
  },
];

const TOTAL_DURATION = STEPS.reduce((a, s) => a + s.duration, 0);

/* ─── mock sub-components ─── */
function LoginScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
        <ShieldIcon className="w-7 h-7 text-primary-foreground" />
      </div>
      <div className="w-full max-w-[260px] space-y-3">
        <MockInput label="Email" value="dr.amoah@clinic.gh" />
        <MockInput label="Password" value="••••••••" />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <div className="w-full h-9 rounded-md bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold mt-2 cursor-pointer">
            <AnimatedClick delay={2}>Sign In <ChevronRightIcon className="w-3.5 h-3.5 ml-1" /></AnimatedClick>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function PatientScreen() {
  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Patients</span>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.5, type: "spring" }}>
          <div className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[10px] font-semibold flex items-center gap-1">
            <UsersIcon className="w-3 h-3" /> New Patient
          </div>
        </motion.div>
      </div>
      <div className="space-y-2 flex-1">
        {[
          { name: "Kwame Asante", age: 45, id: "PT-1042" },
          { name: "Abena Mensah", age: 32, id: "PT-1043", selected: true },
          { name: "Kofi Boateng", age: 58, id: "PT-1044" },
        ].map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.2 }}
            className={`flex items-center gap-3 p-3 rounded-lg border text-xs ${
              p.selected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border"
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
              {p.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">{p.name}</p>
              <p className="text-muted-foreground">{p.id} · Age {p.age}</p>
            </div>
            {p.selected && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2 }}>
                <CheckCircleIcon className="w-4 h-4 text-primary" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function UploadScreen() {
  const [uploaded, setUploaded] = useState(false);
  useEffect(() => { const t = setTimeout(() => setUploaded(true), 2000); return () => clearTimeout(t); }, []);
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 gap-4">
      <AnimatePresence mode="wait">
        {!uploaded ? (
          <motion.div key="drop" className="w-full max-w-[280px] border-2 border-dashed border-primary/40 rounded-xl p-8 flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
            <UploadIcon className="w-10 h-10 text-primary/60" />
            <p className="text-xs text-muted-foreground text-center">Drag & drop chest X-ray<br />or click to browse</p>
            <motion.div className="text-[10px] text-primary font-medium" animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              Uploading chest_xray_PA.jpg…
            </motion.div>
          </motion.div>
        ) : (
          <motion.div key="done" className="flex flex-col items-center gap-3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircleIcon className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-sm font-semibold text-foreground">X-Ray Uploaded</p>
            <p className="text-xs text-muted-foreground">chest_xray_PA.jpg · 2.4 MB</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnalysisScreen() {
  const [progress, setProgress] = useState(0);
  const messages = ["Preprocessing image…", "Evaluating TB markers…", "Scanning for pneumonia…", "Generating heatmap…", "Finalizing risk scores…"];
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const p = setInterval(() => setProgress(prev => Math.min(prev + 2, 100)), 100);
    const m = setInterval(() => setMsgIdx(prev => Math.min(prev + 1, messages.length - 1)), 1100);
    return () => { clearInterval(p); clearInterval(m); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 gap-5">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
        <BrainIcon className="w-12 h-12 text-primary" />
      </motion.div>
      <div className="w-full max-w-[260px] space-y-3">
        <Progress value={progress} className="h-2" />
        <AnimatePresence mode="wait">
          <motion.p key={msgIdx} className="text-xs text-center text-muted-foreground" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
            {messages[msgIdx]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ResultsScreen() {
  const [showHeatmap, setShowHeatmap] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShowHeatmap(true), 3000); return () => clearTimeout(t); }, []);

  return (
    <div className="flex flex-col h-full p-4 gap-3 overflow-hidden">
      <div className="flex gap-3 flex-1 min-h-0">
        {/* X-ray / Heatmap */}
        <div className="flex-1 rounded-lg bg-gray-900 relative overflow-hidden flex items-center justify-center">
          <div className="text-center text-gray-500 text-[10px]">
            <EyeIcon className="w-8 h-8 mx-auto mb-1 text-gray-600" />
            Chest X-Ray PA View
          </div>
          <AnimatePresence>
            {showHeatmap && (
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ duration: 1 }}
              >
                <div className="absolute top-[20%] left-[25%] w-[30%] h-[35%] rounded-full bg-red-500/40 blur-xl" />
                <div className="absolute top-[25%] right-[20%] w-[25%] h-[30%] rounded-full bg-orange-400/30 blur-xl" />
                <div className="absolute bottom-[20%] left-[30%] w-[20%] h-[20%] rounded-full bg-yellow-400/25 blur-lg" />
              </motion.div>
            )}
          </AnimatePresence>
          {/* Toggle */}
          <motion.div
            className="absolute bottom-2 left-2 right-2 flex items-center justify-between"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
          >
            <AnimatedClick delay={2.8}>
              <div className={`text-[9px] px-2 py-1 rounded font-medium ${showHeatmap ? "bg-red-500/80 text-white" : "bg-white/20 text-white/70"}`}>
                {showHeatmap ? "Heatmap ON" : "Heatmap OFF"}
              </div>
            </AnimatedClick>
          </motion.div>
        </div>

        {/* Scores */}
        <div className="w-[140px] space-y-2 shrink-0">
          <ScoreCard label="TB Risk" value={72} color="text-red-500" delay={0.5} />
          <ScoreCard label="Pneumonia" value={45} color="text-orange-500" delay={0.8} />
          <ScoreCard label="Abnormality" value={68} color="text-amber-500" delay={1.1} />
          <motion.div
            className="p-2 rounded-lg border border-border bg-background"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          >
            <p className="text-[9px] font-semibold text-foreground mb-1">Key Findings</p>
            <ul className="text-[8px] text-muted-foreground space-y-0.5">
              <li>• Right upper lobe opacity</li>
              <li>• Possible consolidation</li>
              <li>• Follow-up recommended</li>
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function ReportScreen() {
  const [downloaded, setDownloaded] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDownloaded(true), 3000); return () => clearTimeout(t); }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 gap-4">
      <motion.div
        className="w-[180px] bg-background border border-border rounded-lg p-4 shadow-md"
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <FileTextIcon className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-semibold text-foreground">Clinical Report</span>
        </div>
        <div className="space-y-1.5">
          {["Patient: Abena Mensah", "Date: 2026-03-08", "TB Risk: 72% (High)", "Pneumonia: 45% (Moderate)", "Recommendation: Confirm with sputum test"].map((line, i) => (
            <motion.div key={i} className="h-2 rounded-full bg-muted" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ delay: 0.8 + i * 0.2 }}>
              <p className="text-[7px] text-muted-foreground truncate px-1 leading-[8px]">{line}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <AnimatedClick delay={2.5}>
        <motion.div
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
            downloaded ? "bg-green-500/10 text-green-600" : "bg-primary text-primary-foreground"
          }`}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
        >
          {downloaded ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <RotateCcwIcon className="w-3.5 h-3.5" />}
          {downloaded ? "Downloaded!" : "Download PDF"}
        </motion.div>
      </AnimatedClick>
    </div>
  );
}

/* ─── helpers ─── */
function MockInput({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <div className="h-8 rounded-md border border-border bg-muted/50 px-2.5 flex items-center text-xs text-foreground">{value}</div>
    </div>
  );
}

function ScoreCard({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
  return (
    <motion.div className="p-2 rounded-lg border border-border bg-background" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}>
      <p className="text-[9px] text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}%</p>
    </motion.div>
  );
}

function AnimatedClick({ children, delay = 1 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div className="relative inline-flex items-center">
      {children}
      <motion.div
        className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full border-2 border-primary bg-primary/20"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1, 0], opacity: [0, 1, 1, 0] }}
        transition={{ delay, duration: 0.8 }}
      />
    </motion.div>
  );
}

const SCREEN_MAP: Record<string, React.FC> = {
  login: LoginScreen,
  patient: PatientScreen,
  upload: UploadScreen,
  analysis: AnalysisScreen,
  results: ResultsScreen,
  report: ReportScreen,
};

/* ─── main component ─── */
export default function PrototypeDemo() {
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // auto-play on scroll into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !playing && elapsed === 0) setPlaying(true); },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [playing, elapsed]);

  const tick = useCallback(() => {
    setElapsed(prev => {
      const next = prev + 100;
      if (next >= TOTAL_DURATION) {
        setPlaying(false);
        return TOTAL_DURATION;
      }
      // determine step
      let acc = 0;
      for (let i = 0; i < STEPS.length; i++) {
        acc += STEPS[i].duration;
        if (next < acc) { setCurrentStep(i); break; }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(tick, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, tick]);

  const togglePlay = () => {
    if (elapsed >= TOTAL_DURATION) {
      setElapsed(0);
      setCurrentStep(0);
      setPlaying(true);
    } else {
      setPlaying(!playing);
    }
  };

  const restart = () => {
    setElapsed(0);
    setCurrentStep(0);
    setPlaying(true);
  };

  const step = STEPS[currentStep];
  const Screen = SCREEN_MAP[step.id];
  const overallProgress = (elapsed / TOTAL_DURATION) * 100;

  return (
    <div ref={containerRef} className="w-full max-w-4xl mx-auto">
      {/* Mock browser window */}
      <div className="rounded-2xl border border-border shadow-xl overflow-hidden bg-background">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 border-b border-border">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-4 py-1 rounded-md bg-background border border-border text-[10px] text-muted-foreground">
              lunadx.ai
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-4 py-3 bg-muted/30 border-b border-border overflow-x-auto">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === currentStep;
            const isDone = i < currentStep;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : isDone
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {isDone ? <CheckCircleIcon className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Screen area */}
        <div className="aspect-video relative bg-background overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              className="absolute inset-0"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4 }}
            >
              <Screen />
            </motion.div>
          </AnimatePresence>

          {/* Step label overlay */}
          <motion.div
            className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none"
            key={step.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-sm">
              <p className="text-xs font-semibold text-foreground">{step.title}</p>
              <p className="text-[10px] text-muted-foreground">{step.subtitle}</p>
            </div>
          </motion.div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-t border-border">
          <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity">
            {elapsed >= TOTAL_DURATION ? (
              <RotateCcwIcon className="w-3.5 h-3.5" />
            ) : playing ? (
              <PauseIcon className="w-3.5 h-3.5" />
            ) : (
              <PlayIcon className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>
          <div className="flex-1">
            <Progress value={overallProgress} className="h-1.5" />
          </div>
          <button onClick={restart} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            <RotateCcwIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
