import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, FileImage } from "lucide-react";
import { getScans } from "@/lib/store";
import RiskBadge from "@/components/RiskBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function HistoryPage() {
  const scans = getScans();
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return scans.filter((s) => {
      const matchSearch = s.patientName.toLowerCase().includes(search.toLowerCase());
      const matchRisk = riskFilter === "all" || s.riskLevel === riskFilter;
      return matchSearch && matchRisk;
    });
  }, [scans, search, riskFilter]);

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground mb-1">Scan History</h1>
      <p className="text-sm text-muted-foreground mb-6">{scans.length} total scans</p>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by patient name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Risk Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="Low">Low Risk</SelectItem>
            <SelectItem value="Medium">Medium Risk</SelectItem>
            <SelectItem value="High">High Risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="stat-card text-center py-16">
          <FileImage className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No scans found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((scan) => (
            <Link key={scan.id} to={`/results/${scan.id}`} className="stat-card flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                  <img src={scan.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{scan.patientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(scan.scanDate).toLocaleDateString()} &middot; TB: {scan.tbRisk}% &middot; Pneumonia: {scan.pneumoniaRisk}%
                  </p>
                </div>
              </div>
              <RiskBadge level={scan.riskLevel} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
