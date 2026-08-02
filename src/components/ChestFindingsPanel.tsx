import { Activity, ShieldAlert, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const FINDINGS = [
  "Cardiomegaly",
  "Pleural Effusion",
  "Pneumothorax",
  "Lung Opacity",
  "Edema",
  "Consolidation",
  "Fracture",
];

export default function ChestFindingsPanel() {
  return (
    <Card className="border-primary/20">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Chest Findings Analysis</h2>
            <p className="text-xs text-muted-foreground">
              AI-assisted findings for clinical decision support. Review alongside clinical judgment.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground">
            Model integration pending — the panel below shows placeholder findings only. No results are
            generated or stored yet.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {FINDINGS.map((name) => (
            <div
              key={name}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <div>
                <p className="text-[13px] font-medium text-foreground">{name}</p>
                <p className="text-[11px] text-muted-foreground">Confidence: —%</p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                Pending
              </span>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          AI-assisted findings are decision support only and must be reviewed alongside clinical judgment
          by a qualified clinician.
        </p>
      </CardContent>
    </Card>
  );
}