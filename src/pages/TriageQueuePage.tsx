import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock, Eye, Filter, Activity, Stethoscope, User, Search } from "lucide-react";
import { motion } from "framer-motion";
import { getScans, getPatients, type ScanResult } from "@/lib/store";
import RiskBadge from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const URGENCY_CONFIG = {
  High: {
    border: "border-l-destructive",
    bg: "bg-destructive/5",
    dot: "bg-destructive",
    label: "Urgent",
    labelClass: "bg-destructive/10 text-destructive",
    sortOrder: 0,
  },
  Medium: {
    border: "border-l-warning",
    bg: "bg-warning/5",
    dot: "bg-warning",
    label: "Follow-up",
    labelClass: "bg-warning/10 text-warning",
    sortOrder: 1,
  },
  Low: {
    border: "border-l-success",
    bg: "bg-success/5",
    dot: "bg-success",
    label: "Routine",
    labelClass: "bg-success/10 text-success",
    sortOrder: 2,
  },
} as const;

interface TriageEntry {
  scan: ScanResult;
  patientAge?: number;
  patientSex?: string;
  hospitalId?: string;
}

export default function TriageQueuePage() {
  const allScans = getScans();
  const patients = getPatients();
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");

  // Build triage entries: latest scan per patient, sorted by risk
  const triageEntries: TriageEntry[] = useMemo(() => {
    const latestByPatient = new Map<string, ScanResult>();
    allScans.forEach((scan) => {
      const existing = latestByPatient.get(scan.patientId);
      if (!existing || new Date(scan.scanDate) > new Date(existing.scanDate)) {
        latestByPatient.set(scan.patientId, scan);
      }
    });

    return Array.from(latestByPatient.values())
      .map((scan) => {
        const patient = patients.find((p) => p.id === scan.patientId);
        return {
          scan,
          patientAge: patient?.age,
          patientSex: patient?.sex,
          hospitalId: patient?.hospitalId,
        };
      })
      .filter((entry) => {
        const matchSearch =
          entry.scan.patientName.toLowerCase().includes(search.toLowerCase()) ||
          (entry.hospitalId?.toLowerCase().includes(search.toLowerCase()) ?? false);
        const matchRisk = riskFilter === "all" || entry.scan.riskLevel === riskFilter;
        return matchSearch && matchRisk;
      })
      .sort((a, b) => {
        const orderA = URGENCY_CONFIG[a.scan.riskLevel].sortOrder;
        const orderB = URGENCY_CONFIG[b.scan.riskLevel].sortOrder;
        if (orderA !== orderB) return orderA - orderB;
        // Within same risk, sort by highest abnormality score
        return b.scan.abnormalityScore - a.scan.abnormalityScore;
      });
  }, [allScans, patients, search, riskFilter]);

  const highCount = triageEntries.filter((e) => e.scan.riskLevel === "High").length;
  const medCount = triageEntries.filter((e) => e.scan.riskLevel === "Medium").length;
  const lowCount = triageEntries.filter((e) => e.scan.riskLevel === "Low").length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Triage Queue</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Patients sorted by screening urgency for clinical prioritization.
        </p>
      </div>

      {/* Summary Chips */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/8 border border-destructive/20">
          <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse-soft" />
          <span className="text-sm font-semibold text-destructive">{highCount} Urgent</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-warning/8 border border-warning/20">
          <span className="w-2.5 h-2.5 rounded-full bg-warning" />
          <span className="text-sm font-semibold text-warning">{medCount} Follow-up</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-success/8 border border-success/20">
          <span className="w-2.5 h-2.5 rounded-full bg-success" />
          <span className="text-sm font-semibold text-success">{lowCount} Routine</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or hospital ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by risk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="High">High Risk</SelectItem>
            <SelectItem value="Medium">Medium Risk</SelectItem>
            <SelectItem value="Low">Low Risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Queue */}
      {triageEntries.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <AlertTriangle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {allScans.length === 0
                ? "No scans yet. Upload X-rays to populate the triage queue."
                : "No patients match the current filters."}
            </p>
            {allScans.length === 0 && (
              <Link to="/demo">
                <Button variant="outline" size="sm" className="mt-4">
                  Load Demo Cases
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {triageEntries.map((entry, i) => {
            const { scan } = entry;
            const cfg = URGENCY_CONFIG[scan.riskLevel];
            const timeSince = getTimeSince(scan.scanDate);

            return (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link to={`/results/${scan.id}`}>
                  <Card
                    className={`border-l-4 ${cfg.border} ${cfg.bg} hover:shadow-md transition-shadow cursor-pointer`}
                  >
                    <CardContent className="py-4 px-5">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        {/* Left: Patient info */}
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          {/* Priority indicator */}
                          <div className="flex flex-col items-center gap-1 shrink-0 w-14">
                            <span className={`w-3 h-3 rounded-full ${cfg.dot} ${scan.riskLevel === "High" ? "animate-pulse-soft" : ""}`} />
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${cfg.labelClass}`}>
                              {cfg.label}
                            </span>
                          </div>

                          {/* Patient details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-foreground">{scan.patientName}</p>
                              <RiskBadge level={scan.riskLevel} />
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              {entry.hospitalId && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" /> {entry.hospitalId}
                                </span>
                              )}
                              {entry.patientAge && (
                                <span>{entry.patientAge}y · {entry.patientSex}</span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {timeSince}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Key scores + action */}
                        <div className="flex items-center gap-4">
                          <div className="hidden sm:flex items-center gap-4 text-xs">
                            <div className="text-center">
                              <p className="text-muted-foreground flex items-center gap-1 justify-center">
                                <Activity className="w-3 h-3" /> TB
                              </p>
                              <p className={`font-bold ${scan.tbRisk > 70 ? "text-destructive" : scan.tbRisk > 40 ? "text-warning" : "text-success"}`}>
                                {scan.tbRisk}%
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-muted-foreground flex items-center gap-1 justify-center">
                                <Stethoscope className="w-3 h-3" /> PNA
                              </p>
                              <p className={`font-bold ${scan.pneumoniaRisk > 70 ? "text-destructive" : scan.pneumoniaRisk > 40 ? "text-warning" : "text-success"}`}>
                                {scan.pneumoniaRisk}%
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-muted-foreground">Score</p>
                              <p className="font-bold text-foreground">{scan.abnormalityScore}%</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="shrink-0">
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <div className="mt-6 p-3 rounded-lg bg-muted/50 text-[11px] text-muted-foreground">
        <strong className="text-foreground">ℹ️ Triage Priority:</strong> Patients are automatically sorted by AI risk classification. High-risk cases appear first for immediate clinical attention. This queue reflects the most recent scan per patient.
      </div>
    </div>
  );
}

function getTimeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
