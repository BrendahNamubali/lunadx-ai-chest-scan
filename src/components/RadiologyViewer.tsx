import { useState, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Layers, Activity, Stethoscope, BrainCircuit, ShieldAlert, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { ScanResult } from "@/lib/store";
import RiskBadge from "@/components/RiskBadge";

interface RadiologyViewerProps {
  scan: ScanResult;
  aiConfidence: number;
}

export default function RadiologyViewer({ scan, aiConfidence }: RadiologyViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showLungOutline, setShowLungOutline] = useState(false);
  const [radiologyMode, setRadiologyMode] = useState(false);

  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const resetView = () => { setZoom(1); setPanX(0); setPanY(0); };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  }, [zoom, panX, panY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const riskColor = scan.riskLevel === "High" ? "text-destructive" : scan.riskLevel === "Medium" ? "text-warning" : "text-success";
  const riskBg = scan.riskLevel === "High" ? "bg-destructive" : scan.riskLevel === "Medium" ? "bg-warning" : "bg-success";

  const scores = [
    { label: "TB Risk", value: scan.tbRisk, icon: Activity },
    { label: "Pneumonia", value: scan.pneumoniaRisk, icon: Stethoscope },
    { label: "AI Confidence", value: aiConfidence, icon: BrainCircuit, isPrimary: true },
  ];

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-[hsl(220,20%,8%)]">
      <div className="flex flex-col lg:flex-row">
        {/* Main Viewer Panel */}
        <div className="flex-1 relative">
          {/* Toolbar */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 bg-black/50 hover:bg-black/70 text-white/80 hover:text-white backdrop-blur-sm"
              onClick={zoomIn}
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 bg-black/50 hover:bg-black/70 text-white/80 hover:text-white backdrop-blur-sm"
              onClick={zoomOut}
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 bg-black/50 hover:bg-black/70 text-white/80 hover:text-white backdrop-blur-sm"
              onClick={resetView}
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <div className="ml-1 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-[10px] font-mono text-white/60">
              {Math.round(zoom * 100)}%
            </div>
          </div>

          {/* Overlay Toggles */}
          <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm">
              <Switch
                id="heatmap"
                checked={showHeatmap}
                onCheckedChange={setShowHeatmap}
                className="scale-75 data-[state=checked]:bg-destructive"
              />
              <Label htmlFor="heatmap" className="text-[10px] text-white/70 cursor-pointer">
                AI Heatmap
              </Label>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm">
              <Switch
                id="outline"
                checked={showLungOutline}
                onCheckedChange={setShowLungOutline}
                className="scale-75 data-[state=checked]:bg-info"
              />
              <Label htmlFor="outline" className="text-[10px] text-white/70 cursor-pointer">
                Lung Outline
              </Label>
            </div>
          </div>

          {/* Image Container */}
          <div
            className="relative h-[420px] lg:h-[480px] overflow-hidden select-none"
            style={{ cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              className="w-full h-full flex items-center justify-center transition-transform duration-150"
              style={{
                transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
              }}
            >
              <img
                src={scan.imageUrl}
                alt="Chest X-ray"
                className="max-w-full max-h-full object-contain"
                draggable={false}
              />

              {/* Heatmap Overlay */}
              {showHeatmap && scan.riskLevel !== "Low" && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    className="absolute w-32 h-36 rounded-full bg-gradient-radial from-destructive/40 to-transparent blur-2xl"
                    style={{ top: "25%", left: "30%" }}
                  />
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    transition={{ delay: 0.15 }}
                    className="absolute w-24 h-28 rounded-full bg-gradient-radial from-warning/35 to-transparent blur-xl"
                    style={{ top: "35%", right: "28%" }}
                  />
                  {scan.tbRisk > 60 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.5 }}
                      transition={{ delay: 0.3 }}
                      className="absolute w-16 h-20 rounded-full bg-gradient-radial from-destructive/50 to-transparent blur-lg"
                      style={{ top: "20%", left: "40%" }}
                    />
                  )}
                </div>
              )}

              {/* Lung Outline Overlay */}
              {showLungOutline && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <svg
                    viewBox="0 0 400 420"
                    className="w-full h-full max-w-[360px] max-h-[400px]"
                    style={{ position: "absolute" }}
                  >
                    {/* Right lung */}
                    <motion.path
                      d="M 120 100 C 80 120, 60 200, 70 280 C 80 340, 120 360, 160 350 C 185 340, 195 300, 195 240 C 195 180, 180 120, 160 100 Z"
                      fill="none"
                      stroke="hsl(199, 80%, 50%)"
                      strokeWidth="1.5"
                      strokeDasharray="6 3"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 0.7 }}
                      transition={{ duration: 1.2 }}
                    />
                    {/* Left lung */}
                    <motion.path
                      d="M 280 100 C 320 120, 340 200, 330 280 C 320 340, 280 360, 240 350 C 215 340, 205 300, 205 240 C 205 180, 220 120, 240 100 Z"
                      fill="none"
                      stroke="hsl(199, 80%, 50%)"
                      strokeWidth="1.5"
                      strokeDasharray="6 3"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 0.7 }}
                      transition={{ duration: 1.2, delay: 0.2 }}
                    />
                    {/* Labels */}
                    <text x="115" y="90" fill="hsl(199, 80%, 60%)" fontSize="10" fontFamily="Inter">R</text>
                    <text x="278" y="90" fill="hsl(199, 80%, 60%)" fontSize="10" fontFamily="Inter">L</text>
                  </svg>
                </div>
              )}
            </div>

            {/* Bottom info bar */}
            <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between text-[10px] text-white/50 font-mono">
                <span>{scan.patientName} · {new Date(scan.scanDate).toLocaleDateString()}</span>
                <div className="flex items-center gap-3">
                  {showHeatmap && <span className="text-destructive/80">● Heatmap</span>}
                  {showLungOutline && <span className="text-info/80">● Outline</span>}
                  <span>W: 400 / L: 40</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="lg:w-56 border-t lg:border-t-0 lg:border-l border-white/10 bg-[hsl(220,20%,10%)] p-4 space-y-4">
          {/* Risk Classification */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldAlert className="w-3.5 h-3.5 text-white/50" />
              <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Classification</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${riskBg} ${scan.riskLevel === "High" ? "animate-pulse-soft" : ""}`} />
              <span className={`text-sm font-bold ${riskColor}`}>{scan.riskLevel} Risk</span>
            </div>
          </div>

          <div className="border-t border-white/10" />

          {/* Score Cards */}
          {scores.map((score) => {
            const color = score.isPrimary
              ? "text-primary"
              : score.value > 70
              ? "text-destructive"
              : score.value > 40
              ? "text-warning"
              : "text-success";
            const barColor = score.isPrimary
              ? "bg-primary"
              : score.value > 70
              ? "bg-destructive"
              : score.value > 40
              ? "bg-warning"
              : "bg-success";

            return (
              <div key={score.label}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <score.icon className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-[10px] font-medium text-white/50 uppercase tracking-wide">{score.label}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score.value}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full ${barColor}`}
                    />
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${color}`}>{score.value}%</span>
                </div>
              </div>
            );
          })}

          <div className="border-t border-white/10" />

          {/* Additional Scores */}
          <div>
            <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2 block">Other Findings</span>
            <div className="space-y-2">
              {[
                { label: "Lung Opacity", value: scan.lungOpacityRisk ?? 0 },
                { label: "Pleural Effusion", value: scan.pleuralEffusionRisk ?? 0 },
                { label: "Lung Nodules", value: scan.lungNodulesRisk ?? 0 },
              ].map((item) => {
                const c = item.value > 70 ? "text-destructive" : item.value > 40 ? "text-warning" : "text-success";
                return (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[11px] text-white/40">{item.label}</span>
                    <span className={`text-xs font-bold tabular-nums ${c}`}>{item.value}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/10" />

          {/* Abnormality Score */}
          <div className="text-center">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">Abnormality Score</span>
            <p className={`text-2xl font-bold mt-1 ${
              scan.abnormalityScore > 70 ? "text-destructive" : scan.abnormalityScore > 40 ? "text-warning" : "text-success"
            }`}>
              {scan.abnormalityScore}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
