import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Skeleton from "react-loading-skeleton";
import api from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Calendar,
  BookOpen,
  Building2,
  Layers,
  X,
  SlidersHorizontal,
  Users,
  Clock,
  FileText,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Eye,
  Globe,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const VIEW_OPTIONS = [
  { value: "student", label: "By Student", icon: Users },
  { value: "date", label: "By Date", icon: CalendarDays },
  { value: "timeline", label: "Timeline", icon: Activity },
];

export default function TotalActivities() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [progressView, setProgressView] = useState("student");
  const [expandedStudents, setExpandedStudents] = useState(new Set());
  const limit = 50;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedDept, selectedDomain]);

  // Fetch departments for filter dropdowns
  const { data: departments = [] } = useQuery({
    queryKey: ["departments-list"],
    queryFn: async () => (await api.get("/departments")).data,
    staleTime: 60000,
  });

  // Fetch activities (daily progress data)
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["all-activities", page, limit, selectedDept, selectedDomain, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit });
      if (selectedDept) params.append("department", selectedDept);
      if (selectedDomain) params.append("domain", selectedDomain);
      if (debouncedSearch) params.append("search", debouncedSearch);
      return (await api.get(`/users/admin/activities/all?${params}`)).data;
    },
    keepPreviousData: true,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const activities = data?.activities || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  // Available domains based on selected department
  const availableDomains = selectedDept
    ? (departments.find((d) => d.name === selectedDept)?.domains || [])
    : departments.flatMap((d) => d.domains || []).filter((v, i, a) => a.indexOf(v) === i);

  const hasActiveFilters = selectedDept || selectedDomain || search;

  const clearFilters = () => {
    setSelectedDept("");
    setSelectedDomain("");
    setSearch("");
    setPage(1);
  };

  // ═══ Group by Student ═══
  const studentGrouped = useMemo(() => {
    const map = {};
    activities.forEach((entry) => {
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
  }, [activities]);

  // ═══ Group by Date ═══
  const dateGrouped = useMemo(() => {
    const map = {};
    activities.forEach((entry) => {
      const d = entry.date || "Unknown";
      if (!map[d]) map[d] = [];
      map[d].push(entry);
    });
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, entries]) => ({ date, entries }));
  }, [activities]);

  const toggleExpand = (studentId) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const getInitials = (name) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateShort = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <DashboardLayout>
      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard/admin")}
            className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Student Daily Progress
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? (
                <Skeleton width={140} />
              ) : (
                `${total.toLocaleString()} progress entries across all departments`
              )}
            </p>
          </div>
        </div>

        {/* Filter Toggle for mobile */}
        <button
          onClick={() => setShowFilters((p) => !p)}
          className={`sm:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            showFilters || hasActiveFilters
              ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-200"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 h-5 w-5 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-bold">
              !
            </span>
          )}
        </button>
      </div>

      {/* ═══ Filters Bar ═══ */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          showFilters
            ? "max-h-[500px] opacity-100 mb-6"
            : "max-h-0 opacity-0 sm:max-h-[500px] sm:opacity-100 sm:mb-6"
        }`}
      >
        <div className="bg-white rounded-2xl sm:rounded-[28px] shadow-[0_10px_22px_rgba(0,20,40,0.04)] border border-[#e2eaf5] p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            {/* Search */}
            <div className="flex-1 min-w-0">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, progress..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all duration-200"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
                  >
                    <X className="h-3 w-3 text-slate-500" />
                  </button>
                )}
              </div>
            </div>

            {/* Department Filter */}
            <div className="sm:w-52">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                Department
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    setSelectedDomain("");
                  }}
                  className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all duration-200 appearance-none cursor-pointer"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Domain Filter */}
            <div className="sm:w-52">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                Domain
              </label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  disabled={availableDomains.length === 0}
                  className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all duration-200 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">All Domains</option>
                  {availableDomains.map((dom) => (
                    <option key={dom} value={dom}>
                      {dom}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex bg-[#f0f5fc] rounded-xl p-1 gap-1 self-center sm:self-end">
              {VIEW_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setProgressView(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all ${
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

            {/* Clear */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-600 transition-all duration-200 whitespace-nowrap"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>

          {/* Active filters indicator */}
          {hasActiveFilters && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-[12px] text-[#546f8b] font-medium">Active filters:</span>
              {selectedDept && (
                <span className="inline-flex items-center gap-1 bg-[#e8f0fe] text-[#1d4ed8] px-2.5 py-1 rounded-full text-[12px] font-semibold">
                  <Building2 className="w-3 h-3" /> {selectedDept}
                  <button onClick={() => { setSelectedDept(""); setSelectedDomain(""); }} className="ml-1 hover:bg-[#c2d7fb] rounded-full p-0.5">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
              {selectedDomain && (
                <span className="inline-flex items-center gap-1 bg-[#ecfdf5] text-[#059669] px-2.5 py-1 rounded-full text-[12px] font-semibold">
                  <Globe className="w-3 h-3" /> {selectedDomain}
                  <button onClick={() => setSelectedDomain("")} className="ml-1 hover:bg-[#a7f3d0] rounded-full p-0.5">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
              {search && (
                <span className="inline-flex items-center gap-1 bg-[#fef3c7] text-[#b45309] px-2.5 py-1 rounded-full text-[12px] font-semibold">
                  <Search className="w-3 h-3" /> "{search}"
                  <button onClick={() => setSearch("")} className="ml-1 hover:bg-[#fde68a] rounded-full p-0.5">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Content ═══ */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl sm:rounded-[28px] p-5 sm:p-6 border border-[#e2eaf5]">
              <Skeleton height={70} className="rounded-2xl" />
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        /* ── Empty State ── */
        <div className="bg-white rounded-2xl sm:rounded-[34px] p-8 sm:p-12 shadow-[0_18px_30px_rgba(0,0,0,0.02)] border border-[#e2eaf5] text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5 bg-gradient-to-br from-orange-100 to-rose-100 rounded-full flex items-center justify-center">
            <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-orange-300" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">
            No Progress Data Found
          </h3>
          <p className="text-slate-500 text-sm sm:text-base max-w-md mx-auto">
            {hasActiveFilters
              ? "No progress entries match your current filters. Try adjusting or clearing your filters."
              : "There are no student progress entries recorded yet. Data will appear here once students start logging their daily activities."}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-orange-200 transition-all duration-200"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ═══ STUDENT-WISE VIEW ═══ */}
          {progressView === "student" && (
            <div className="space-y-4">
              {studentGrouped.map(({ student, entries, lastDate }) => (
                <div
                  key={student._id}
                  className="bg-white rounded-2xl sm:rounded-[28px] shadow-[0_10px_22px_rgba(0,20,40,0.04)] border border-[#e2eaf5] overflow-hidden transition-all duration-300 hover:shadow-[0_12px_28px_rgba(28,60,120,0.08)]"
                >
                  {/* Student Header — clickable to expand */}
                  <button
                    onClick={() => toggleExpand(student._id)}
                    className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-[#fafcff] transition-colors text-left"
                  >
                    {/* Avatar */}
                    <div className="h-11 w-11 sm:h-[50px] sm:w-[50px] rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-200/40 overflow-hidden">
                      {student.profilePicture ? (
                        <img src={student.profilePicture} alt={student.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-white text-sm font-bold">{getInitials(student.name)}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-[16px] sm:text-[17px] font-bold text-[#16212e] truncate">
                          {student.name}
                        </h4>
                        {student.regNo && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {student.regNo}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {student.department && (
                          <span className="text-[11px] bg-[#e8f0fe] text-[#1d4ed8] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            <Building2 className="w-2.5 h-2.5" />
                            {student.department}
                          </span>
                        )}
                        {student.domain && (
                          <span className="text-[11px] bg-[#ecfdf5] text-[#059669] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5" />
                            {student.domain}
                          </span>
                        )}
                        <span className="text-[12px] text-[#546f8b] flex items-center gap-1">
                          <FileText className="w-3 h-3" /> {entries.length}{" "}
                          {entries.length === 1 ? "entry" : "entries"}
                        </span>
                        <span className="text-[12px] text-[#546f8b] flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Last: {formatDateShort(lastDate)}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`transition-transform duration-200 ${
                        expandedStudents.has(student._id) ? "rotate-180" : ""
                      }`}
                    >
                      <ChevronDown className="w-5 h-5 text-[#6f89b0]" />
                    </div>
                  </button>

                  {/* Expanded Entries */}
                  {expandedStudents.has(student._id) && (
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-[#e8eff8]">
                      <div className="space-y-2 mt-3 max-h-[400px] overflow-y-auto pr-1">
                        {entries.map((entry, idx) => (
                          <div
                            key={entry._id || idx}
                            className="flex items-start gap-3 p-3 bg-[#f8fbff] rounded-xl border border-[#e8eff8] hover:border-[#c2d7fb] transition-colors"
                          >
                            <div className="w-2 h-2 mt-2 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-medium text-[#16212e] break-words">
                                {entry.value}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-[11px] text-[#6f89b0] font-semibold">
                                  {formatDate(entry.date)}
                                </span>
                                {entry.type && entry.type !== "Daily Update" && (
                                  <span className="text-[10px] bg-[#ecfdf5] text-[#059669] px-2 py-0.5 rounded-full font-semibold">
                                    {entry.type}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">
                                  {formatTime(entry.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ═══ DATE-WISE VIEW ═══ */}
          {progressView === "date" && (
            <div className="space-y-5">
              {dateGrouped.map(({ date, entries }) => (
                <div
                  key={date}
                  className="bg-white rounded-2xl sm:rounded-[28px] shadow-[0_10px_22px_rgba(0,20,40,0.04)] border border-[#e2eaf5] overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-4 sm:p-5 bg-[#f8fbff] border-b border-[#e8eff8]">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-rose-500 rounded-[14px] flex items-center justify-center shrink-0 shadow-md">
                      <CalendarDays className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-[16px] font-bold text-[#16212e]">
                        {formatDate(date)}
                      </h4>
                      <p className="text-[12px] text-[#546f8b]">
                        {entries.length} {entries.length === 1 ? "entry" : "entries"} from{" "}
                        {new Set(entries.map((e) => e.student?._id)).size}{" "}
                        {new Set(entries.map((e) => e.student?._id)).size === 1
                          ? "student"
                          : "students"}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 sm:p-5 space-y-3">
                    {entries.map((entry, idx) => (
                      <div
                        key={entry._id || idx}
                        className="flex items-start gap-3 p-3 bg-[#f8fbff] rounded-xl border border-[#e8eff8] hover:border-[#c2d7fb] transition-colors"
                      >
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                          {entry.student?.profilePicture ? (
                            <img src={entry.student.profilePicture} alt={entry.student?.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-white text-[10px] font-bold">
                              {getInitials(entry.student?.name)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-[13px] font-bold text-[#16212e]">
                              {entry.student?.name || "Unknown"}
                            </span>
                            {entry.student?.department && (
                              <span className="text-[10px] bg-[#e8f0fe] text-[#1d4ed8] px-1.5 py-0.5 rounded-md font-medium flex items-center gap-0.5">
                                <Building2 className="w-2.5 h-2.5" />
                                {entry.student.department}
                              </span>
                            )}
                            {entry.student?.domain && (
                              <span className="text-[10px] bg-[#ecfdf5] text-[#059669] px-1.5 py-0.5 rounded-md font-medium flex items-center gap-0.5">
                                <Globe className="w-2.5 h-2.5" />
                                {entry.student.domain}
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] text-[#334b6e] break-words">{entry.value}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {entry.type && entry.type !== "Daily Update" && (
                              <span className="text-[10px] bg-[#fef3c7] text-[#b45309] px-2 py-0.5 rounded-full font-semibold">
                                {entry.type}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">{formatTime(entry.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ TIMELINE VIEW ═══ */}
          {progressView === "timeline" && (
            <div className="bg-white rounded-2xl sm:rounded-[28px] shadow-[0_10px_22px_rgba(0,20,40,0.04)] border border-[#e2eaf5] p-4 sm:p-6">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[19px] sm:left-[23px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-orange-500 via-rose-300 to-[#e2eaf5]" />

                <div className="space-y-4">
                  {activities.map((entry, idx) => (
                    <div
                      key={entry._id || idx}
                      className="relative flex gap-4 pl-2"
                    >
                      {/* Timeline dot */}
                      <div className="relative z-10 mt-1.5">
                        <div className="w-[14px] h-[14px] sm:w-[18px] sm:h-[18px] rounded-full bg-white border-[3px] border-orange-500 shadow-sm flex items-center justify-center">
                          <div className="w-[4px] h-[4px] sm:w-[6px] sm:h-[6px] rounded-full bg-orange-500" />
                        </div>
                      </div>

                      {/* Content card */}
                      <div className="flex-1 bg-[#f8fbff] rounded-xl border border-[#e8eff8] hover:border-[#c2d7fb] p-3 sm:p-4 transition-colors mb-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shrink-0 overflow-hidden">
                            {entry.student?.profilePicture ? (
                              <img src={entry.student.profilePicture} alt={entry.student?.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-white text-[9px] font-bold">
                                {getInitials(entry.student?.name)}
                              </span>
                            )}
                          </div>
                          <span className="text-[13px] font-bold text-[#16212e]">
                            {entry.student?.name || "Unknown"}
                          </span>
                          {entry.student?.department && (
                            <span className="text-[10px] bg-[#e8f0fe] text-[#1d4ed8] px-1.5 py-0.5 rounded-md font-medium flex items-center gap-0.5">
                              <Building2 className="w-2.5 h-2.5" />
                              {entry.student.department}
                            </span>
                          )}
                          {entry.student?.domain && (
                            <span className="text-[10px] bg-[#ecfdf5] text-[#059669] px-1.5 py-0.5 rounded-md font-medium flex items-center gap-0.5">
                              <Globe className="w-2.5 h-2.5" />
                              {entry.student.domain}
                            </span>
                          )}
                          <span className="ml-auto text-[11px] text-[#6f89b0] font-semibold flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDateShort(entry.date)}
                          </span>
                        </div>
                        <p className="text-[13px] text-[#334b6e] break-words leading-relaxed">
                          {entry.value}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {entry.type && entry.type !== "Daily Update" && (
                            <span className="text-[10px] bg-[#fef3c7] text-[#b45309] px-2 py-0.5 rounded-full font-semibold">
                              {entry.type}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">{formatTime(entry.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ Pagination ═══ */}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs font-medium text-slate-500">
            Showing{" "}
            <span className="font-bold text-slate-700">
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
            </span>{" "}
            of <span className="font-bold text-slate-700">{total}</span> entries
          </p>

          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
            >
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            </button>

            {(() => {
              const pages = [];
              let start = Math.max(1, page - 2);
              let end = Math.min(totalPages, page + 2);
              if (page <= 3) end = Math.min(5, totalPages);
              if (page >= totalPages - 2) start = Math.max(1, totalPages - 4);

              if (start > 1) {
                pages.push(
                  <button
                    key={1}
                    onClick={() => setPage(1)}
                    className="h-9 w-9 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all duration-200 shadow-sm"
                  >
                    1
                  </button>
                );
                if (start > 2)
                  pages.push(
                    <span key="s1" className="text-slate-400 px-1 text-xs">…</span>
                  );
              }

              for (let i = start; i <= end; i++) {
                pages.push(
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`h-9 w-9 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      i === page
                        ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-200"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
                    }`}
                  >
                    {i}
                  </button>
                );
              }

              if (end < totalPages) {
                if (end < totalPages - 1)
                  pages.push(
                    <span key="s2" className="text-slate-400 px-1 text-xs">…</span>
                  );
                pages.push(
                  <button
                    key={totalPages}
                    onClick={() => setPage(totalPages)}
                    className="h-9 w-9 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all duration-200 shadow-sm"
                  >
                    {totalPages}
                  </button>
                );
              }

              return pages;
            })()}

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
            >
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>
          </div>
        </div>
      )}

      {/* Fetching indicator */}
      {isFetching && !isLoading && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-white shadow-xl border border-slate-200 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-600">Updating…</span>
        </div>
      )}
    </DashboardLayout>
  );
}
