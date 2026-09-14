import { motion, AnimatePresence } from "framer-motion";
import { Shield, Activity, Brain, Scan, HeartPulse, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";

const steps = [
  { text: "Preprocessing chest X-ray image…", icon: Scan },
  { text: "Analyzing lung structures…", icon: Brain },
  { text: "Detecting abnormal regions…", icon: Activity },
  { text: "Evaluating TB markers…", icon: HeartPulse },
  { text: "Assessing pneumonia patterns…", icon: HeartPulse },
  { text: "Generating risk scores…", icon: BarChart3 },
  { text: "Compiling clinical report…", icon: Shield },
];

export default function AIAnalysisLoader() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Pace steps to fill ~4 seconds (matching the simulated delay)
    const stepInterval = setInterval(() => {
      setCurrentStep((s) => (s < steps.length - 1 ? s + 1 : s));
    }, 600);

    const progressInterval = setInterval(() => {
      setProgress((p) => {
        // Slow down as we approach 100 to feel more realistic
        if (p < 60) return p + 1.8;
        if (p < 85) return p + 0.8;
        if (p < 95) return p + 0.3;
        return p;
      });
    }, 50);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, []);

  const StepIcon = steps[currentStep].icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col items-center gap-6 p-10 max-w-sm text-center"
      >
        {/* Animated logo with pulse ring */}
        <div className="relative">
          {/* Outer pulse ring */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="absolute inset-0 rounded-2xl medical-gradient"
          />
          {/* Second pulse ring (offset) */}
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.15, 0, 0.15] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.3 }}
            className="absolute inset-0 rounded-2xl medical-gradient"
          />
          {/* Main icon */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            className="relative w-18 h-18 rounded-2xl medical-gradient flex items-center justify-center shadow-lg shadow-primary/25"
            style={{ width: 72, height: 72 }}
          >
            <Shield className="w-9 h-9 text-primary-foreground" />
          </motion.div>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-1">AI Screening in Progress</h2>
          <p className="text-xs text-muted-foreground">
            LunaDX is analyzing the chest X-ray using multi-condition detection
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full space-y-2">
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full cta-gradient"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.15, ease: "linear" }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground tabular-nums">{Math.round(progress)}%</p>
            <p className="text-[11px] text-muted-foreground">Step {currentStep + 1}/{steps.length}</p>
          </div>
        </div>

        {/* Step text with icon */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/15"
          >
            <StepIcon className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground">
              {steps[currentStep].text}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Completed steps indicator */}
        <div className="flex items-center gap-1.5">
          {steps.map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{
                scale: 1,
                backgroundColor: i <= currentStep ? "hsl(var(--primary))" : "hsl(var(--muted))",
              }}
              transition={{ delay: i * 0.1, duration: 0.2 }}
              className="w-2 h-2 rounded-full"
            />
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[260px]">
          AI-assisted screening for TB, pneumonia, lung opacity, pleural effusion, and lung nodules
        </p>
      </motion.div>
    </motion.div>
  );
}
