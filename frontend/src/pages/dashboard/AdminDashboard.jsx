import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Skeleton from "react-loading-skeleton";
import api from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Building2,
  Users,
  GraduationCap,
  Activity,
  BarChart3,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Crown,
  Layers
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend
} from "recharts";
import { useNavigate } from "react-router-dom";

// Extended palette for up to 18 departments
const DEPT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
  "#a855f7", "#d946ef", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#84cc16", "#64748b"
];

// Prettier gradient pairs for area chart overlays
const AREA_GRADIENTS = [
  { stroke: "#6366f1", fill: "#6366f1" },
  { stroke: "#ec4899", fill: "#ec4899" },
  { stroke: "#f97316", fill: "#f97316" },
  { stroke: "#22c55e", fill: "#22c55e" },
  { stroke: "#06b6d4", fill: "#06b6d4" },
  { stroke: "#8b5cf6", fill: "#8b5cf6" },
  { stroke: "#f43f5e", fill: "#f43f5e" },
  { stroke: "#eab308", fill: "#eab308" },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-100 p-4 min-w-[180px]">
      <p className="text-xs font-bold text-slate-500 mb-2">{label}</p>
      {payload
        .filter((p) => p.value > 0)
        .sort((a, b) => b.value - a.value)
        .map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-0.5">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: p.stroke || p.color }}
              />
              <span className="text-xs font-semibold text-slate-700">{p.dataKey}</span>
            </div>
            <span className="text-xs font-bold text-slate-900">{p.value}</span>
          </div>
        ))}
    </div>
  );
};

const DeptBarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-100 p-4 min-w-[160px]">
      <p className="text-sm font-bold text-slate-800">{d.name}</p>
      <p className="text-xs text-slate-500 mt-1">
        <span className="font-bold text-slate-900">{d.value}</span> entries
      </p>
    </div>
  );
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [trendDays, setTrendDays] = useState(7);
  const [showAllDepts, setShowAllDepts] = useState(false);
  const INITIAL_DEPT_COUNT = 8;

  // ─── Stats ───
  const { data: stats, isLoading: loading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => (await api.get("/users/stats")).data,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // ─── Daily Trend ───
  const { data: trendRaw = [], isLoading: trendLoading } = useQuery({
    queryKey: ["admin-daily-trend", trendDays],
    queryFn: async () =>
      (await api.get(`/users/admin/analytics/daily-trend?days=${trendDays}`)).data,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // ─── Department Performance ───
  const { data: deptRaw = [], isLoading: deptLoading } = useQuery({
    queryKey: ["admin-dept-performance"],
    queryFn: async () =>
      (await api.get("/users/admin/analytics/dept-performance?days=30")).data,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // ─── Process trend data for the area chart ───
  const { trendChartData, topDepartments, topHighlight } = useMemo(() => {
    if (!trendRaw.length) return { trendChartData: [], topDepartments: [], topHighlight: null };

    // Aggregate total per department to find the top ones
    const deptTotals = {};
    trendRaw.forEach((r) => {
      const dept = r.department || "Unknown";
      deptTotals[dept] = (deptTotals[dept] || 0) + r.count;
    });

    // Take top 6 departments for the chart (to avoid clutter)
    const sorted = Object.entries(deptTotals)
      .sort((a, b) => b[1] - a[1]);
    const topDepts = sorted.slice(0, 6).map(([d]) => d);

    // Find top department + domain combo
    const comboCounts = {};
    trendRaw.forEach((r) => {
      const key = `${r.department || "Unknown"} → ${r.domain || "General"}`;
      comboCounts[key] = (comboCounts[key] || 0) + r.count;
    });
    const topCombo = Object.entries(comboCounts).sort((a, b) => b[1] - a[1])[0];

    // Build chart data: one row per date, one column per department
    const dateMap = {};
    trendRaw.forEach((r) => {
      const dept = r.department || "Unknown";
      if (!topDepts.includes(dept)) return;
      if (!dateMap[r.date]) dateMap[r.date] = { name: "" };
      dateMap[r.date][dept] = (dateMap[r.date][dept] || 0) + r.count;
    });

    const chartData = Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        ...values,
        name: new Date(date + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      }));

    // Fill missing departments with 0
    chartData.forEach((row) => {
      topDepts.forEach((d) => {
        if (!(d in row)) row[d] = 0;
      });
    });

    return {
      trendChartData: chartData,
      topDepartments: topDepts,
      topHighlight: topCombo
        ? { label: topCombo[0], count: topCombo[1] }
        : null,
    };
  }, [trendRaw]);

  // ─── Process department performance for bar chart ───
  const deptPerformanceData = useMemo(() => {
    return deptRaw.map((d) => ({
      name: d.department || "Unknown",
      value: d.count,
    }));
  }, [deptRaw]);

  const visibleDepts = showAllDepts
    ? deptPerformanceData
    : deptPerformanceData.slice(0, INITIAL_DEPT_COUNT);

  const displayStats = stats || {
    students: 0,
    faculty: 0,
    departments: 0,
    activities: 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-2 mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Super Admin Dashboard
        </h2>
        <p className="text-sm text-muted-foreground">
          Welcome to the institutional management portal
        </p>
      </div>

      {/* ═══ Stat Cards ═══ */}
      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Students",
            value: displayStats.students,
            icon: Users,
            gradient: "from-blue-500 to-indigo-600",
            onClick: () => navigate("/dashboard/admin/users"),
          },
          {
            label: "Total Faculty",
            value: displayStats.faculty,
            icon: GraduationCap,
            gradient: "from-violet-500 to-purple-600",
            onClick: () => navigate("/dashboard/admin/faculty"),
          },
          {
            label: "Departments",
            value: displayStats.departments,
            icon: Building2,
            gradient: "from-emerald-500 to-teal-600",
            onClick: () => navigate("/dashboard/admin/departments"),
          },
          {
            label: "Total Activities",
            value: displayStats.activities,
            icon: Activity,
            gradient: "from-orange-500 to-rose-500",
            onClick: () => navigate("/dashboard/admin/activities"),
          },
        ].map((s, i) => (
          <Card
            key={i}
            className={`shadow-sm border-none bg-white overflow-hidden transition-all duration-300 ${
              s.onClick
                ? "cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
                : ""
            }`}
            onClick={s.onClick}
          >
            <CardContent className="p-5 sm:p-6 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {s.label}
                </p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">
                  {loading ? <Skeleton width={40} /> : s.value}
                </p>
              </div>
              <div
                className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-lg`}
              >
                <s.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══ Charts Section ═══ */}
      <div className="grid gap-6 mt-8 lg:grid-cols-2">
        {/* ─── Daily Activity Trend (Area Chart) ─── */}
        <Card className="shadow-sm border-none bg-white">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-base sm:text-lg font-semibold">
                  Daily Activity Trend
                </CardTitle>
              </div>
              <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
                {[7, 14].map((d) => (
                  <button
                    key={d}
                    onClick={() => setTrendDays(d)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      trendDays === d
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {d}D
                  </button>
                ))}
              </div>
            </div>

            {/* Top Highlight Badge */}
            {topHighlight && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-lg">
                <Crown className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-semibold text-amber-800">
                  Highest Activity:
                </span>
                <span className="text-xs font-bold text-amber-900">
                  {topHighlight.label}
                </span>
                <span className="text-[10px] font-medium text-amber-600 ml-auto">
                  {topHighlight.count} entries
                </span>
              </div>
            )}
          </CardHeader>

          <CardContent className="h-[260px] sm:h-[320px] px-2 sm:px-4 pb-4">
            {trendLoading ? (
              <div className="h-full flex items-center justify-center">
                <Skeleton width="100%" height="100%" className="rounded-xl" />
              </div>
            ) : trendChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    {topDepartments.map((dept, i) => (
                      <linearGradient
                        key={dept}
                        id={`grad-${i}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={AREA_GRADIENTS[i % AREA_GRADIENTS.length].fill}
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor={AREA_GRADIENTS[i % AREA_GRADIENTS.length].fill}
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 8 }}
                  />
                  {topDepartments.map((dept, i) => (
                    <Area
                      key={dept}
                      type="monotone"
                      dataKey={dept}
                      stroke={AREA_GRADIENTS[i % AREA_GRADIENTS.length].stroke}
                      strokeWidth={i === 0 ? 3 : 2}
                      fillOpacity={1}
                      fill={`url(#grad-${i})`}
                      dot={false}
                      activeDot={{
                        r: 5,
                        strokeWidth: 2,
                        stroke: "#fff",
                      }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Activity className="h-8 w-8 opacity-20" />
                <p className="text-sm">No activity data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Department Performance (Bar Chart) ─── */}
        <Card className="shadow-sm border-none bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-base sm:text-lg font-semibold">
                Department Performance
              </CardTitle>
              {deptPerformanceData.length > 0 && (
                <span className="ml-auto text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Last 30 days
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent
            className="px-2 sm:px-4 pb-4 transition-all duration-500 ease-in-out"
            style={{
              height: deptLoading
                ? 260
                : visibleDepts.length > 0
                ? Math.max(260, visibleDepts.length * 40 + 60)
                : 260,
            }}
          >
            {deptLoading ? (
              <div className="h-full flex items-center justify-center">
                <Skeleton width="100%" height="100%" className="rounded-xl" />
              </div>
            ) : visibleDepts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={visibleDepts}
                  margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#334155", fontSize: 11, fontWeight: 600 }}
                    width={70}
                  />
                  <Tooltip content={<DeptBarTooltip />} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
                    {visibleDepts.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={DEPT_COLORS[index % DEPT_COLORS.length]}
                        fillOpacity={index === 0 ? 1 : 0.75}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <BarChart3 className="h-8 w-8 opacity-20" />
                <p className="text-sm">No performance data available</p>
              </div>
            )}
          </CardContent>

          {/* View All / Collapse toggle */}
          {deptPerformanceData.length > INITIAL_DEPT_COUNT && (
            <div className="px-4 pb-4">
              <button
                onClick={() => setShowAllDepts((prev) => !prev)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-semibold text-slate-600 hover:text-slate-800"
              >
                {showAllDepts ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <Layers className="h-4 w-4" />
                    View All {deptPerformanceData.length} Departments
                  </>
                )}
              </button>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}