import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Activity, Stethoscope, Clock, Eye, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { getPatients, getScans, type ScanResult } from "@/lib/store";
import RiskBadge from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PatientRecordPage() {
  const { patientId } = useParams();
  const [riskFilter, setRiskFilter] = useState<string>("all");

  const patient = useMemo(() => getPatients().find((p) => p.id === patientId), [patientId]);
  const scans = useMemo(() => {
    const all = getScans()
      .filter((s) => s.patientId === patientId)
      .sort((a, b) => new Date(b.scanDate).getTime() - new Date(a.scanDate).getTime());
    if (riskFilter === "all") return all;
    return all.filter((s) => s.riskLevel === riskFilter);
  }, [patientId, riskFilter]);

  if (!patient)
    return (
      <div className="text-center py-20 text-muted-foreground">
        Patient not found.{" "}
        <Link to="/patients" className="text-primary hover:underline">Back to patients</Link>
      </div>
    );

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/patients">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{patient.name}</h1>
          <p className="text-xs text-muted-foreground">
            {patient.age}y &middot; {patient.sex} &middot; ID: {patient.hospitalId}
          </p>
        </div>
        <Link to={`/upload?patientId=${patient.id}`}>
          <Button size="sm" className="medical-gradient text-primary-foreground border-0 hover:opacity-90">
            New Scan
          </Button>
        </Link>
      </div>

      {/* Patient summary */}
      <Card className="mb-6">
        <CardContent className="pt-5 pb-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Total Scans</p>
              <p className="font-semibold text-foreground">{getScans().filter((s) => s.patientId === patientId).length}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Last Visit</p>
              <p className="font-semibold text-foreground">
                {scans.length > 0 ? new Date(scans[0].scanDate).toLocaleDateString() : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Symptoms</p>
              <p className="font-semibold text-foreground truncate">{patient.symptoms || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Registered</p>
              <p className="font-semibold text-foreground">{new Date(patient.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Scan Timeline
        </h2>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Filter risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scans</SelectItem>
              <SelectItem value="High">High Risk</SelectItem>
              <SelectItem value="Medium">Medium Risk</SelectItem>
              <SelectItem value="Low">Low Risk</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Timeline */}
      {scans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No scans found{riskFilter !== "all" ? ` for ${riskFilter} risk level` : ""}. Upload an X-ray to begin screening.
          </CardContent>
        </Card>
      ) : (
        <div className="relative pl-6">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

          <div className="space-y-4">
            {scans.map((scan, i) => (
              <TimelineItem key={scan.id} scan={scan} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineItem({ scan, index }: { scan: ScanResult; index: number }) {
  const dotColor =
    scan.riskLevel === "High"
      ? "bg-destructive"
      : scan.riskLevel === "Medium"
      ? "bg-warning"
      : "bg-success";

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="relative"
    >
      {/* Dot on the line */}
      <div className={`absolute -left-6 top-4 w-3 h-3 rounded-full border-2 border-background ${dotColor} ring-2 ring-background`} />

      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground">
                  {new Date(scan.scanDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <RiskBadge level={scan.riskLevel} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground text-xs">TB:</span>
                  <span className={`font-semibold text-xs ${scan.tbRisk > 70 ? "text-destructive" : scan.tbRisk > 40 ? "text-warning" : "text-success"}`}>
                    {scan.tbRisk}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground text-xs">Pneumonia:</span>
                  <span className={`font-semibold text-xs ${scan.pneumoniaRisk > 70 ? "text-destructive" : scan.pneumoniaRisk > 40 ? "text-warning" : "text-success"}`}>
                    {scan.pneumoniaRisk}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-xs">Abnormality:</span>
                  <span className="font-semibold text-xs text-foreground">{scan.abnormalityScore}%</span>
                </div>
              </div>
            </div>

            <Link to={`/results/${scan.id}`}>
              <Button variant="outline" size="sm" className="shrink-0">
                <Eye className="w-3.5 h-3.5 mr-1" /> View Report
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
