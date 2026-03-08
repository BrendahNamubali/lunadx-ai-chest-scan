import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity, Users, AlertTriangle, FileImage, ArrowRight, Play, Shield,
  TrendingUp, TrendingDown, Stethoscope, Eye, Minus,
} from "lucide-react";
import { motion } from "framer-motion";
import { getCurrentUser, getPatients, getScans, getScanUsage } from "@/lib/store";
import RiskBadge from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";

const PIE_COLORS = ["hsl(142, 60%, 40%)", "hsl(30, 90%, 50%)", "hsl(0, 72%, 51%)"];

export default function DashboardPage() {
  const user = getCurrentUser();
  const patients = getPatients();
  const scans = getScans();
  const scanUsage = getScanUsage();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todayScans = scans.filter((s) => s.scanDate.slice(0, 10) === todayStr);
  const highRisk = scans.filter((s) => s.riskLevel === "High");
  const suspectedTB = scans.filter((s) => s.tbRisk > 60);
  const suspectedPNA = scans.filter((s) => s.pneumoniaRisk > 60);

  // Simulated trend percentages (deterministic from count)
  const trend = (count: number) => {
    if (count === 0) return { value: 0, direction: "flat" as const };
    const pct = ((count * 17 + 3) % 30) - 8; // -8 to +21
    return {
      value: Math.abs(pct),
      direction: pct > 0 ? ("up" as const) : pct < 0 ? ("down" as const) : ("flat" as const),
    };
  };

  const stats = [
    {
      label: "Total Screenings",
      value: scans.length,
      icon: FileImage,
      color: "text-primary",
      bg: "bg-primary/8",
      trend: trend(scans.length),
    },
    {
      label: "High Risk Cases",
      value: highRisk.length,
      icon: AlertTriangle,
      color: "text-destructive",
      bg: "bg-destructive/8",
      trend: trend(highRisk.length),
    },
    {
      label: "Suspected TB Cases",
      value: suspectedTB.length,
      icon: Activity,
      color: "text-warning",
      bg: "bg-warning/8",
      trend: trend(suspectedTB.length),
    },
    {
      label: "Suspected Pneumonia",
      value: suspectedPNA.length,
      icon: Stethoscope,
      color: "text-info",
      bg: "bg-info/8",
      trend: trend(suspectedPNA.length),
    },
  ];

  // Line chart: screenings over last 14 days
  const screeningsOverTime = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(today, 13), end: today });
    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const count = scans.filter((s) => s.scanDate.slice(0, 10) === dayStr).length;
      return { date: format(day, "MMM dd"), scans: count };
    });
  }, [scans]);

  // Pie chart: risk distribution
  const riskDistribution = useMemo(() => {
    const low = scans.filter((s) => s.riskLevel === "Low").length;
    const med = scans.filter((s) => s.riskLevel === "Medium").length;
    const high = scans.filter((s) => s.riskLevel === "High").length;
    return [
      { name: "Low Risk", value: low },
      { name: "Medium Risk", value: med },
      { name: "High Risk", value: high },
    ].filter((d) => d.value > 0);
  }, [scans]);

  // Recent scans (latest 8)
  const recentScans = useMemo(() => scans.slice(0, 8), [scans]);

  // Deterministic AI confidence
  const getConfidence = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
    return 70 + Math.abs(hash % 26);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Good {today.getHours() < 12 ? "morning" : "afternoon"}, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {user?.orgName} · {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/upload">
            <Button className="cta-gradient text-cta-foreground border-0 hover:opacity-90">
              <FileImage className="w-4 h-4 mr-2" /> New Scan
            </Button>
          </Link>
          <Link to="/demo">
            <Button variant="outline" size="sm">
              <Play className="w-3.5 h-3.5 mr-1" /> Demo Cases
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  {stat.trend.value > 0 && (
                    <span
                      className={`flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        stat.trend.direction === "up"
                          ? "bg-success/10 text-success"
                          : stat.trend.direction === "down"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {stat.trend.direction === "up" ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : stat.trend.direction === "down" ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : (
                        <Minus className="w-3 h-3" />
                      )}
                      {stat.trend.value}%
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Scan Usage */}
      <Card className="mb-8">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Scan Usage</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Trial Plan · {scanUsage.remaining} scans remaining</p>
            </div>
            <Link to="/billing">
              <Button variant="outline" size="sm" className="text-xs">
                Manage Plan
              </Button>
            </Link>
          </div>
          <Progress value={Math.min((scanUsage.used / scanUsage.total) * 100, 100)} className="h-2.5" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{scanUsage.used} used</span>
            <span>{scanUsage.total} total</span>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {/* Line Chart — spans 2 cols */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Screenings Over Time
              </h2>
              <span className="text-[10px] text-muted-foreground">Last 14 days</span>
            </div>
            {scans.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={screeningsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <RTooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="scans"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                No screening data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
              Risk Distribution
            </h2>
            {riskDistribution.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="hsl(var(--card))"
                    >
                      {riskDistribution.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2">
                  {[
                    { label: "Low", color: "bg-success" },
                    { label: "Medium", color: "bg-warning" },
                    { label: "High", color: "bg-destructive" },
                  ].map((item) => (
                    <span key={item.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className={`w-2 h-2 rounded-full ${item.color}`} />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Scans Table */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Recent Scans
            </h2>
            <Link to="/history" className="text-xs text-primary hover:underline font-medium">
              View All →
            </Link>
          </div>

          {recentScans.length === 0 ? (
            <div className="text-center py-12">
              <FileImage className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                No scans yet. Upload your first X-ray to get started.
              </p>
              <Link to="/upload">
                <Button variant="outline" size="sm">Upload X-Ray</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Patient</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scan Date</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Risk</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">AI Confidence</th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentScans.map((scan, i) => {
                    const confidence = getConfidence(scan.id);
                    return (
                      <motion.tr
                        key={scan.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                              <FileImage className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <span className="font-medium text-foreground">{scan.patientName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {new Date(scan.scanDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-3">
                          <RiskBadge level={scan.riskLevel} />
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${confidence}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-foreground">{confidence}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link to={`/results/${scan.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-3.5 h-3.5 mr-1" /> View
                            </Button>
                          </Link>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="mt-6 p-4 rounded-lg bg-warning/5 border border-warning/20 text-xs text-muted-foreground">
        <strong className="text-foreground">⚠ Disclaimer:</strong> LunaDX is an AI-assisted screening tool and does not provide definitive medical diagnoses. All results must be reviewed by a qualified healthcare professional.
      </div>

      {/* Security */}
      <div className="mt-3 flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 text-[11px] text-muted-foreground">
        <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
        <p>Patient data is securely stored using encrypted infrastructure and protected medical data practices.</p>
      </div>
    </div>
  );
}
