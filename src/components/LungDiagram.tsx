import { motion } from "framer-motion";
import type { ScanResult } from "@/lib/store";

interface LungDiagramProps {
  scan: ScanResult;
}

// Zone definitions for the lung diagram with anatomical regions
const lungZones = [
  { id: "right-upper", label: "Right Upper Lobe", cx: 138, cy: 115, rx: 42, ry: 35 },
  { id: "right-middle", label: "Right Middle Lobe", cx: 130, cy: 175, rx: 38, ry: 28 },
  { id: "right-lower", label: "Right Lower Lobe", cx: 135, cy: 230, rx: 40, ry: 35 },
  { id: "left-upper", label: "Left Upper Lobe", cx: 262, cy: 115, rx: 42, ry: 35 },
  { id: "left-middle", label: "Left Middle Lobe", cx: 270, cy: 175, rx: 38, ry: 28 },
  { id: "left-lower", label: "Left Lower Lobe", cx: 265, cy: 230, rx: 40, ry: 35 },
];

function getZoneStatus(scan: ScanResult) {
  // Deterministic mapping based on scan findings to highlight specific zones
  const findings = scan.findings.join(" ").toLowerCase();
  const zones: Record<string, { affected: boolean; severity: "low" | "medium" | "high" }> = {};

  lungZones.forEach((z) => {
    let affected = false;
    let severity: "low" | "medium" | "high" = "low";

    if (z.id === "right-upper" && (findings.includes("upper right") || findings.includes("cavitary"))) {
      affected = true;
      severity = scan.tbRisk > 70 ? "high" : "medium";
    }
    if (z.id === "right-middle" && (findings.includes("right middle") || findings.includes("consolidation"))) {
      affected = true;
      severity = scan.pneumoniaRisk > 70 ? "high" : "medium";
    }
    if (z.id === "right-lower" && findings.includes("pleural")) {
      affected = true;
      severity = "medium";
    }
    if (z.id === "left-upper" && (findings.includes("left upper") || findings.includes("miliary"))) {
      affected = true;
      severity = scan.tbRisk > 70 ? "high" : "medium";
    }
    if (z.id === "left-middle" && findings.includes("hilar")) {
      affected = true;
      severity = "medium";
    }
    if (z.id === "left-lower" && (findings.includes("left lower") || findings.includes("effusion"))) {
      affected = true;
      severity = scan.pneumoniaRisk > 60 ? "high" : "medium";
    }

    // If high risk overall but no specific zone matched, highlight some zones
    if (!affected && scan.riskLevel === "High") {
      const hash = z.id.charCodeAt(0) + z.id.charCodeAt(z.id.length - 1);
      if (hash % 3 === 0) {
        affected = true;
        severity = "medium";
      }
    }

    zones[z.id] = { affected, severity };
  });

  return zones;
}

const severityColors = {
  low: { fill: "hsl(152, 55%, 42%)", opacity: 0.15, stroke: "hsl(152, 55%, 42%)" },
  medium: { fill: "hsl(38, 92%, 50%)", opacity: 0.3, stroke: "hsl(38, 92%, 50%)" },
  high: { fill: "hsl(0, 72%, 51%)", opacity: 0.35, stroke: "hsl(0, 72%, 51%)" },
};

export default function LungDiagram({ scan }: LungDiagramProps) {
  const zoneStatus = getZoneStatus(scan);
  const affectedCount = Object.values(zoneStatus).filter((z) => z.affected).length;

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Lung Zone Analysis</h2>
        <span className="text-xs text-muted-foreground">
          {affectedCount} / {lungZones.length} zones affected
        </span>
      </div>

      <div className="relative bg-muted/30 rounded-xl p-4 flex justify-center">
        <svg viewBox="0 0 400 320" className="w-full max-w-[360px]" aria-label="Lung diagram">
          {/* Trachea */}
          <path
            d="M200 20 L200 65"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            opacity="0.4"
          />
          {/* Bronchi */}
          <path
            d="M200 65 Q180 80 150 90"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            opacity="0.3"
          />
          <path
            d="M200 65 Q220 80 250 90"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            opacity="0.3"
          />

          {/* Right Lung Outline */}
          <path
            d="M95 75 Q80 75 75 95 Q65 140 70 190 Q75 250 100 275 Q130 295 165 285 Q185 275 190 250 Q195 200 195 170 Q195 120 190 90 Q185 75 170 72 Q140 68 95 75 Z"
            fill="hsl(var(--primary) / 0.06)"
            stroke="hsl(var(--primary))"
            strokeWidth="1.5"
            opacity="0.6"
          />
          {/* Left Lung Outline */}
          <path
            d="M305 75 Q320 75 325 95 Q335 140 330 190 Q325 250 300 275 Q270 295 235 285 Q215 275 210 250 Q205 200 205 170 Q205 120 210 90 Q215 75 230 72 Q260 68 305 75 Z"
            fill="hsl(var(--primary) / 0.06)"
            stroke="hsl(var(--primary))"
            strokeWidth="1.5"
            opacity="0.6"
          />

          {/* Heart silhouette */}
          <ellipse cx="200" cy="210" rx="25" ry="35" fill="hsl(var(--muted-foreground))" opacity="0.08" />

          {/* Zone highlights */}
          {lungZones.map((zone) => {
            const status = zoneStatus[zone.id];
            if (!status.affected) return null;
            const colors = severityColors[status.severity];

            return (
              <motion.g key={zone.id}>
                <motion.ellipse
                  cx={zone.cx}
                  cy={zone.cy}
                  rx={zone.rx}
                  ry={zone.ry}
                  fill={colors.fill}
                  fillOpacity={colors.opacity}
                  stroke={colors.stroke}
                  strokeWidth="2"
                  strokeDasharray={status.severity === "high" ? "0" : "4 3"}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                />
                {status.severity === "high" && (
                  <motion.ellipse
                    cx={zone.cx}
                    cy={zone.cy}
                    rx={zone.rx + 4}
                    ry={zone.ry + 4}
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth="1"
                    opacity="0.4"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.15, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.g>
            );
          })}

          {/* Labels */}
          <text x="135" y="38" textAnchor="middle" className="fill-muted-foreground text-[9px]">R</text>
          <text x="265" y="38" textAnchor="middle" className="fill-muted-foreground text-[9px]">L</text>
        </svg>
      </div>

      {/* Zone legend */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {lungZones.map((zone) => {
          const status = zoneStatus[zone.id];
          return (
            <div
              key={zone.id}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs ${
                status.affected
                  ? "bg-muted/60 font-medium text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: status.affected
                    ? severityColors[status.severity].stroke
                    : "hsl(var(--muted-foreground))",
                  opacity: status.affected ? 1 : 0.3,
                }}
              />
              {zone.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
