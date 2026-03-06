import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
    GraduationCap, UserPlus, Search, RefreshCw, Mail, Phone,
    Building2, Trash2, ArrowLeftRight, Eye, Undo2, Save,
    X, AlertTriangle, ChevronLeft, ChevronRight, Shield, ArrowLeft, Code, Edit2
} from "lucide-react";

const ROWS_PER_PAGE = 5;

export default function FacultyStudents() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();

    // View state: 'list', 'my', or 'add'
    const viewParam = searchParams.get("view");
    const [view, setView] = useState(viewParam === "my" ? "my" : "list");

    // Sync view state if URL changes
    useEffect(() => {
        if (viewParam === "my") setView("my");
        else if (viewParam === "list") setView("list");
        else if (viewParam === "add") setView("add");
    }, [viewParam]);

    const [creating, setCreating] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [selectedDept, setSelectedDept] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [myStudents, setMyStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [deptFilter, setDeptFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);

    // Updated formData and replaceForm to have domains as an array
    const [formData, setFormData] = useState({
        name: "", email: "", phone: "", department: "", year: "", regNo: "", domains: []
    });

    const [replaceOpen, setReplaceOpen] = useState(false);
    const [replacingStudent, setReplacingStudent] = useState(null);
    const [replaceDept, setReplaceDept] = useState(null);
    const [replaceForm, setReplaceForm] = useState({
        name: "", email: "", phone: "", department: "", year: "", regNo: "", domains: []
    });

    const [message, setMessage] = useState(null);
    const showMessage = useCallback((text, type = "success") => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3500);
    }, []);

    const fetchDepartments = async () => {
        try {
            const response = await api.get("/departments");
            setDepartments(response.data);
        } catch (error) {
            console.error("Failed to fetch departments");
        }
    };

    const fetchUsers = async () => {
        try {
            const { data } = await api.get("/chat/users");
            setAllUsers(data);
        } catch {
            toast.error("Failed to fetch users");
        }
    };

    const fetchMyStudents = useCallback(async () => {
        if (!user?._id) return;
        try {
            const { data } = await api.get(`/users/${user._id}/students`);
            setMyStudents(data);
        } catch (error) {
            console.error("Failed to fetch my students", error);
        }
    }, [user]);

    useEffect(() => {
        fetchDepartments();
        fetchUsers();
    }, []);

    useEffect(() => {
        fetchMyStudents();
    }, [fetchMyStudents]);

    const students = useMemo(() => allUsers.filter(u => u.role === "student"), [allUsers]);

    const filteredStudents = useMemo(() => {
        let list = view === 'my' ? (Array.isArray(myStudents) ? myStudents : []) : (Array.isArray(students) ? students : []);
        if (deptFilter !== "all") {
            list = list.filter(s => s?.department === deptFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(s =>
                (s?.name || "").toLowerCase().includes(q) ||
                (s?.email || "").toLowerCase().includes(q) ||
                (s?.regNo || "").toLowerCase().includes(q)
            );
        }
        return list;
    }, [students, myStudents, deptFilter, searchQuery, view]);

    const totalPages = Math.max(1, Math.ceil(filteredStudents.length / ROWS_PER_PAGE));
    const paginatedStudents = useMemo(() => {
        const start = (currentPage - 1) * ROWS_PER_PAGE;
        return filteredStudents.slice(start, start + ROWS_PER_PAGE);
    }, [filteredStudents, currentPage]);

    useEffect(() => { setCurrentPage(1); }, [searchQuery, deptFilter]);

    const uniqueDepts = useMemo(() => {
        const set = new Set(students.map(s => s.department).filter(Boolean));
        return Array.from(set).sort();
    }, [students]);

    const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

    const handleDeptChange = (value) => {
        const dept = departments.find(d => d.name === value);
        setSelectedDept(dept);
        setFormData({ ...formData, department: value, domains: [] });
    };

    const toggleDomain = (domain) => {
        setFormData(prev => {
            const updated = prev.domains.includes(domain)
                ? prev.domains.filter(d => d !== domain)
                : [...prev.domains, domain];
            return { ...prev, domains: updated };
        });
    };

    const handleCreateStudent = async e => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.department || !formData.regNo) {
            showMessage("Name, email, department and registration are required.", "error");
            return;
        }
        if (formData.domains.length === 0) {
            showMessage("Select at least one domain.", "error");
            return;
        }
        setCreating(true);
        try {
            // Join domains array to a comma-separated string for backend compatibility
            const payload = { ...formData, domain: formData.domains.join(', ') };
            await api.post("/users/student", payload);
            showMessage("Student added successfully. Credentials sent via email.");
            toast.success("Student account created!");
            clearForm();
            fetchUsers();
            setView('list'); // Switch back to list after creation
        } catch (error) {
            showMessage(error.response?.data?.message || "Failed to create student", "error");
        } finally {
            setCreating(false);
        }
    };

    const clearForm = () => {
        setFormData({ name: "", email: "", phone: "", department: "", year: "", regNo: "", domains: [] });
        setSelectedDept(null);
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete ${name || "this student"}?`)) return;
        try {
            await api.delete(`/users/${id}`);
            showMessage("Student deleted successfully");
            fetchUsers();
        } catch (error) {
            showMessage(error.response?.data?.message || "Failed to delete student", "error");
        }
    };

    const openReplace = (s) => {
        setReplacingStudent(s);
        // Assuming s.domain is a comma-separated string from the backend
        const initialDomains = s.domain ? s.domain.split(', ').filter(Boolean) : [];
        setReplaceForm({ name: "", email: "", phone: "", department: s.department || "", year: "", regNo: "", domains: initialDomains });
        const dept = departments.find(d => d.name === s.department);
        setReplaceDept(dept || null);
        setReplaceOpen(true);
        setTimeout(() => {
            document.getElementById("replace-form-section")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleReplaceDeptChange = (value) => {
        const dept = departments.find(d => d.name === value);
        setReplaceDept(dept);
        setReplaceForm({ ...replaceForm, department: value, domains: [] });
    };

    const toggleReplaceDomain = (domain) => {
        setReplaceForm(prev => {
            const updated = prev.domains.includes(domain)
                ? prev.domains.filter(d => d !== domain)
                : [...prev.domains, domain];
            return { ...prev, domains: updated };
        });
    };

    const handleReplace = async (e) => {
        e.preventDefault();
        if (!replaceForm.name || !replaceForm.email || !replaceForm.department) {
            showMessage("Name, email and department are required for new student", "error");
            return;
        }
        if (replaceForm.domains.length === 0) {
            showMessage("Select at least one domain.", "error");
            return;
        }
        setCreating(true);
        try {
            const payload = { ...replaceForm, domain: replaceForm.domains.join(', ') };
            await api.post(`/users/admin/${replacingStudent._id}/replace`, payload);
            showMessage("Student replaced successfully! Credentials sent to new member.");
            setReplaceOpen(false);
            setReplacingStudent(null);
            fetchUsers();
            if (view === 'my') fetchMyStudents();
        } catch (error) {
            showMessage(error.response?.data?.message || "Failed to replace student", "error");
        } finally {
            setCreating(false);
        }
    };

    const facultyName = user?.name || "Faculty";

    // Auto-select department if faculty
    useEffect(() => {
        if (user?.role === 'admin' && user?.department && departments.length > 0) {
            if (!formData.department) {
                const dept = departments.find(d => d.name === user.department);
                setSelectedDept(dept || null);
                setFormData(prev => ({ ...prev, department: user.department }));
            }
        }
    }, [user, departments, view, formData.department]);

    // Allowed domains for faculty
    const allowedDomains = useMemo(() => {
        if (user?.role !== 'admin' || !user?.domain) return null;
        return user.domain.split(',').map(d => d.trim()).filter(Boolean);
    }, [user]);

    return (
        <DashboardLayout title="Student Management" description="Manage student accounts">
            <div className="max-w-[1400px] mx-auto">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-7">
                    <h1 className="text-xl sm:text-[28px] font-semibold text-[#0b2b4f] flex items-center gap-2.5">
                        <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-[#1d4ed8]" />
                        Faculty Student Management
                    </h1>
                    <span className="bg-[#e2ebf9] text-[#1f4b8a] px-3 sm:px-3.5 py-1.5 rounded-full text-[13px] sm:text-[14px] font-medium flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" /> {facultyName}
                    </span>
                </div>

                {message && (
                    <div className={`px-4 sm:px-5 py-3 rounded-full font-medium text-sm mb-5 transition-all ${message.type === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                        {message.text}
                    </div>
                )}

                {/* ADD STUDENT VIEW */}
                {view === 'add' && (
                    <div className="bg-white rounded-2xl sm:rounded-[30px] p-5 sm:p-7 shadow-[0_12px_30px_rgba(0,30,70,0.05)] border-2 border-[#1d4ed8] mb-6 sm:mb-8 transition-all">
                        <div
                            className="inline-flex items-center gap-2 mb-6 font-semibold text-[#1d4ed8] cursor-pointer hover:underline text-sm sm:text-base"
                            onClick={() => setView('list')}
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to student list
                        </div>

                        <div className="text-lg sm:text-xl font-semibold text-[#14325c] mb-5 sm:mb-6 flex items-center gap-2.5">
                            <div className="bg-[#e8f0fe] p-2.5 rounded-[14px]">
                                <UserPlus className="w-5 h-5 text-[#1d4ed8]" />
                            </div>
                            Add new student
                        </div>

                        <form onSubmit={handleCreateStudent}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                                <div className="flex flex-col gap-2">
                                    <Label className="text-[14px] font-medium text-[#2c456e]">Full name *</Label>
                                    <Input placeholder="e.g. John Smith" value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="h-11 rounded-2xl border-[#dae2ed] bg-[#fafcff] focus:border-[#1d4ed8]" required />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label className="text-[14px] font-medium text-[#2c456e]">Email *</Label>
                                    <Input type="email" placeholder="john@university.edu" value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="h-11 rounded-2xl border-[#dae2ed] bg-[#fafcff]" required />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label className="text-[14px] font-medium text-[#2c456e]">Phone</Label>
                                    <Input placeholder="1234567890" maxLength={10} value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                                        className="h-11 rounded-2xl border-[#dae2ed] bg-[#fafcff]" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label className="text-[14px] font-medium text-[#2c456e]">Department *</Label>
                                    <Select value={formData.department} onValueChange={handleDeptChange} disabled={user?.role === 'admin'}>
                                        <SelectTrigger className="h-11 rounded-2xl border-[#dae2ed] bg-[#fafcff]">
                                            <SelectValue placeholder="Select department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map(dept => (
                                                <SelectItem key={dept._id} value={dept.name}>{dept.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label className="text-[14px] font-medium text-[#2c456e]">Year</Label>
                                    <Input placeholder="2nd Year" value={formData.year}
                                        onChange={e => setFormData({ ...formData, year: e.target.value })}
                                        className="h-11 rounded-2xl border-[#dae2ed] bg-[#fafcff]" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label className="text-[14px] font-medium text-[#2c456e]">Registration # *</Label>
                                    <Input placeholder="REG-2025-001" value={formData.regNo}
                                        onChange={e => setFormData({ ...formData, regNo: e.target.value })}
                                        className="h-11 rounded-2xl border-[#dae2ed] bg-[#fafcff]" required />
                                </div>
                            </div>

                            <div className="mt-6 sm:mt-8">
                                <Label className="text-[14px] font-semibold text-[#1d3c6b] mb-3 flex items-center gap-1.5"><Code className="w-4 h-4" /> Domains (select at least one)</Label>
                                <div className="flex flex-wrap gap-4 sm:gap-6 bg-[#f0f6ff] rounded-2xl sm:rounded-[26px] p-4 sm:p-5">
                                    {!selectedDept && <span className="text-sm text-[#546f8b]">Select a department to view domains.</span>}
                                    {selectedDept?.domains?.map(domain => {
                                        const isAllowed = !allowedDomains || allowedDomains.includes(domain);
                                        if (!isAllowed) return null; // hide domains faculty isn't part of
                                        return (
                                            <label key={domain} className="flex items-center gap-2 cursor-pointer text-[#1f3b66] font-medium text-sm sm:text-base">
                                                <Checkbox
                                                    checked={formData.domains.includes(domain)}
                                                    onCheckedChange={() => toggleDomain(domain)}
                                                    className="w-5 h-5 rounded data-[state=checked]:bg-[#1d4ed8] data-[state=checked]:border-[#1d4ed8]"
                                                />
                                                {domain}
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3 sm:gap-4 mt-8">
                                <Button type="submit" disabled={creating}
                                    className="bg-[#1d4ed8] hover:bg-[#1e3f9e] text-white rounded-full px-6 sm:px-7 h-11 sm:h-12 text-[15px] sm:text-[16px] font-semibold">
                                    <Save className="w-4 h-4 mr-2" />
                                    {creating ? "Adding..." : "Add student (faculty only)"}
                                </Button>
                                <Button type="button" variant="outline" onClick={clearForm}
                                    className="rounded-full px-5 sm:px-6 h-11 sm:h-12 border-[#1d4ed8] text-[#1d4ed8] hover:bg-[#e7f0ff] text-[15px]">
                                    <Undo2 className="w-4 h-4 mr-2" /> Clear
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* MY STUDENTS / ALL STUDENTS SWITCHER */}
                {(view === 'list' || view === 'my') && (
                    <div className="flex gap-2 sm:gap-4 mb-4 border-b border-[#e2eaf5] pb-2 overflow-x-auto">
                        <button
                            onClick={() => { setView('list'); navigate("/dashboard/faculty/students?view=list"); }}
                            className={`px-4 py-2 font-semibold text-[15px] whitespace-nowrap transition-colors border-b-2 ${view === 'list' ? 'border-[#1d4ed8] text-[#1d4ed8]' : 'border-transparent text-[#6b7c9e] hover:text-[#1d4ed8]'}`}
                        >
                            All Students
                        </button>
                        <button
                            onClick={() => { setView('my'); navigate("/dashboard/faculty/students?view=my"); }}
                            className={`px-4 py-2 font-semibold text-[15px] whitespace-nowrap transition-colors border-b-2 ${view === 'my' ? 'border-[#1d4ed8] text-[#1d4ed8]' : 'border-transparent text-[#6b7c9e] hover:text-[#1d4ed8]'}`}
                        >
                            My Assigned Students
                        </button>
                    </div>
                )}

                {/* STUDENT LIST VIEW */}
                {(view === 'list' || view === 'my') && (
                    <div className="transition-all">
                        <div className="flex justify-end mb-5">
                            <Button
                                onClick={() => setView('add')}
                                className="bg-[#1d4ed8] hover:bg-[#1e3f9e] text-white rounded-full px-5 h-10 font-semibold text-sm shadow cursor-pointer">
                                <UserPlus className="w-4 h-4 mr-2" /> Add new student
                            </Button>
                        </div>

                        <div className="bg-white rounded-2xl sm:rounded-[30px] p-5 sm:p-7 shadow-[0_12px_30px_rgba(0,30,70,0.05)] border border-[#dee9f4]">
                            <div className="flex flex-wrap items-center justify-between mb-5 gap-3">
                                <div className="text-lg sm:text-xl font-semibold text-[#14325c] flex items-center gap-2.5">
                                    <div className="bg-[#e8f0fe] p-2.5 rounded-[14px]">
                                        <GraduationCap className="w-5 h-5 text-[#1d4ed8]" />
                                    </div>
                                    {view === 'my' ? "My Assigned Students" : "All Students"}
                                    <span className="text-sm font-normal text-[#546f8b] ml-1">({filteredStudents.length})</span>
                                </div>
                                <span className="bg-[#f0f6ff] text-[#1d4ed8] px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-[#cbe0ff]">
                                    <Shield className="w-3.5 h-3.5" /> Faculty restricted
                                </span>
                            </div>

                            {/* Search & Filter */}
                            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 mb-5">
                                <div className="flex-1 min-w-[200px] flex items-center bg-[#f5f9ff] border border-[#d6e2f0] rounded-full px-4 gap-2">
                                    <Search className="w-4 h-4 text-[#6f89b0] shrink-0" />
                                    <input
                                        type="text" placeholder="Search by name or reg..."
                                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                        className="border-none bg-transparent py-3 w-full text-[15px] focus:outline-none"
                                    />
                                </div>
                                <Select value={deptFilter} onValueChange={setDeptFilter}>
                                    <SelectTrigger className="w-full sm:w-[220px] h-11 rounded-full border-[#d6e2f0] bg-white font-medium text-[#1f3f6b]">
                                        <SelectValue placeholder="All departments" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All departments</SelectItem>
                                        {uniqueDepts.map(d => (
                                            <SelectItem key={d} value={d}>{d}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" onClick={fetchUsers} className="rounded-full h-11 px-4 text-sm">
                                    <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
                                </Button>
                            </div>

                            {/* Mobile Layout */}
                            <div className="md:hidden space-y-3">
                                {paginatedStudents.length === 0 ? (
                                    <div className="text-center py-10 text-[#6b7c9e]">No students found</div>
                                ) : paginatedStudents.map((s) => (
                                    <div key={s._id} className="bg-[#fafcff] border border-[#e6edf6] rounded-2xl p-4 space-y-2.5">
                                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/dashboard/admin/user/${s._id}`)}>
                                            <Avatar className="h-10 w-10 shrink-0">
                                                {s.profilePicture && <AvatarImage src={s.profilePicture} alt={s.name} />}
                                                <AvatarFallback className="bg-[#1d4ed8] text-white text-xs font-semibold rounded-2xl">
                                                    {getInitials(s.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col gap-1">
                                                    <p className="font-semibold text-[#1f3c62] break-words">{s.name || "N/A"}</p>
                                                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold w-fit">Active</span>
                                                </div>
                                                <p className="text-xs text-[#546f8b] break-all">{s.email}</p>
                                                {s.phone && <p className="text-xs text-[#546f8b]">{s.phone}</p>}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <p className="text-[11px] text-[#6b7c9e]">Department</p>
                                                <p className="font-medium text-[#1f3c62]">{s.department || "N/A"}</p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] text-[#6b7c9e]">Reg #</p>
                                                <p className="font-bold text-[#1f3c62]">{s.regNo || "N/A"}</p>
                                            </div>
                                            {s.domain && (
                                                <div className="col-span-2">
                                                    <p className="text-[11px] text-[#6b7c9e]">Domains</p>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {s.domain.split(',').map(d => (
                                                            <span key={d} className="px-2.5 py-1 bg-[#e8f0fe] text-[#1d4ed8] rounded-full text-xs font-medium border border-[#c2d7fb] break-words whitespace-normal text-left">{d.trim()}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 pt-2 border-t border-[#e6edf6]">
                                            <Button variant="outline" size="sm" className="flex-1 min-h-[40px] text-xs rounded-xl"
                                                onClick={() => navigate(`/dashboard/admin/user/${s._id}`)}>
                                                {view === 'my' ? <><Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit</> : <><Eye className="h-3.5 w-3.5 mr-1.5" /> View</>}
                                            </Button>
                                            <Button variant="outline" size="sm" className="flex-1 min-h-[40px] text-xs rounded-xl text-amber-600 border-amber-200 hover:bg-amber-50"
                                                onClick={() => openReplace(s)}>
                                                <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" /> Replace
                                            </Button>
                                            <Button variant="outline" size="sm" className="min-h-[40px] text-xs rounded-xl text-red-500 border-red-200 hover:bg-red-50 px-3"
                                                onClick={() => handleDelete(s._id, s.name)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#e6edf6]">
                                <table className="w-full min-w-[1000px] border-collapse">
                                    <thead>
                                        <tr className="bg-[#eef4fc]">
                                            <th className="text-left py-4 px-4 text-[#11325c] font-semibold text-sm">Profile</th>
                                            <th className="text-left py-4 px-4 text-[#11325c] font-semibold text-sm">Reg number</th>
                                            <th className="text-left py-4 px-4 text-[#11325c] font-semibold text-sm">Email / Phone</th>
                                            <th className="text-left py-4 px-4 text-[#11325c] font-semibold text-sm">Department</th>
                                            <th className="text-left py-4 px-4 text-[#11325c] font-semibold text-sm max-w-[200px]">Domains</th>
                                            <th className="text-center py-4 px-4 text-[#11325c] font-semibold text-sm">Status</th>
                                            <th className="text-right py-4 px-4 text-[#11325c] font-semibold text-sm">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedStudents.length === 0 ? (
                                            <tr><td colSpan={7} className="text-center py-10 text-[#6b7c9e]">No students found</td></tr>
                                        ) : paginatedStudents.map((s) => (
                                            <tr key={s._id} className="border-b border-[#e0eaf5] hover:bg-[#f8fbff] transition-colors">
                                                <td className="py-4 px-4 cursor-pointer" onClick={() => navigate(`/dashboard/admin/user/${s._id}`)}>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-11 w-11">
                                                            {s.profilePicture && <AvatarImage src={s.profilePicture} alt={s.name} />}
                                                            <AvatarFallback className="bg-[#1d4ed8] text-white text-xs font-semibold rounded-2xl">
                                                                {getInitials(s.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-semibold text-[#1f3c62] whitespace-nowrap">{s.name || "N/A"}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 font-bold text-[#1f3c62]">{s.regNo || "—"}</td>
                                                <td className="py-4 px-4">
                                                    <div className="text-[#1f3c62] text-sm break-all">{s.email}</div>
                                                    <div className="text-[#6b7c9e] text-xs mt-0.5">{s.phone || "—"}</div>
                                                </td>
                                                <td className="py-4 px-4 text-[#1f3c62]">{s.department || "N/A"}</td>
                                                <td className="py-4 px-4 min-w-[200px]">
                                                    {s.domain ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {s.domain.split(',').map(d => (
                                                                <span key={d} className="px-2 py-0.5 bg-[#e8f0fe] text-[#1d4ed8] rounded-md text-[11px] font-medium border border-[#c2d7fb] break-words whitespace-normal text-left max-w-full">{d.trim()}</span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[#6b7c9e] text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Active</span>
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => navigate(`/dashboard/admin/user/${s._id}`)}
                                                            className="p-2 rounded-xl hover:bg-[#e8f0fe] text-[#1d4ed8] transition-colors" title={view === 'my' ? "Edit Profile" : "View Profile"}>
                                                            {view === 'my' ? <Edit2 className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                                                        </button>
                                                        <button onClick={() => openReplace(s)}
                                                            className="p-2 rounded-xl hover:bg-amber-50 text-amber-500 transition-colors" title="Replace">
                                                            <ArrowLeftRight className="w-[18px] h-[18px]" />
                                                        </button>
                                                        <button onClick={() => handleDelete(s._id, s.name)}
                                                            className="p-2 rounded-xl hover:bg-red-50 text-red-500 transition-colors" title="Delete">
                                                            <Trash2 className="w-[18px] h-[18px]" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex flex-wrap justify-end gap-2 mt-5">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                        className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-2xl bg-white border border-[#d3e0f0] disabled:opacity-40 hover:bg-[#f0f5fc] transition-colors">
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                        <button key={p} onClick={() => setCurrentPage(p)}
                                            className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-2xl font-semibold text-sm transition-colors ${p === currentPage ? "bg-[#1d4ed8] text-white border-none" : "bg-white border border-[#d3e0f0] hover:bg-[#f0f5fc]"}`}>
                                            {p}
                                        </button>
                                    ))}
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                        className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-2xl bg-white border border-[#d3e0f0] disabled:opacity-40 hover:bg-[#f0f5fc] transition-colors">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Inline Replace Form */}
                            {replaceOpen && replacingStudent && (
                                <div id="replace-form-section" className="mt-6 bg-[#f2f8ff] rounded-2xl sm:rounded-[28px] p-5 sm:p-6 border-2 border-[#1d4ed8]">
                                    <h3 className="text-lg sm:text-[22px] font-semibold text-[#143867] mb-4 flex items-center gap-2">
                                        <ArrowLeftRight className="w-5 h-5 text-amber-500" /> Replace student (with domains)
                                    </h3>

                                    <div className="flex items-start gap-2 sm:gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs sm:text-sm mb-4">
                                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-amber-800">
                                            Replacing <strong>{replacingStudent.name || replacingStudent.email}</strong>. This will exchange their account and register domains for the new member.
                                        </p>
                                    </div>

                                    <form onSubmit={handleReplace}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <Label className="text-sm text-[#2c456e]">Current ID</Label>
                                                <Input value={replacingStudent._id} readOnly
                                                    className="h-10 rounded-xl bg-[#eef4fa] border-[#dae2ed] text-xs" />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <Label className="text-sm text-[#2c456e]">Current name</Label>
                                                <Input value={replacingStudent.name || replacingStudent.email} readOnly
                                                    className="h-10 rounded-xl bg-[#eef4fa] border-[#dae2ed]" />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <Label className="text-sm text-[#2c456e]">New name *</Label>
                                                <Input placeholder="Full name" value={replaceForm.name}
                                                    onChange={e => setReplaceForm({ ...replaceForm, name: e.target.value })}
                                                    className="h-10 rounded-xl border-[#dae2ed] bg-white" required />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <Label className="text-sm text-[#2c456e]">New email *</Label>
                                                <Input type="email" placeholder="new@student.edu" value={replaceForm.email}
                                                    onChange={e => setReplaceForm({ ...replaceForm, email: e.target.value })}
                                                    className="h-10 rounded-xl border-[#dae2ed] bg-white" required />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <Label className="text-sm text-[#2c456e]">New phone</Label>
                                                <Input placeholder="Phone" value={replaceForm.phone} maxLength={10}
                                                    onChange={e => setReplaceForm({ ...replaceForm, phone: e.target.value.replace(/\D/g, '') })}
                                                    className="h-10 rounded-xl border-[#dae2ed] bg-white" />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <Label className="text-sm text-[#2c456e]">New department</Label>
                                                <Select value={replaceForm.department} onValueChange={handleReplaceDeptChange}>
                                                    <SelectTrigger className="h-10 rounded-xl border-[#dae2ed] bg-white">
                                                        <SelectValue placeholder="Select Department" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {departments.map(d => (
                                                            <SelectItem key={d._id} value={d.name}>{d.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex flex-col gap-1.5 lg:col-span-3">
                                                <Label className="text-sm text-[#2c456e]">New registration *</Label>
                                                <Input placeholder="R-2025-XXX" value={replaceForm.regNo}
                                                    onChange={e => setReplaceForm({ ...replaceForm, regNo: e.target.value })}
                                                    className="h-10 rounded-xl border-[#dae2ed] bg-white lg:max-w-xs" required />
                                            </div>
                                        </div>

                                        <div className="mt-5">
                                            <Label className="text-sm font-semibold text-[#1d3c6b] mb-2 block">Select domains for new student</Label>
                                            <div className="flex flex-wrap gap-4 sm:gap-6 bg-[#e9f0fa] rounded-2xl p-4">
                                                {!replaceDept && <span className="text-sm text-[#546f8b]">Select a department to view domains.</span>}
                                                {replaceDept?.domains?.map(domain => (
                                                    <label key={domain} className="flex items-center gap-2 cursor-pointer text-[#1f3b66] font-medium text-sm">
                                                        <Checkbox
                                                            checked={replaceForm.domains.includes(domain)}
                                                            onCheckedChange={() => toggleReplaceDomain(domain)}
                                                            className="w-4 h-4 rounded data-[state=checked]:bg-[#1d4ed8]"
                                                        />
                                                        {domain}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-3 mt-6">
                                            <Button type="submit" disabled={creating}
                                                className="bg-[#10b981] hover:bg-[#0b9b6b] text-white rounded-full px-6 h-11 font-semibold">
                                                <Save className="w-4 h-4 mr-2" /> {creating ? "Replacing..." : "Confirm replace"}
                                            </Button>
                                            <Button type="button" variant="outline" onClick={() => { setReplaceOpen(false); setReplacingStudent(null); }}
                                                className="rounded-full px-5 h-11 border-[#1d4ed8] text-[#1d4ed8] hover:bg-[#e7f0ff]">
                                                <X className="w-4 h-4 mr-2" /> Cancel
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="text-center text-[12px] sm:text-[13px] text-[#6d89af] mt-4 flex items-center justify-center gap-1">
                    <Shield className="w-3 h-3 text-[#1d4ed8]" /> Faculty only · add page separate, list always shows all students
                </div>
            </div>
        </DashboardLayout>
    );
}
