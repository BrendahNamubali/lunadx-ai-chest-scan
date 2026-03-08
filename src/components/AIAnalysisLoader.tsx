import { motion, AnimatePresence } from "framer-motion";
import { Shield, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const steps = [
  "Preprocessing chest X-ray image…",
  "Analyzing chest X-ray…",
  "Detecting lung regions…",
  "Evaluating TB markers…",
  "Assessing pneumonia patterns…",
  "Generating risk scores…",
];

export default function AIAnalysisLoader() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((s) => (s < steps.length - 1 ? s + 1 : s));
    }, 350);
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 1.2, 95));
    }, 40);
    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-5 p-8 max-w-sm text-center">
        {/* Spinning logo */}
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-16 h-16 rounded-2xl medical-gradient flex items-center justify-center"
          >
            <Shield className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          {/* Orbiting dot */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="absolute inset-0"
            style={{ transformOrigin: "center center" }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-accent shadow-lg shadow-accent/40" />
          </motion.div>
        </div>

        {/* Progress bar */}
        <div className="w-full">
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full cta-gradient"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 tabular-nums">{Math.round(progress)}%</p>
        </div>

        {/* Step text */}
        <AnimatePresence mode="wait">
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="text-sm font-medium text-foreground"
          >
            {steps[currentStep]}
          </motion.p>
        </AnimatePresence>

        <p className="text-xs text-muted-foreground">
          AI model is processing the scan. This usually takes a few seconds.
        </p>
      </div>
    </motion.div>
  );
}
