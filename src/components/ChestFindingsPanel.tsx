import { Activity, ShieldAlert, Info, CircleDashed, CheckCircle2, AlertTriangle, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  createEmptyChestFindingsResult,
  type ChestFindingsResult,
  type ChestFindingStatus,
} from "@/lib/chestFindings";

const STATUS_META: Record<
  ChestFindingStatus,
  { label: string; className: string; Icon: typeof CircleDashed }
> = {
  detected: {
    label: "Detected",
    className: "bg-destructive/10 text-destructive border-destructive/30",
    Icon: AlertTriangle,
  },
  not_detected: {
    label: "Not detected",
    className: "bg-success/10 text-success border-success/30",
    Icon: CheckCircle2,
  },
  review: {
    label: "Review recommended",
    className: "bg-warning/10 text-warning border-warning/30",
    Icon: Eye,
  },
  pending: {
    label: "Awaiting analysis",
    className: "bg-muted text-muted-foreground border-border",
    Icon: CircleDashed,
  },
};

interface Props {
  result?: ChestFindingsResult | null;
}

export default function ChestFindingsPanel({ result }: Props) {
  const data = result ?? createEmptyChestFindingsResult();

  return (
    <Card className="border-primary/20">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Chest Findings Analysis Results</h2>
            <p className="text-xs text-muted-foreground">
              AI-assisted findings for clinical decision support. Review alongside clinical judgment.
            </p>
          </div>
        </div>

        {data.pending && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">
              Model integration pending — confidence scores and statuses will populate once the chest
              findings model is connected. No results are generated or stored yet.
            </p>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {data.findings.map((finding) => {
            const meta = STATUS_META[finding.status];
            return (
              <div
                key={finding.name}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{finding.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Confidence: {finding.confidence === null ? "—%" : `${finding.confidence}%`}
                  </p>
                </div>
                <span
                  className={`flex items-center gap-1 shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.className}`}
                >
                  <meta.Icon className="w-3 h-3" />
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
          <h3 className="text-[13px] font-semibold text-foreground">Clinical Summary</h3>
          <p className="text-xs text-muted-foreground">{data.clinicalSummary}</p>
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
