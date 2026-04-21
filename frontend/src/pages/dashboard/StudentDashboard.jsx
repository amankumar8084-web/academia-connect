import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  GraduationCap,
  Users,
  UserSquare2,
  TrendingUp,
  Calendar,
  Plus,
  History,
  ShieldCheck,
  LogOut,
  Settings,
  ChevronDown,
  User as UserIcon,
  Mail,
  FileText,
  Clock,
  CheckCircle2,
  Ban,
  Power,
  Info,
  ExternalLink,
  Phone,
  Building2,
  MapPin,
  Search,
  Filter,
  Edit,
  Trash2
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  LabelList
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import Skeleton from "react-loading-skeleton";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [updateValue, setUpdateValue] = useState("");
  
  // Modal states
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [isFacultiesModalOpen, setIsFacultiesModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Edit state
  const [editingLog, setEditingLog] = useState(null);
  const [editValue, setEditValue] = useState("");

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  // Fetch Stats (Students & Faculties)
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["publicStats"],
    queryFn: async () => {
      const res = await api.get("/users/public/stats");
      return res.data;
    }
  });

  // Fetch Departments
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await api.get("/departments");
      return res.data;
    }
  });

  // Fetch My Updates
  const { data: myUpdates = [], isLoading: updatesLoading } = useQuery({
    queryKey: ["myUpdates"],
    queryFn: async () => {
      const res = await api.get("/users/student/updates/my");
      return res.data;
    }
  });

  // Fetch My Profile (detailed)
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?._id],
    queryFn: async () => {
      const res = await api.get(`/users/${user?._id}`);
      return res.data;
    },
    enabled: !!user?._id
  });

  // Fetch All Students (for modal)
  const { data: allStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["allStudents"],
    queryFn: async () => {
      const res = await api.get("/users/role/student");
      return res.data;
    },
    enabled: isStudentsModalOpen
  });

  // Fetch All Faculties (for modal)
  const { data: allFaculties = [], isLoading: facultiesLoading } = useQuery({
    queryKey: ["allFaculties"],
    queryFn: async () => {
      const res = await api.get("/users/role/admin");
      return res.data;
    },
    enabled: isFacultiesModalOpen
  });

  // Mutations with Optimistic Updates
  const submitUpdateMutation = useMutation({
    mutationFn: async (newUpdate) => {
      const res = await api.post("/users/student/updates", newUpdate);
      return res.data;
    },
    onMutate: async (newUpdate) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["myUpdates"] });
      
      // Snapshot the previous value
      const previousUpdates = queryClient.getQueryData(["myUpdates"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(["myUpdates"], (old) => [
        { 
          ...newUpdate, 
          _id: `temp-${Date.now()}`, 
          createdAt: new Date().toISOString() 
        },
        ...(old || []),
      ]);
      
      return { previousUpdates };
    },
    onError: (err, newUpdate, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(["myUpdates"], context.previousUpdates);
      toast.error(err.response?.data?.message || "Failed to save update. Please try again.");
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the correct data from the server
      queryClient.invalidateQueries({ queryKey: ["myUpdates"] });
    },
    onSuccess: (data) => {
      toast.success("Progress saved successfully!");
      setUpdateValue("");
    },
  });

  const deleteUpdateMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/users/student/updates/${id}`);
      return res.data;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["myUpdates"] });
      const previousUpdates = queryClient.getQueryData(["myUpdates"]);
      queryClient.setQueryData(["myUpdates"], (old) => 
        (old || []).filter(update => update._id !== id)
      );
      return { previousUpdates };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(["myUpdates"], context.previousUpdates);
      toast.error("Failed to delete log");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["myUpdates"] });
    },
    onSuccess: () => {
      toast.success("Log removed");
    }
  });

  const editUpdateMutation = useMutation({
    mutationFn: async ({ id, value }) => {
      const res = await api.put(`/users/student/updates/${id}`, { value });
      return res.data;
    },
    onMutate: async ({ id, value }) => {
      await queryClient.cancelQueries({ queryKey: ["myUpdates"] });
      const previousUpdates = queryClient.getQueryData(["myUpdates"]);
      queryClient.setQueryData(["myUpdates"], (old) => 
        (old || []).map(update => update._id === id ? { ...update, value } : update)
      );
      return { previousUpdates };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["myUpdates"], context.previousUpdates);
      toast.error("Failed to update log");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["myUpdates"] });
      setEditingLog(null);
    },
    onSuccess: () => {
      toast.success("Log corrected");
    }
  });

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    if (!updateValue) return toast.error("Please enter a value");

    const today = new Date().toISOString().split('T')[0];
    submitUpdateMutation.mutate({
      date: today,
      type: "Daily Update",
      value: updateValue
    });
  };

  const handleEditClick = useCallback((log) => {
    setEditingLog(log);
    setEditValue(log.value);
  }, []);

  const handleEditSubmit = () => {
    if (!editValue) return toast.error("Value cannot be empty");
    editUpdateMutation.mutate({ id: editingLog._id, value: editValue });
  };

  // Efficient Data Processing
  const extractAndSumNumbers = useCallback((str) => {
    if (typeof str === 'number') return str;
    const matches = str.match(/-?\d+(\.\d+)?/g);
    if (!matches) return 1; 
    return matches.reduce((sum, n) => sum + parseFloat(n), 0);
  }, []);

  const dashboardChartData = useMemo(() => {
    const grouped = myUpdates.reduce((acc, curr) => {
      const val = extractAndSumNumbers(curr.value);
      if (!acc[curr.date]) {
        acc[curr.date] = { date: curr.date, total: 0 };
      }
      acc[curr.date].total += val;
      return acc;
    }, {});

    return Object.values(grouped)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-7)
      .map(u => ({
        name: new Date(u.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: u.total,
        rawDate: u.date
      }));
  }, [myUpdates, extractAndSumNumbers]);

  const lastUpdate = useMemo(() => {
    if (!myUpdates.length) return "—";
    return myUpdates[0].date;
  }, [myUpdates]);

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  const filteredStudents = useMemo(() => {
    return allStudents.filter(u => {
      const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           u.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = deptFilter === "all" || u.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [allStudents, searchTerm, deptFilter]);

  const filteredFaculties = useMemo(() => {
    return allFaculties.filter(u => {
      const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           u.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = deptFilter === "all" || u.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [allFaculties, searchTerm, deptFilter]);

  // Helper Modal Content Component
  const UserListModal = ({ title, icon: Icon, users, loading, isOpen, setIsOpen }) => (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col p-8 rounded-[40px] border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black flex items-center gap-3">
            <Icon className="text-blue-600" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search by name..." 
              className="pl-11 h-12 rounded-2xl bg-slate-50 border-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-200">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <SelectValue placeholder="All Departments" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => (
                <SelectItem key={d._id} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 mt-6 pr-2 custom-scrollbar">
          {loading ? (
            <Skeleton count={5} height={60} className="mb-3 rounded-2xl" />
          ) : users.length === 0 ? (
            <div className="text-center py-10 text-slate-400">No matches found.</div>
          ) : users.map((u) => (
            <div key={u._id} onClick={() => setSelectedUser(u)} className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 rounded-[24px] cursor-pointer transition-all">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold overflow-hidden bg-white border border-slate-100">
                {u.profilePicture ? (
                  <img src={u.profilePicture} alt={u.name} className="h-full w-full object-cover" />
                ) : getInitials(u.name)}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-800 leading-none mb-1">{u.name}</span>
                <span className="text-xs text-slate-400">{u.department || "General"}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-300 ml-auto -rotate-90" />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );

  if (profileLoading || statsLoading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="space-y-8 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-3xl" />)}
          </div>
          <div className="h-64 bg-slate-100 rounded-3xl w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Student Dashboard">
      <div className="max-w-[1400px] mx-auto space-y-5 sm:space-y-8 pb-6 sm:pb-10">

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { 
              label: "Total Students", 
              value: stats?.students || 0, 
              icon: Users, 
              gradient: "from-blue-500 to-indigo-600",
              shadow: "shadow-blue-500/25",
              onClick: () => setIsStudentsModalOpen(true)
            },
            { 
              label: "Total Faculties", 
              value: stats?.faculty || 0, 
              icon: UserIcon, 
              gradient: "from-violet-500 to-purple-600",
              shadow: "shadow-violet-500/25",
              onClick: () => setIsFacultiesModalOpen(true)
            },
            { 
              label: "My Updates", 
              value: myUpdates.length, 
              icon: TrendingUp, 
              gradient: "from-emerald-500 to-teal-600",
              shadow: "shadow-emerald-500/25",
              onClick: () => setIsHistoryModalOpen(true)
            },
            { 
              label: "Last Update", 
              value: lastUpdate, 
              icon: Calendar, 
              gradient: "from-orange-500 to-rose-500",
              shadow: "shadow-orange-500/25"
            }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={stat.onClick}
              className={`bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[32px] border border-slate-100 shadow-sm transition-all duration-300 ${stat.onClick ? "hover:shadow-xl hover:-translate-y-1 cursor-pointer" : ""}`}
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className={`bg-gradient-to-br ${stat.gradient} p-2 sm:p-2.5 rounded-xl sm:rounded-2xl shadow-lg ${stat.shadow}`}>
                  <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</h3>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{stat.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Daily Update Action Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-[40px] border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-5 sm:gap-8 relative overflow-hidden"
        >
          <div className="relative z-10 flex flex-col gap-1.5 sm:gap-2 lg:flex-1 w-full">
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 flex items-center justify-center lg:justify-start gap-2 sm:gap-3">
              <Plus className="text-blue-600 w-5 h-5 sm:w-6 sm:h-6" />
              Daily Progress
            </h2>
            <p className="text-slate-500 font-medium text-sm sm:text-base text-center lg:text-left">Add multiple updates per day to track your detailed progress.</p>
          </div>

          <form onSubmit={handleUpdateSubmit} className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-end gap-2 sm:gap-3 w-full lg:flex-[2]">
            <Input
              type="text"
              placeholder="Today's progress..."
              value={updateValue}
              onChange={(e) => setUpdateValue(e.target.value)}
              className="flex-1 h-11 sm:h-12 rounded-full bg-slate-50 border-slate-200 text-slate-700 font-semibold px-5 sm:px-6 focus:ring-blue-500 text-sm sm:text-base"
            />
            <Button
              type="submit"
              disabled={submitUpdateMutation.isPending}
              className="h-11 sm:h-12 px-6 sm:px-8 rounded-full bg-slate-900 hover:bg-blue-600 text-white font-bold shadow-lg shadow-slate-200 transition-all flex gap-2 shrink-0 text-sm sm:text-base justify-center"
            >
              {submitUpdateMutation.isPending ? "Adding..." : "Add Entry"}
            </Button>
          </form>
        </motion.div>

        {/* Analytics & History Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
          <div className="lg:col-span-2 bg-white p-4 sm:p-8 rounded-2xl sm:rounded-[40px] border border-slate-100 shadow-sm space-y-4 sm:space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3">
                <TrendingUp className="text-blue-600" />
                Performance Trends
              </h3>
            </div>

            <div className="h-[260px] sm:h-[400px] w-full mt-3 sm:mt-4 relative bg-slate-50/30 rounded-2xl sm:rounded-3xl p-2 sm:p-4">
              {dashboardChartData.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                  <TrendingUp className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-sm font-medium">No activity data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardChartData} layout="vertical" margin={{ left: 10, right: 60, top: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2} />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#1e293b', fontSize: 13, fontWeight: 800 }} 
                      width={70} 
                    />
                    <Tooltip 
                      cursor={{ stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '5 5' }}
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#2563eb" 
                      strokeWidth={5} 
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                      animationDuration={2000}
                      filter="url(#glow)"
                      dot={{ r: 6, fill: '#fff', stroke: '#2563eb', strokeWidth: 3 }}
                      activeDot={{ r: 8, fill: '#2563eb', stroke: '#fff', strokeWidth: 3 }}
                    >
                      <LabelList 
                        dataKey="value" 
                        position="right" 
                        offset={20} 
                        style={{ fill: '#1e293b', fontSize: 14, fontWeight: 900, fontFamily: 'Inter' }} 
                      />
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest mt-2">Showing Daily Performance Context (Vertical View)</p>
          </div>

          <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-[40px] border border-slate-100 shadow-sm space-y-4 sm:space-y-6">
            <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3">
              <History className="text-slate-600" />
              Recent Logs
            </h3>
            <div className="space-y-3 sm:space-y-4 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
              {myUpdates.length === 0 ? (
                <Skeleton count={5} height={60} className="mb-4 rounded-2xl" />
              ) : myUpdates.slice(0, 15).map((u) => (
                <div key={u._id} className="group relative flex flex-col gap-1 p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-slate-400">{u.date}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => handleEditClick(u)} className="p-1 hover:bg-white rounded-md text-slate-400 hover:text-blue-600 transition-colors">
                          <Edit className="w-3 h-3" />
                       </button>
                       <button onClick={() => deleteUpdateMutation.mutate(u._id)} className="p-1 hover:bg-white rounded-md text-slate-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-3 h-3" />
                       </button>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-800 break-words">{u.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MODALS */}
        
        <UserListModal 
          title="Students List" 
          icon={Users} 
          users={filteredStudents} 
          loading={studentsLoading} 
          isOpen={isStudentsModalOpen} 
          setIsOpen={setIsStudentsModalOpen} 
        />
        
        <UserListModal 
          title="Faculties List" 
          icon={UserIcon} 
          users={filteredFaculties} 
          loading={facultiesLoading} 
          isOpen={isFacultiesModalOpen} 
          setIsOpen={setIsFacultiesModalOpen} 
        />

        <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-8 rounded-2xl sm:rounded-[40px] border-none shadow-2xl mx-2">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                <History className="text-emerald-600" />
                Management Console
              </DialogTitle>
              <DialogDescription>View, edit, or delete your historical progress logs.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-4 mt-6 pr-2 custom-scrollbar">
              {myUpdates.map((u) => (
                <div key={u._id} className="p-3 sm:p-5 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-[24px] flex justify-between items-start sm:items-center group gap-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.date}</span>
                    <p className="text-sm sm:text-base font-semibold text-slate-800 break-words">{u.value}</p>
                  </div>
                  <div className="flex gap-1 sm:gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-all shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(u)} className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl hover:bg-white hover:text-blue-600">
                      <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteUpdateMutation.mutate(u._id)} className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl hover:bg-white hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingLog} onOpenChange={() => setEditingLog(null)}>
          <DialogContent className="sm:max-w-[450px] p-4 sm:p-8 rounded-2xl sm:rounded-[40px] border-none shadow-2xl mx-2">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Edit Progress Log</DialogTitle>
              <DialogDescription className="font-medium text-slate-500">Correct your activity entry below.</DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Your Update</label>
              <Input 
                value={editValue} 
                onChange={(e) => setEditValue(e.target.value)} 
                className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-semibold"
              />
            </div>
            <DialogFooter className="flex gap-3">
              <Button variant="ghost" onClick={() => setEditingLog(null)} className="h-12 rounded-2xl font-bold flex-1">Cancel</Button>
              <Button onClick={handleEditSubmit} disabled={editUpdateMutation.isPending} className="h-12 rounded-2xl bg-slate-900 hover:bg-blue-600 font-bold flex-1">
                {editUpdateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl sm:rounded-[40px] mx-2">
             {selectedUser && (
               <div className="flex flex-col bg-white">
                 <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6 sm:p-10 text-white text-center">
                    <div className="mx-auto w-24 h-24 mb-4 rounded-[32px] overflow-hidden bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center p-1 shadow-2xl">
                       <div className="w-full h-full rounded-[26px] overflow-hidden bg-white/10 flex items-center justify-center font-black text-2xl">
                          {selectedUser.profilePicture ? (
                            <img src={selectedUser.profilePicture} alt={selectedUser.name} className="h-full w-full object-cover" />
                          ) : getInitials(selectedUser.name)}
                       </div>
                    </div>
                    <h3 className="text-2xl font-black tracking-tight">{selectedUser.name}</h3>
                    <p className="text-blue-300 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">{selectedUser.role?.replace('-', ' ')}</p>
                 </div>
                 
                 <div className="p-4 sm:p-8 space-y-3 sm:space-y-4">
                    {[
                      { icon: Mail, label: "Email", value: selectedUser.email },
                      { icon: Building2, label: "Department", value: selectedUser.department || "General" },
                      { icon: Phone, label: "Phone", value: selectedUser.phone, hide: !selectedUser.phone },
                      { icon: MapPin, label: "Specialization", value: selectedUser.domain, hide: !selectedUser.domain }
                    ].map((item, i) => !item.hide && (
                      <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                          <item.icon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                          <span className="text-sm font-bold text-slate-800">{item.value}</span>
                        </div>
                      </div>
                    ))}
                    <Button onClick={() => setSelectedUser(null)} className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold mt-4">Close Profile</Button>
                 </div>
               </div>
             )}
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}