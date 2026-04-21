import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import Skeleton from "react-loading-skeleton";
import api from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap, Users, TrendingUp, Building2, Globe,
  ArrowRight, BookOpen, Lightbulb, MousePointer,
  Search, Calendar, ChevronDown, ChevronUp, Eye,
  Clock, FileText, LayoutList, CalendarDays, Activity,
  User as UserIcon, X, Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LabelList
} from "recharts";

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const progressRef = useRef(null);

  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: async () => (await api.get("/departments")).data });
  const { data: allUsers = [], isLoading: usersLoading } = useQuery({ queryKey: ['allUsers'], queryFn: async () => (await api.get("/chat/users")).data });
  const { data: facultyMembers = [], isLoading: facultyLoading } = useQuery({ queryKey: ['faculty'], queryFn: async () => (await api.get("/users/role/admin")).data });
  const { data: myStudents = [], isLoading: myStudentsLoading } = useQuery({
    queryKey: ['my-students', user?._id],
    queryFn: async () => (await api.get(`/users/${user._id}/students`)).data,
    enabled: !!user?._id
  });

  // ── Progress data ──
  const [dateFilter, setDateFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");
  const [progressSearch, setProgressSearch] = useState("");
  const [progressView, setProgressView] = useState("student"); // student | date | timeline
  const [expandedStudents, setExpandedStudents] = useState(new Set());
  const [drillDownStudent, setDrillDownStudent] = useState(null);

  // Build date range from filter
  const dateRange = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    if (dateFilter === "today") return { startDate: today, endDate: today };
    if (dateFilter === "7days") {
      const d = new Date(); d.setDate(d.getDate() - 7);
      return { startDate: d.toISOString().split('T')[0], endDate: today };
    }
    if (dateFilter === "30days") {
      const d = new Date(); d.setDate(d.getDate() - 30);
      return { startDate: d.toISOString().split('T')[0], endDate: today };
    }
    return {};
  }, [dateFilter]);

  const { data: progressData = [], isLoading: progressLoading } = useQuery({
    queryKey: ['faculty-student-progress', user?._id, dateRange, studentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.set('startDate', dateRange.startDate);
      if (dateRange.endDate) params.set('endDate', dateRange.endDate);
      if (studentFilter !== "all") params.set('studentId', studentFilter);
      const qs = params.toString();
      return (await api.get(`/users/faculty/student-progress${qs ? '?' + qs : ''}`)).data;
    },
    enabled: !!user?._id
  });

  const loading = usersLoading || facultyLoading || myStudentsLoading;

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showFacultyModal, setShowFacultyModal] = useState(false);

  // Derived data
  const students = useMemo(() => allUsers.filter(u => u.role === "student"), [allUsers]);

  const getBreakdown = (users) => {
    const deptMap = {};
    const domainMap = {};
    users.forEach(u => {
      if (u.assignments?.length > 0) {
        u.assignments.forEach(a => {
          const dept = a.department || "Unknown";
          deptMap[dept] = (deptMap[dept] || 0) + 1;
          const domain = a.domain || "Unassigned";
          domainMap[domain] = (domainMap[domain] || 0) + 1;
        });
      } else {
        const dept = u.department || "Unknown";
        deptMap[dept] = (deptMap[dept] || 0) + 1;
        const domainStr = u.domain || "Unassigned";
        const domains = domainStr.split(',').map(d => d.trim()).filter(Boolean);
        if (domains.length === 0) {
          domainMap["Unassigned"] = (domainMap["Unassigned"] || 0) + 1;
        } else {
          domains.forEach(d => {
            domainMap[d] = (domainMap[d] || 0) + 1;
          });
        }
      }
    });

    return {
      depts: Object.entries(deptMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      domains: Object.entries(domainMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
    };
  };

  const studentBreakdown = useMemo(() => getBreakdown(students), [students]);
  const facultyBreakdown = useMemo(() => getBreakdown(facultyMembers), [facultyMembers]);

  // Students per department
  const deptData = useMemo(() => {
    const map = {};
    students.forEach(s => {
      const dept = s.department || "Unknown";
      map[dept] = (map[dept] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [students]);

  const maxDeptCount = useMemo(() => {
    const m = Math.max(...deptData.map(d => d.count), 1);
    return Math.ceil(m / 50) * 50;
  }, [deptData]);

  const xAxisLabels = useMemo(() => {
    const step = Math.max(Math.ceil(maxDeptCount / 5), 1);
    return [0, step, step * 2, step * 3, step * 4, step * 5];
  }, [maxDeptCount]);

  // Domain distribution
  const domainData = useMemo(() => {
    const map = {};
    students.forEach(s => {
      const domainStr = s.domain || "Unassigned";
      const domains = domainStr.split(',').map(d => d.trim()).filter(Boolean);
      if (domains.length === 0) {
        map["Unassigned"] = (map["Unassigned"] || 0) + 1;
      } else {
        domains.forEach(d => {
          map[d] = (map[d] || 0) + 1;
        });
      }
    });
    const totalAssignments = Object.values(map).reduce((sum, count) => sum + count, 0) || 1;
    return Object.entries(map)
      .map(([name, count]) => ({ name, count, percent: Math.round((count / totalAssignments) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [students]);

  const DOMAIN_COLORS = ["#3f6bc2", "#6d94dd", "#a5c1f2", "#c9dafc", "#3865b0", "#8baae0"];

  const donutGradient = useMemo(() => {
    if (domainData.length === 0) return "conic-gradient(#e3e9f2 0% 100%)";
    let acc = 0;
    const stops = domainData.map((d, i) => {
      const start = acc;
      acc += d.percent;
      return `${DOMAIN_COLORS[i % DOMAIN_COLORS.length]} ${start}% ${acc}%`;
    });
    if (acc < 100) stops.push(`#e3e9f2 ${acc}% 100%`);
    return `conic-gradient(${stops.join(", ")})`;
  }, [domainData]);

  const activePercent = useMemo(() => {
    const assigned = students.filter(s => s.domain && s.domain !== "Unassigned").length;
    return students.length > 0 ? Math.round((assigned / students.length) * 100) : 0;
  }, [students]);

  const stemPercent = useMemo(() => {
    const stemKeywords = ["computer", "data", "ai", "machine", "electronic", "iot", "engineering", "science", "tech", "software", "cyber", "cloud", "robot"];
    const stemCount = domainData
      .filter(d => stemKeywords.some(k => d.name.toLowerCase().includes(k)))
      .reduce((sum, d) => sum + d.count, 0);
    return students.length > 0 ? Math.round((stemCount / students.length) * 100) : 0;
  }, [domainData, students]);

  // ═══════════════════════════════════════════════════════════════
  // PROGRESS DATA PROCESSING
  // ═══════════════════════════════════════════════════════════════

  // Client-side search filtering
  const filteredProgress = useMemo(() => {
    if (!progressSearch.trim()) return progressData;
    const q = progressSearch.toLowerCase();
    return progressData.filter(u =>
      (u.student?.name || '').toLowerCase().includes(q) ||
      (u.value || '').toLowerCase().includes(q) ||
      (u.date || '').includes(q)
    );
  }, [progressData, progressSearch]);

  // Group by student
  const studentGrouped = useMemo(() => {
    const map = {};
    filteredProgress.forEach(entry => {
      const sid = entry.student?._id;
      if (!sid) return;
      if (!map[sid]) {
        map[sid] = {
          student: entry.student,
          entries: [],
          lastDate: entry.date,
        };
      }
      map[sid].entries.push(entry);
      if (entry.date > map[sid].lastDate) map[sid].lastDate = entry.date;
    });
    return Object.values(map).sort((a, b) => b.entries.length - a.entries.length);
  }, [filteredProgress]);

  // Group by date
  const dateGrouped = useMemo(() => {
    const map = {};
    filteredProgress.forEach(entry => {
      const d = entry.date || 'Unknown';
      if (!map[d]) map[d] = [];
      map[d].push(entry);
    });
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, entries]) => ({ date, entries }));
  }, [filteredProgress]);

  // Unique students for filter dropdown
  const uniqueProgressStudents = useMemo(() => {
    const map = {};
    progressData.forEach(entry => {
      if (entry.student?._id && !map[entry.student._id]) {
        map[entry.student._id] = entry.student;
      }
    });
    return Object.values(map).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [progressData]);

  // Use myStudents for filter dropdown when no progress data exists
  const filterStudentOptions = useMemo(() => {
    if (uniqueProgressStudents.length > 0) return uniqueProgressStudents;
    return (Array.isArray(myStudents) ? myStudents : []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [uniqueProgressStudents, myStudents]);

  const toggleExpand = (studentId) => {
    setExpandedStudents(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  // Build drill-down chart data
  const drillDownChartData = useMemo(() => {
    if (!drillDownStudent) return [];
    const entries = studentGrouped.find(g => g.student._id === drillDownStudent._id)?.entries || [];
    const grouped = {};
    entries.forEach(e => {
      if (!grouped[e.date]) grouped[e.date] = 0;
      grouped[e.date] += 1;
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, count]) => ({
        name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        entries: count,
        rawDate: date
      }));
  }, [drillDownStudent, studentGrouped]);

  const drillDownEntries = useMemo(() => {
    if (!drillDownStudent) return [];
    return studentGrouped.find(g => g.student._id === drillDownStudent._id)?.entries || [];
  }, [drillDownStudent, studentGrouped]);

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
  };

  const formatDateShort = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return dateStr; }
  };

  const VIEW_OPTIONS = [
    { value: "student", label: "By Student", icon: Users },
    { value: "date", label: "By Date", icon: CalendarDays },
    { value: "timeline", label: "Timeline", icon: Activity },
  ];

  return (
    <DashboardLayout title="Faculty Dashboard" description="View analytics and insights">

      {/* ═══ Header ═══ */}
      <div className="mb-5 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#16212e]">Faculty Dashboard</h2>
        <p className="text-sm text-[#546f8b] mt-1">View analytics, manage students, and track progress</p>
      </div>

      {/* ═══ Clickable Metric Cards ═══ */}
      <div className="flex flex-wrap gap-3 sm:gap-[18px] mb-7 sm:mb-9">

        {/* Total Students → open modal */}
        <div
          onClick={() => setShowStudentModal(true)}
          role="button" tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setShowStudentModal(true)}
          className="flex-1 min-w-[140px] sm:min-w-[150px] bg-white rounded-2xl sm:rounded-[28px] p-4 sm:p-[24px_22px] flex items-center gap-3 sm:gap-[18px] shadow-[0_10px_22px_rgba(0,20,40,0.04)] border border-[#e1e9f2] cursor-pointer hover:shadow-[0_12px_28px_rgba(28,60,120,0.08)] active:scale-[0.99] transition-all"
        >
          <div className="w-12 h-12 sm:w-[58px] sm:h-[58px] bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[16px] sm:rounded-[20px] flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/25">
            <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[28px] sm:text-[34px] font-bold text-[#16212e] leading-tight tracking-tight">{loading ? <Skeleton width={50} /> : students.length.toLocaleString()}</h3>
            <p className="text-[14px] sm:text-[16px] font-medium text-[#546f8b] mt-1 flex items-center gap-1.5">
              Total students <ArrowRight className="w-3 h-3 opacity-70" />
            </p>
          </div>
        </div>

        {/* Total Faculty → open modal */}
        <div
          onClick={() => setShowFacultyModal(true)}
          role="button" tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setShowFacultyModal(true)}
          className="flex-1 min-w-[140px] sm:min-w-[150px] bg-white rounded-2xl sm:rounded-[28px] p-4 sm:p-[24px_22px] flex items-center gap-3 sm:gap-[18px] shadow-[0_10px_22px_rgba(0,20,40,0.04)] border border-[#e1e9f2] cursor-pointer hover:shadow-[0_12px_28px_rgba(28,60,120,0.08)] active:scale-[0.99] transition-all"
        >
          <div className="w-12 h-12 sm:w-[58px] sm:h-[58px] bg-gradient-to-br from-violet-500 to-purple-600 rounded-[16px] sm:rounded-[20px] flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/25">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[28px] sm:text-[34px] font-bold text-[#16212e] leading-tight tracking-tight">{loading ? <Skeleton width={50} /> : facultyMembers.length}</h3>
            <p className="text-[14px] sm:text-[16px] font-medium text-[#546f8b] mt-1 flex items-center gap-1.5">
              Total faculty <ArrowRight className="w-3 h-3 opacity-70" />
            </p>
          </div>
        </div>

        {/* My Students */}
        <div
          onClick={() => navigate("/dashboard/faculty/students?view=my")}
          role="button" tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/dashboard/faculty/students?view=my")}
          className="flex-1 min-w-[140px] sm:min-w-[150px] bg-white rounded-2xl sm:rounded-[28px] p-4 sm:p-[24px_22px] flex items-center gap-3 sm:gap-[18px] shadow-[0_10px_22px_rgba(0,20,40,0.04)] border border-[#e1e9f2] cursor-pointer hover:shadow-[0_12px_28px_rgba(28,60,120,0.08)] active:scale-[0.99] transition-all"
        >
          <div className="w-12 h-12 sm:w-[58px] sm:h-[58px] bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[16px] sm:rounded-[20px] flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/25">
            <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[28px] sm:text-[34px] font-bold text-[#16212e] leading-tight tracking-tight">{loading ? <Skeleton width={50} /> : myStudents.length}</h3>
            <p className="text-[14px] sm:text-[16px] font-medium text-[#546f8b] mt-1 flex items-center gap-1.5">
              My Assigned Students <ArrowRight className="w-3 h-3 opacity-70" />
            </p>
          </div>
        </div>
        </div>

        

      {/* ═══ Analytics Title ═══ */}
      <div className="mb-4 sm:mb-5">
        <h2 className="text-lg sm:text-[24px] font-semibold text-[#1d2f48] border-l-[6px] border-[#3160af] pl-4">
          Analytics & Insights
        </h2>
      </div>

      {/* ═══ Charts Grid ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-7">

        {/* ── Students by Department (Bar Chart with Axis) ── */}
        <div className="bg-white rounded-2xl sm:rounded-[34px] p-5 sm:p-[26px] shadow-[0_18px_30px_rgba(0,0,0,0.02)] border border-[#e2eaf5]">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5 sm:mb-6">
            <div className="bg-[#ecf3fd] p-3 rounded-[18px]">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#264e8a]" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#1a314f]">Students by department</h3>
          </div>

          {/* Bar Chart */}
          <div className="space-y-3 sm:space-y-4">
            {deptData.length > 0 ? deptData.map((d) => (
              <div key={d.name}>
                {/* Desktop: single row */}
                <div className="hidden sm:flex items-center gap-3 h-10">
                  <span className="w-[130px] text-[15px] font-medium text-[#253c5c] flex items-center gap-1.5 truncate shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-[#3361ad] shrink-0" />
                    <span className="truncate">{d.name}</span>
                  </span>
                  <div className="flex-1 flex items-center gap-3">
                    <div
                      className="h-7 rounded-full min-w-[6px] transition-all duration-500 ease-out"
                      style={{
                        width: `${(d.count / maxDeptCount) * 100}%`,
                        background: "linear-gradient(90deg, #2d56a5, #5f83c7)",
                        boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3)"
                      }}
                    />
                    <span className="text-base font-semibold text-[#20406b] min-w-[48px]">{d.count}</span>
                  </div>
                </div>

                {/* Mobile: stacked layout */}
                <div className="sm:hidden space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-medium text-[#253c5c] flex items-center gap-1.5 truncate">
                      <Building2 className="w-3 h-3 text-[#3361ad] shrink-0" />
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="text-[15px] font-semibold text-[#20406b] shrink-0">{d.count}</span>
                  </div>
                  <div className="w-full h-5 bg-[#e8eef6] rounded-full overflow-hidden">
                    <div
                      className="h-5 rounded-full transition-all duration-500"
                      style={{
                        width: `${(d.count / maxDeptCount) * 100}%`,
                        background: "linear-gradient(90deg, #2d56a5, #5f83c7)"
                      }}
                    />
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-sm text-[#6b7c9e]">No department data available</div>
            )}
          </div>

          {/* X-axis scale (desktop only) */}
          {deptData.length > 0 && (
            <div className="hidden sm:flex mt-4 pt-3 border-t border-dashed border-[#cbd6e6] text-[13px] text-[#5c789b]" style={{ marginLeft: "142px" }}>
              {xAxisLabels.map((v, i) => (
                <span key={i} className="flex-1 text-center">{v}</span>
              ))}
            </div>
          )}

          {/* Summary pill */}
          <div className="mt-4 sm:mt-[18px] bg-[#f6fafe] rounded-full py-2.5 px-4 inline-flex items-center gap-2 text-[14px] text-[#28487a]">
            <Users className="w-3.5 h-3.5 shrink-0" /> total <strong>{students.length.toLocaleString()}</strong> students
          </div>
        </div>

        {/* ── Domain Distribution ── */}
        <div className="bg-white rounded-2xl sm:rounded-[34px] p-5 sm:p-[26px] shadow-[0_18px_30px_rgba(0,0,0,0.02)] border border-[#e2eaf5]">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5 sm:mb-6">
            <div className="bg-[#ecf3fd] p-3 rounded-[18px]">
              <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-[#264e8a]" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#1a314f]">Domain distribution</h3>
          </div>

          {/* Donut + Legend Row */}
          <div className="flex flex-col sm:flex-row flex-wrap items-center sm:items-start gap-5 sm:gap-6">
            {/* Donut */}
            <div
              className="w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] rounded-full flex items-center justify-center shrink-0"
              style={{
                background: donutGradient,
                boxShadow: "0 10px 20px rgba(45, 80, 140, 0.1)"
              }}
            >
              <div className="bg-white w-[96px] h-[96px] sm:w-[110px] sm:h-[110px] rounded-full flex flex-col items-center justify-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                <strong className="text-2xl sm:text-[28px] font-bold text-[#153368]">{activePercent}%</strong>
                <span className="text-[11px] sm:text-[12px] text-[#4f698c]">active</span>
              </div>
            </div>

            {/* Legend list */}
            <div className="flex-1 min-w-[180px] flex flex-col gap-3 sm:gap-[14px] w-full sm:w-auto">
              {domainData.length > 0 ? domainData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] rounded-lg shrink-0" style={{ background: DOMAIN_COLORS[i % DOMAIN_COLORS.length] }} />
                  <div className="flex-1 flex justify-between items-center min-w-0 gap-2">
                    <span className="text-[14px] sm:text-[16px] font-medium text-[#1e3657] truncate">{d.name}</span>
                    <span className="text-[13px] sm:text-[14px] font-semibold text-[#1f3f73] bg-[#eaf1fd] px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full shrink-0">{d.count}</span>
                  </div>
                  <span className="text-[14px] sm:text-[15px] font-medium text-[#557bc2] min-w-[40px] text-right shrink-0">{d.percent}%</span>
                </div>
              )) : (
                <div className="text-center py-6 text-sm text-[#6b7c9e]">No domain data available</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ═══ STUDENT PROGRESS TRACKER ═══ */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div ref={progressRef} className="mt-8 sm:mt-10">
        <div className="mb-4 sm:mb-5">
          <h2 className="text-lg sm:text-[24px] font-semibold text-[#1d2f48] border-l-[6px] border-[#059669] pl-4">
            Student Progress Tracker
          </h2>
          <p className="text-sm text-[#546f8b] mt-1 pl-[22px]">Monitor daily progress of your assigned students</p>
        </div>

        {/* ── Filters Row ── */}
        <div className="bg-white rounded-2xl sm:rounded-[28px] p-4 sm:p-5 shadow-[0_10px_22px_rgba(0,20,40,0.04)] border border-[#e2eaf5] mb-5 sm:mb-6">
          <div className="flex flex-col lg:flex-row flex-wrap gap-3 sm:gap-4">

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-[46px] rounded-2xl border-[#d6e2f0] bg-white font-medium text-[#1f3f6b]" id="date-filter">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#6f89b0]" />
                  <SelectValue placeholder="All Time" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            {/* Student Filter */}
            <Select value={studentFilter} onValueChange={setStudentFilter}>
              <SelectTrigger className="w-full sm:w-[220px] h-[46px] rounded-2xl border-[#d6e2f0] bg-white font-medium text-[#1f3f6b]" id="student-filter">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#6f89b0]" />
                  <SelectValue placeholder="All Students" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                {filterStudentOptions.map(s => (
                  <SelectItem key={s._id} value={s._id}>{s.name || s.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex bg-[#f0f5fc] rounded-2xl p-1 gap-1 self-center">
              {VIEW_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setProgressView(opt.value)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-[13px] sm:text-[14px] font-semibold transition-all ${
                    progressView === opt.value
                      ? "bg-white text-[#1d4ed8] shadow-sm"
                      : "text-[#546f8b] hover:text-[#1d4ed8]"
                  }`}
                >
                  <opt.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active filters indicator */}
          {(dateFilter !== "all" || studentFilter !== "all" || progressSearch) && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-[12px] text-[#546f8b] font-medium">Active filters:</span>
              {dateFilter !== "all" && (
                <span className="inline-flex items-center gap-1 bg-[#e8f0fe] text-[#1d4ed8] px-2.5 py-1 rounded-full text-[12px] font-semibold">
                  <Calendar className="w-3 h-3" /> {dateFilter === "today" ? "Today" : dateFilter === "7days" ? "7 Days" : "30 Days"}
                  <button onClick={() => setDateFilter("all")} className="ml-1 hover:bg-[#c2d7fb] rounded-full p-0.5"><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {studentFilter !== "all" && (
                <span className="inline-flex items-center gap-1 bg-[#e8f0fe] text-[#1d4ed8] px-2.5 py-1 rounded-full text-[12px] font-semibold">
                  <UserIcon className="w-3 h-3" /> {filterStudentOptions.find(s => s._id === studentFilter)?.name || "Student"}
                  <button onClick={() => setStudentFilter("all")} className="ml-1 hover:bg-[#c2d7fb] rounded-full p-0.5"><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {progressSearch && (
                <span className="inline-flex items-center gap-1 bg-[#e8f0fe] text-[#1d4ed8] px-2.5 py-1 rounded-full text-[12px] font-semibold">
                  <Search className="w-3 h-3" /> "{progressSearch}"
                  <button onClick={() => setProgressSearch("")} className="ml-1 hover:bg-[#c2d7fb] rounded-full p-0.5"><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Progress Content ── */}
        {progressLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl sm:rounded-[28px] p-5 sm:p-6 border border-[#e2eaf5]">
                <Skeleton height={70} className="rounded-2xl" />
              </div>
            ))}
          </div>
        ) : filteredProgress.length === 0 ? (
          /* ── Empty State ── */
          <div className="bg-white rounded-2xl sm:rounded-[34px] p-8 sm:p-12 shadow-[0_18px_30px_rgba(0,0,0,0.02)] border border-[#e2eaf5] text-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5 bg-[#f0f6ff] rounded-full flex items-center justify-center">
              <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-[#a5bfdf]" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#1d2f48] mb-2">No Progress Data Yet</h3>
            <p className="text-[#546f8b] text-sm sm:text-base max-w-md mx-auto">
              {progressSearch || dateFilter !== "all" || studentFilter !== "all"
                ? "No progress entries match your current filters. Try adjusting your search or filters."
                : "Your assigned students haven't submitted any daily progress updates yet. Data will appear here once they start logging their activities."
              }
            </p>
            {(progressSearch || dateFilter !== "all" || studentFilter !== "all") && (
              <Button
                variant="outline"
                className="mt-5 rounded-full border-[#1d4ed8] text-[#1d4ed8] hover:bg-[#e8f0fe]"
                onClick={() => { setProgressSearch(""); setDateFilter("all"); setStudentFilter("all"); }}
              >
                Clear All Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* ═══ STUDENT-WISE VIEW ═══ */}
            {progressView === "student" && (
              <div className="space-y-4">
                {studentGrouped.map(({ student, entries, lastDate }) => (
                  <motion.div
                    key={student._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl sm:rounded-[28px] shadow-[0_10px_22px_rgba(0,20,40,0.04)] border border-[#e2eaf5] overflow-hidden"
                  >
                    {/* Student Header — clickable to expand */}
                    <button
                      onClick={() => toggleExpand(student._id)}
                      className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-[#fafcff] transition-colors text-left"
                      id={`student-card-${student._id}`}
                    >
                      <Avatar className="h-11 w-11 sm:h-[50px] sm:w-[50px] shrink-0">
                        {student.profilePicture && <AvatarImage src={student.profilePicture} alt={student.name} />}
                        <AvatarFallback className="bg-[#1d4ed8] text-white text-sm font-bold rounded-2xl">
                          {getInitials(student.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-[16px] sm:text-[17px] font-bold text-[#16212e] truncate">{student.name}</h4>
                          {student.department && (
                            <span className="text-[11px] bg-[#e8f0fe] text-[#1d4ed8] px-2 py-0.5 rounded-full font-semibold shrink-0 flex items-center gap-1">
                              <Building2 className="w-2.5 h-2.5" />{student.department}
                            </span>
                          )}
                          {student.domain && (
                            <span className="text-[11px] bg-[#ecfdf5] text-[#059669] px-2 py-0.5 rounded-full font-semibold shrink-0 flex items-center gap-1">
                              <Globe className="w-2.5 h-2.5" />{student.domain}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[12px] sm:text-[13px] text-[#546f8b]">
                          <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last: {formatDateShort(lastDate)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDrillDownStudent(student); }}
                          className="p-2 rounded-xl hover:bg-[#e8f0fe] text-[#1d4ed8] transition-colors"
                          title="View details"
                        >
                          <Eye className="w-[18px] h-[18px]" />
                        </button>
                        <div className={`transition-transform duration-200 ${expandedStudents.has(student._id) ? 'rotate-180' : ''}`}>
                          <ChevronDown className="w-5 h-5 text-[#6f89b0]" />
                        </div>
                      </div>
                    </button>

                    {/* Expanded Entries */}
                    <AnimatePresence>
                      {expandedStudents.has(student._id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-[#e8eff8]">
                            <div className="space-y-2 mt-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                              {entries.map((entry, idx) => (
                                <div
                                  key={entry._id || idx}
                                  className="flex items-start gap-3 p-3 bg-[#f8fbff] rounded-xl border border-[#e8eff8] hover:border-[#c2d7fb] transition-colors"
                                >
                                  <div className="w-2 h-2 mt-2 rounded-full bg-[#1d4ed8] shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[14px] font-medium text-[#16212e] break-words">{entry.value}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[11px] text-[#6f89b0] font-semibold">{formatDate(entry.date)}</span>
                                      {entry.type && entry.type !== "Daily Update" && (
                                        <span className="text-[10px] bg-[#ecfdf5] text-[#059669] px-2 py-0.5 rounded-full font-semibold">{entry.type}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => setDrillDownStudent(student)}
                              className="mt-3 text-[13px] font-semibold text-[#1d4ed8] hover:underline flex items-center gap-1"
                            >
                              View full profile & trends <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}

            {/* ═══ DATE-WISE VIEW ═══ */}
            {progressView === "date" && (
              <div className="space-y-5">
                {dateGrouped.map(({ date, entries }) => (
                  <motion.div
                    key={date}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl sm:rounded-[28px] shadow-[0_10px_22px_rgba(0,20,40,0.04)] border border-[#e2eaf5] overflow-hidden"
                  >
                    <div className="flex items-center gap-3 p-4 sm:p-5 bg-[#f8fbff] border-b border-[#e8eff8]">
                      <div className="w-10 h-10 bg-[#e8f0fe] rounded-[14px] flex items-center justify-center shrink-0">
                        <CalendarDays className="w-5 h-5 text-[#1d4ed8]" />
                      </div>
                      <div>
                        <h4 className="text-[16px] font-bold text-[#16212e]">{formatDate(date)}</h4>
                        <p className="text-[12px] text-[#546f8b]">{entries.length} {entries.length === 1 ? 'entry' : 'entries'} from {new Set(entries.map(e => e.student?._id)).size} {new Set(entries.map(e => e.student?._id)).size === 1 ? 'student' : 'students'}</p>
                      </div>
                    </div>
                    <div className="p-4 sm:p-5 space-y-3">
                      {entries.map((entry, idx) => (
                        <div key={entry._id || idx} className="flex items-start gap-3 p-3 bg-[#f8fbff] rounded-xl border border-[#e8eff8]">
                          <Avatar className="h-8 w-8 shrink-0">
                            {entry.student?.profilePicture && <AvatarImage src={entry.student.profilePicture} alt={entry.student?.name} />}
                            <AvatarFallback className="bg-[#1d4ed8] text-white text-[10px] font-bold rounded-xl">
                              {getInitials(entry.student?.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className="text-[13px] font-bold text-[#16212e]">{entry.student?.name}</span>
                              {entry.student?.department && (
                                <span className="text-[10px] bg-[#e8f0fe] text-[#1d4ed8] px-1.5 py-0.5 rounded-md font-medium flex items-center gap-0.5">
                                  <Building2 className="w-2.5 h-2.5" />{entry.student.department}
                                </span>
                              )}
                              {entry.student?.domain && (
                                <span className="text-[10px] bg-[#ecfdf5] text-[#059669] px-1.5 py-0.5 rounded-md font-medium flex items-center gap-0.5">
                                  <Globe className="w-2.5 h-2.5" />{entry.student.domain}
                                </span>
                              )}
                            </div>
                            <p className="text-[13px] text-[#334b6e] break-words">{entry.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* ═══ TIMELINE VIEW ═══ */}
            {progressView === "timeline" && (
              <div className="bg-white rounded-2xl sm:rounded-[28px] shadow-[0_10px_22px_rgba(0,20,40,0.04)] border border-[#e2eaf5] p-4 sm:p-6">
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[19px] sm:left-[23px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-[#1d4ed8] via-[#a5c1f2] to-[#e2eaf5]" />

                  <div className="space-y-4">
                    {filteredProgress.slice(0, 50).map((entry, idx) => (
                      <motion.div
                        key={entry._id || idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="relative flex items-start gap-4 pl-2"
                      >
                        {/* Timeline dot */}
                        <div className="relative z-10 mt-1">
                          <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border-[3px] border-white shadow-sm">
                            {entry.student?.profilePicture && <AvatarImage src={entry.student.profilePicture} alt={entry.student?.name} />}
                            <AvatarFallback className="bg-[#1d4ed8] text-white text-[9px] font-bold rounded-full">
                              {getInitials(entry.student?.name)}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-[#f8fbff] rounded-xl border border-[#e8eff8] p-3 sm:p-4 hover:border-[#c2d7fb] transition-colors min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                            <span className="text-[13px] sm:text-[14px] font-bold text-[#16212e]">{entry.student?.name}</span>
                            <span className="text-[11px] text-[#6f89b0] font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {formatDateShort(entry.date)}
                            </span>
                          </div>
                          <p className="text-[13px] text-[#334b6e] break-words">{entry.value}</p>
                          {entry.student?.domain && (
                            <div className="mt-2">
                              <span className="text-[10px] bg-[#ecfdf5] text-[#059669] px-2 py-0.5 rounded-full font-semibold">{entry.student.domain}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {filteredProgress.length > 50 && (
                    <div className="text-center mt-5 text-[13px] text-[#546f8b]">
                      Showing 50 of {filteredProgress.length} entries. Use filters to narrow results.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Results count */}
            <div className="mt-4 text-center text-[12px] text-[#6f89b0] font-medium">
              Showing {filteredProgress.length} progress {filteredProgress.length === 1 ? 'entry' : 'entries'}
              {studentGrouped.length > 0 && progressView === "student" && ` from ${studentGrouped.length} ${studentGrouped.length === 1 ? 'student' : 'students'}`}
            </div>
          </>
        )}
      </div>

      {/* ═══ DRILL DOWN MODAL ═══ */}
      <Dialog open={!!drillDownStudent} onOpenChange={(open) => !open && setDrillDownStudent(null)}>
        <DialogContent className="max-w-[700px] w-[95vw] max-h-[90vh] overflow-hidden flex flex-col rounded-[28px] p-0 border border-[#e2eaf5] shadow-2xl bg-white">
          {drillDownStudent && (
            <>
              {/* ── Profile Header — mirrors UserProfile.jsx card style ── */}
              <div className="p-5 sm:p-7 border-b border-[#e8eff8] shrink-0 bg-white">
                {/* Avatar + Name */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <Avatar className="h-20 w-20 shadow-md ring-4 ring-white shrink-0">
                    {drillDownStudent.profilePicture && <AvatarImage src={drillDownStudent.profilePicture} alt={drillDownStudent.name} />}
                    <AvatarFallback className="bg-[#1e3c72] text-white text-2xl font-bold">
                      {getInitials(drillDownStudent.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-center sm:text-left min-w-0">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#1e3c72] mb-1 truncate">{drillDownStudent.name}</h3>
                    <p className="text-sm text-[#546f8b] mb-3">
                      {drillDownStudent.department ? `${drillDownStudent.department} Student` : 'Student'}
                    </p>
                    {/* Meta grid — same pattern as UserProfile */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {drillDownStudent.email && (
                        <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl p-2.5 sm:col-span-2">
                          <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                            <UserIcon className="h-3.5 w-3.5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-[#546f8b] uppercase tracking-wide">Email</p>
                            <p className="text-[13px] font-semibold text-[#16212e] truncate">{drillDownStudent.email}</p>
                          </div>
                        </div>
                      )}
                      {drillDownStudent.department && (
                        <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl p-2.5">
                          <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                            <Building2 className="h-3.5 w-3.5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-[#546f8b] uppercase tracking-wide">Department</p>
                            <p className="text-[13px] font-semibold text-[#16212e]">{drillDownStudent.department}</p>
                          </div>
                        </div>
                      )}
                      {drillDownStudent.domain && (
                        <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl p-2.5">
                          <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                            <Globe className="h-3.5 w-3.5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-[#546f8b] uppercase tracking-wide">Domain / Focus</p>
                            <p className="text-[13px] font-semibold text-[#059669]">{drillDownStudent.domain}</p>
                          </div>
                        </div>
                      )}
                      {drillDownStudent.regNo && (
                        <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl p-2.5">
                          <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                            <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-[#546f8b] uppercase tracking-wide">Reg. No.</p>
                            <p className="text-[13px] font-semibold text-[#16212e]">{drillDownStudent.regNo}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex gap-3 sm:gap-4 mt-4">
                  <div className="bg-[#e8f0fe] rounded-2xl px-4 py-3 text-center flex-1">
                    <p className="text-xl sm:text-2xl font-bold text-[#1d4ed8]">{drillDownEntries.length}</p>
                    <p className="text-[11px] text-[#546f8b] font-medium">Total Entries</p>
                  </div>
                  <div className="bg-[#ecfdf5] rounded-2xl px-4 py-3 text-center flex-1">
                    <p className="text-xl sm:text-2xl font-bold text-[#059669]">{new Set(drillDownEntries.map(e => e.date)).size}</p>
                    <p className="text-[11px] text-[#546f8b] font-medium">Active Days</p>
                  </div>
                  <div className="bg-[#f0f6ff] rounded-2xl px-4 py-3 text-center flex-1">
                    <p className="text-xl sm:text-2xl font-bold text-[#1e3c72]">{drillDownEntries.length > 0 ? formatDateShort(drillDownEntries[0]?.date) : "—"}</p>
                    <p className="text-[11px] text-[#546f8b] font-medium">Last Active</p>
                  </div>
                </div>
              </div>

              {/* Chart + Entries */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
                {/* Activity Trend Chart */}
                {drillDownChartData.length > 1 && (
                  <div className="bg-[#f8fbff] rounded-2xl p-4 sm:p-5 border border-[#e8eff8]">
                    <h4 className="text-[15px] font-bold text-[#16212e] mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#1d4ed8]" /> Activity Trend
                    </h4>
                    <div className="h-[180px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={drillDownChartData} margin={{ left: 0, right: 30, top: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="drillColor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#546f8b', fontSize: 11, fontWeight: 600 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#546f8b', fontSize: 11, fontWeight: 600 }} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.08)', padding: '12px 16px' }}
                            formatter={(value) => [`${value} entries`, 'Activity']}
                          />
                          <Area
                            type="monotone"
                            dataKey="entries"
                            stroke="#1d4ed8"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#drillColor)"
                            dot={{ r: 4, fill: '#fff', stroke: '#1d4ed8', strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: '#1d4ed8', stroke: '#fff', strokeWidth: 2 }}
                          >
                            <LabelList dataKey="entries" position="top" offset={10} style={{ fill: '#1d4ed8', fontSize: 12, fontWeight: 700 }} />
                          </Area>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* All Entries */}
                <div>
                  <h4 className="text-[15px] font-bold text-[#16212e] mb-3 flex items-center gap-2">
                    <LayoutList className="w-4 h-4 text-[#059669]" /> All Progress Entries
                  </h4>
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                    {drillDownEntries.map((entry, idx) => (
                      <div key={entry._id || idx} className="flex items-start gap-3 p-3 bg-[#f8fbff] rounded-xl border border-[#e8eff8]">
                        <div className="w-2 h-2 mt-2 rounded-full bg-[#1d4ed8] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-[#16212e] break-words">{entry.value}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-[#6f89b0] font-semibold">{formatDate(entry.date)}</span>
                            {entry.type && entry.type !== "Daily Update" && (
                              <span className="text-[10px] bg-[#ecfdf5] text-[#059669] px-2 py-0.5 rounded-full font-semibold">{entry.type}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 sm:px-6 py-4 border-t border-[#e8eff8] flex justify-end shrink-0 bg-white">
                <Button variant="outline" onClick={() => setDrillDownStudent(null)} className="rounded-full px-6 border-[#1d4ed8] text-[#1d4ed8] hover:bg-[#e8f0fe]">
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Existing Modals ═══ */}
      <Dialog open={showStudentModal} onOpenChange={setShowStudentModal}>
        <DialogContent className="max-w-[600px] w-[95vw] rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#16212e] font-bold flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-[#2b4a81]" />
              Total Students Breakdown
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto">
            <div>
              <h4 className="font-semibold text-[#1a314f] mb-3 border-b pb-2">By Department</h4>
              {studentBreakdown.depts.length > 0 ? (
                <ul className="space-y-2">
                  {studentBreakdown.depts.map((d) => (
                    <li key={d.name} className="flex justify-between text-[15px] border-b border-gray-100 pb-1">
                      <span className="text-[#334b6e]">{d.name}</span>
                      <span className="font-medium text-[#2b4a81]">{d.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No data</p>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-[#1a314f] mb-3 border-b pb-2">By Domain</h4>
              {studentBreakdown.domains.length > 0 ? (
                <ul className="space-y-2">
                  {studentBreakdown.domains.map((d) => (
                    <li key={d.name} className="flex justify-between text-[15px] border-b border-gray-100 pb-1">
                      <span className="text-[#334b6e]">{d.name}</span>
                      <span className="font-medium text-[#2b4a81]">{d.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No data</p>
              )}
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-[#f0f4f8] gap-3">
            <Button variant="outline" className="text-[#1a314f] border-[#e1e9f2] hover:bg-[#f6fafe]" onClick={() => setShowStudentModal(false)}>Close</Button>
            <Button className="bg-[#1d4ed8] hover:bg-[#1e3f9e] text-white" onClick={() => navigate("/dashboard/faculty/students")}>View Full List</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showFacultyModal} onOpenChange={setShowFacultyModal}>
        <DialogContent className="max-w-[600px] w-[95vw] rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#16212e] font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-[#2b4a81]" />
              Total Faculty Breakdown
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto">
            <div>
              <h4 className="font-semibold text-[#1a314f] mb-3 border-b pb-2">By Department</h4>
              {facultyBreakdown.depts.length > 0 ? (
                <ul className="space-y-2">
                  {facultyBreakdown.depts.map((d) => (
                    <li key={d.name} className="flex justify-between text-[15px] border-b border-gray-100 pb-1">
                      <span className="text-[#334b6e]">{d.name}</span>
                      <span className="font-medium text-[#2b4a81]">{d.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No data</p>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-[#1a314f] mb-3 border-b pb-2">By Domain</h4>
              {facultyBreakdown.domains.length > 0 ? (
                <ul className="space-y-2">
                  {facultyBreakdown.domains.map((d) => (
                    <li key={d.name} className="flex justify-between text-[15px] border-b border-gray-100 pb-1">
                      <span className="text-[#334b6e]">{d.name}</span>
                      <span className="font-medium text-[#2b4a81]">{d.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No data</p>
              )}
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-[#f0f4f8] gap-3">
            <Button variant="outline" className="text-[#1a314f] border-[#e1e9f2] hover:bg-[#f6fafe]" onClick={() => setShowFacultyModal(false)}>Close</Button>
            <Button className="bg-[#1d4ed8] hover:bg-[#1e3f9e] text-white" onClick={() => navigate("/dashboard/faculty/faculties")}>View Full List</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}