import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Activity, Users, AlertTriangle, FileImage, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { getCurrentUser, getPatients, getScans } from "@/lib/store";
import RiskBadge from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const user = getCurrentUser();
  const patients = getPatients();
  const scans = getScans();

  const today = new Date().toISOString().slice(0, 10);
  const todayScans = scans.filter((s) => s.scanDate.slice(0, 10) === today);
  const highRisk = scans.filter((s) => s.riskLevel === "High");

  const stats = [
    { label: "Patients Screened", value: patients.length, icon: Users, color: "text-primary" },
    { label: "Scans Today", value: todayScans.length, icon: FileImage, color: "text-info" },
    { label: "High-Risk Alerts", value: highRisk.length, icon: AlertTriangle, color: "text-destructive" },
    { label: "Total Scans", value: scans.length, icon: Activity, color: "text-accent" },
  ];

  const recentScans = useMemo(() => scans.slice(0, 5), [scans]);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Good {new Date().getHours() < 12 ? "morning" : "afternoon"}, {user?.name?.split(" ")[0]}</h1>
        <p className="text-muted-foreground text-sm mt-1">{user?.clinicName} &middot; {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-3xl font-bold text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Quick Actions</h2>
          <Link to="/upload">
            <div className="stat-card medical-gradient text-primary-foreground cursor-pointer group">
              <FileImage className="w-8 h-8 mb-3 opacity-80" />
              <p className="font-semibold">New X-Ray Scan</p>
              <p className="text-xs opacity-70 mt-1">Upload and analyze a chest X-ray</p>
              <ArrowRight className="w-4 h-4 mt-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
          <Link to="/patients">
            <div className="stat-card cursor-pointer group mt-3">
              <Users className="w-6 h-6 mb-2 text-primary" />
              <p className="font-semibold text-foreground">Add Patient</p>
              <p className="text-xs text-muted-foreground mt-1">Register a new patient profile</p>
            </div>
          </Link>
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Recent Scans</h2>
            <Link to="/history" className="text-xs text-primary hover:underline">View All</Link>
          </div>
          {recentScans.length === 0 ? (
            <div className="stat-card text-center py-12">
              <FileImage className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No scans yet. Upload your first X-ray to get started.</p>
              <Link to="/upload"><Button variant="outline" size="sm" className="mt-4">Upload X-Ray</Button></Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentScans.map((scan) => (
                <Link key={scan.id} to={`/results/${scan.id}`} className="stat-card flex items-center justify-between py-3 px-4 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <FileImage className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{scan.patientName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(scan.scanDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <RiskBadge level={scan.riskLevel} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-8 p-4 rounded-lg bg-warning/5 border border-warning/20 text-xs text-muted-foreground">
        <strong className="text-foreground">⚠ Disclaimer:</strong> LunaDX is an AI-assisted screening tool and does not provide definitive medical diagnoses. All results must be reviewed by a qualified healthcare professional.
      </div>
    </div>
  );
}
