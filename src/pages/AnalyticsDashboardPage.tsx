import { useState, useMemo } from "react";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, parseISO } from "date-fns";
import { Users, FileImage, AlertTriangle, Activity, CalendarIcon, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { getScans, getPatients } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, Legend,
} from "recharts";

const PIE_COLORS = ["hsl(152, 55%, 42%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)"];

export default function AnalyticsDashboardPage() {
  const allScans = getScans();
  const patients = getPatients();

  // Filters
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [clinicFilter, setClinicFilter] = useState("all");

  // Unique filter options
  const doctors = useMemo(() => [...new Set(allScans.map((s) => s.doctorName))], [allScans]);
  const clinics = useMemo(() => {
    const names = ["Metro Health Clinic", "Central Hospital", "Community Health Center"];
    return names;
  }, []);

  // Filtered scans
  const scans = useMemo(() => {
    return allScans.filter((s) => {
      const date = parseISO(s.scanDate);
      const inRange = dateFrom && dateTo
        ? isWithinInterval(date, { start: dateFrom, end: dateTo })
        : true;
      const matchDoc = doctorFilter === "all" || s.doctorName === doctorFilter;
      return inRange && matchDoc;
    });
  }, [allScans, dateFrom, dateTo, doctorFilter]);

  // Summary stats
  const uniquePatients = new Set(scans.map((s) => s.patientId)).size;
  const highRisk = scans.filter((s) => s.riskLevel === "High").length;
  const suspectedTB = scans.filter((s) => s.tbRisk > 60).length;

  const stats = [
    { label: "Total Patients Screened", value: uniquePatients, icon: Users, color: "text-primary" },
    { label: "Total Scans Performed", value: scans.length, icon: FileImage, color: "text-accent" },
    { label: "High Risk Cases", value: highRisk, icon: AlertTriangle, color: "text-destructive" },
    { label: "Suspected TB Cases", value: suspectedTB, icon: Activity, color: "text-warning" },
  ];

  // Chart 1: Total Screenings Over Time (line)
  const screeningsOverTime = useMemo(() => {
    if (!dateFrom || !dateTo) return [];
    const days = eachDayOfInterval({ start: dateFrom, end: dateTo });
    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const count = scans.filter((s) => s.scanDate.slice(0, 10) === dayStr).length;
      return { date: format(day, "MMM dd"), scans: count };
    });
  }, [scans, dateFrom, dateTo]);

  // Chart 2: TB Risk Distribution (pie)
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

  // Chart 3: Pneumonia Detection Trends (bar by week)
  const pneumoniaTrends = useMemo(() => {
    if (!dateFrom || !dateTo) return [];
    const weeks: Record<string, number> = {};
    scans.forEach((s) => {
      if (s.pneumoniaRisk > 60) {
        const d = parseISO(s.scanDate);
        const wStart = format(startOfWeek(d, { weekStartsOn: 1 }), "MMM dd");
        weeks[wStart] = (weeks[wStart] || 0) + 1;
      }
    });
    return Object.entries(weeks).map(([week, count]) => ({ week, suspected: count }));
  }, [scans, dateFrom, dateTo]);

  // Chart 4: High Risk Alerts by Week (bar)
  const highRiskByWeek = useMemo(() => {
    if (!dateFrom || !dateTo) return [];
    const weeks: Record<string, number> = {};
    scans.forEach((s) => {
      if (s.riskLevel === "High") {
        const d = parseISO(s.scanDate);
        const wStart = format(startOfWeek(d, { weekStartsOn: 1 }), "MMM dd");
        weeks[wStart] = (weeks[wStart] || 0) + 1;
      }
    });
    return Object.entries(weeks).map(([week, count]) => ({ week, alerts: count }));
  }, [scans, dateFrom, dateTo]);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Screening Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor screening activity, TB detection trends, and clinical hotspots.</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Filters</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Date From */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left text-xs", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                  {dateFrom ? format(dateFrom, "MMM dd, yyyy") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>

            {/* Date To */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left text-xs", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                  {dateTo ? format(dateTo, "MMM dd, yyyy") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>

            {/* Clinic */}
            <Select value={clinicFilter} onValueChange={setClinicFilter}>
              <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue placeholder="Clinic" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clinics</SelectItem>
                {clinics.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Doctor */}
            <Select value={doctorFilter} onValueChange={setDoctorFilter}>
              <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue placeholder="Doctor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                {doctors.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Total Screenings Over Time */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Total Screenings Over Time</h2>
            {screeningsOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={screeningsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Line type="monotone" dataKey="scans" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No data for selected range.</p>
            )}
          </CardContent>
        </Card>

        {/* TB Risk Distribution */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">TB Risk Distribution</h2>
            {riskDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={riskDistribution} cx="50%" cy="50%" outerRadius={90} innerRadius={45} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {riskDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No data available.</p>
            )}
          </CardContent>
        </Card>

        {/* Pneumonia Detection Trends */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Pneumonia Detection Trends</h2>
            {pneumoniaTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={pneumoniaTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="suspected" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} name="Suspected Pneumonia" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No pneumonia cases in range.</p>
            )}
          </CardContent>
        </Card>

        {/* High Risk Alerts by Week */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">High Risk Alerts by Week</h2>
            {highRiskByWeek.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={highRiskByWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="alerts" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="High Risk Alerts" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No high risk alerts in range.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
