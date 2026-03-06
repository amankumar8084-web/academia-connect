import { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import {
  Users, UserPlus, Building2, CheckCircle2, Search, RefreshCw,
  Download, Trash2, Eye, Edit2, ArrowLeftRight, AlertTriangle, X
} from "lucide-react";

export default function FacultyList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super-admin";
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  // Add Dialog
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [formData, setFormData] = useState({ name: "", email: "", department: "", phone: "", domain: "" });

  // Replace Dialog
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [replacingFaculty, setReplacingFaculty] = useState(null);
  const [replaceSelectedDept, setReplaceSelectedDept] = useState(null);
  const [replaceForm, setReplaceForm] = useState({ name: "", email: "", department: "", phone: "", domain: "" });

  const fetchFaculty = async () => {
    try {
      const response = await api.get("/users/role/admin");
      setFaculty(response.data);
    } catch (error) {
      toast.error("Failed to fetch faculty list");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get("/departments");
      setDepartments(response.data);
    } catch (error) {
      console.error("Failed to fetch departments");
    }
  };

  useEffect(() => {
    fetchFaculty();
    fetchDepartments();
  }, []);

  // Filtered faculty
  const filteredFaculty = useMemo(() => {
    let list = faculty;
    if (deptFilter !== "all") {
      list = list.filter(f => f.department === deptFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f =>
        (f.name || "").toLowerCase().includes(q) ||
        (f.email || "").toLowerCase().includes(q) ||
        (f.department || "").toLowerCase().includes(q) ||
        (f.domain || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [faculty, deptFilter, searchQuery]);

  // Unique departments from faculty for filter
  const uniqueDepts = useMemo(() => {
    const set = new Set(faculty.map(f => f.department).filter(Boolean));
    return Array.from(set).sort();
  }, [faculty]);

  // Dept change for add form
  const handleDeptChange = (value) => {
    const dept = departments.find(d => d.name === value);
    setSelectedDept(dept);
    setFormData({ ...formData, department: value, domain: "" });
  };

  const handleReplaceDeptChange = (value) => {
    const dept = departments.find(d => d.name === value);
    setReplaceSelectedDept(dept);
    setReplaceForm({ ...replaceForm, department: value, domain: "" });
  };

  // Create faculty
  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.department || !formData.phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    setCreating(true);
    try {
      await api.post("/users/admin", formData);
      toast.success("Faculty account created and credentials sent via email.");
      setFormData({ name: "", email: "", department: "", phone: "", domain: "" });
      setSelectedDept(null);
      setIsAddOpen(false);
      fetchFaculty();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create faculty");
    } finally {
      setCreating(false);
    }
  };

  // Delete faculty
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name || 'this faculty member'}?`)) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success("Faculty deleted successfully");
      fetchFaculty();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete faculty");
    }
  };

  // Open replace dialog
  const openReplace = (f) => {
    setReplacingFaculty(f);
    setReplaceForm({ name: "", email: "", department: f.department || "", phone: "", domain: "" });
    const dept = departments.find(d => d.name === f.department);
    setReplaceSelectedDept(dept || null);
    setIsReplaceOpen(true);
  };

  // Replace faculty
  const handleReplace = async (e) => {
    e.preventDefault();
    if (!replaceForm.name || !replaceForm.email || !replaceForm.department || !replaceForm.phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    setCreating(true);
    try {
      await api.post(`/users/admin/${replacingFaculty._id}/replace`, replaceForm);
      toast.success("Faculty replaced successfully! Credentials sent to new member.");
      setIsReplaceOpen(false);
      setReplacingFaculty(null);
      setReplaceForm({ name: "", email: "", department: "", phone: "", domain: "" });
      fetchFaculty();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to replace faculty");
    } finally {
      setCreating(false);
    }
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  // Export CSV
  const exportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Department", "Domain"];
    const rows = filteredFaculty.map(f => [f.name || "", f.email || "", f.phone || "", f.department || "", f.domain || ""]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "faculty_list.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Faculty list exported!");
  };

  return <DashboardLayout>
    <div className="space-y-5">


      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-xl p-5 shadow-sm border border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Faculty Management</h2>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {isSuperAdmin && (
            <Button onClick={() => setIsAddOpen(true)} className="bg-[#1e3c72] hover:bg-[#2a5298] text-white text-xs sm:text-sm">
              <UserPlus className="h-4 w-4 mr-1.5 sm:mr-2" /> Add New Faculty
            </Button>
          )}
          <Button variant="outline" onClick={() => { setLoading(true); fetchFaculty(); }} className="text-xs sm:text-sm">
            <RefreshCw className="h-4 w-4 mr-1.5 sm:mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Faculty Table */}
      <Card className="shadow-sm border border-border/50 bg-card">
        <CardContent className="p-5">
          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search faculty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {uniqueDepts.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="text-center py-10 text-muted-foreground">Loading...</div>
            ) : filteredFaculty.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">No faculty members found</div>
            ) : (
              filteredFaculty.map((f) => (
                <div key={f._id} className="bg-white border border-border/50 rounded-xl p-4 space-y-3">
                  {/* Top: Avatar + Name */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      {f.profilePicture && <AvatarImage src={f.profilePicture} alt={f.name} />}
                      <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
                        {getInitials(f.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{f.name || "N/A"}</p>
                      <p className="text-xs text-muted-foreground truncate">{f.email}</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium">{f.phone || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="font-medium">{f.department || "N/A"}</p>
                    </div>
                    {f.domain && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">Domain</p>
                        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          {f.domain}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {isSuperAdmin && (
                    <div className="flex gap-2 pt-2 border-t border-border/30">
                      <Button variant="outline" size="sm" className="flex-1 min-h-[40px] text-xs"
                        onClick={() => navigate(`/dashboard/admin/user/${f._id}`)}>
                        <Eye className="h-3.5 w-3.5 mr-1.5" /> View
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 min-h-[40px] text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                        onClick={() => openReplace(f)}>
                        <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" /> Replace
                      </Button>
                      <Button variant="outline" size="sm" className="min-h-[40px] text-xs text-destructive border-destructive/30 hover:bg-destructive/10 px-3"
                        onClick={() => handleDelete(f._id, f.name)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faculty Member</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Domain / Expertise</TableHead>
                  {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10">Loading...</TableCell></TableRow>
                ) : filteredFaculty.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No faculty members found</TableCell></TableRow>
                ) : (
                  filteredFaculty.map((f) => (
                    <TableRow key={f._id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            {f.profilePicture && <AvatarImage src={f.profilePicture} alt={f.name} />}
                            <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
                              {getInitials(f.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">{f.name || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">{f.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{f.phone || "N/A"}</TableCell>
                      <TableCell>{f.department || "N/A"}</TableCell>
                      <TableCell>
                        {f.domain ? (
                          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                            {f.domain}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => navigate(`/dashboard/admin/user/${f._id}`)} title="View">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                              onClick={() => openReplace(f)} title="Replace">
                              <ArrowLeftRight className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(f._id, f.name)} title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>

    {/* ── Add Faculty Dialog ── */}
    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
      <DialogContent className="w-[95vw] max-w-[550px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <UserPlus className="h-5 w-5 text-blue-600" /> Add New Faculty
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateFaculty} className="space-y-4 py-2">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Full Name *</Label>
              <Input placeholder="Dr. John Doe" value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })} required className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Email Address *</Label>
              <Input type="email" placeholder="faculty@institution.edu" value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })} required className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Phone Number *</Label>
              <Input placeholder="1234567890" maxLength={10} value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })} required className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Department *</Label>
              <Select value={formData.department} onValueChange={handleDeptChange}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select Department" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d._id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-sm">Domain / Expertise</Label>
              <Select value={formData.domain} onValueChange={(v) => setFormData({ ...formData, domain: v })} disabled={!selectedDept}>
                <SelectTrigger className="h-10"><SelectValue placeholder={selectedDept ? "Select Domain" : "Select Dept First"} /></SelectTrigger>
                <SelectContent>
                  {selectedDept?.domains.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={creating} className="w-full sm:w-auto bg-[#16a34a] hover:bg-[#15803d] text-white">
              {creating ? "Creating..." : "Save Faculty"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* ── Replace Faculty Dialog ── */}
    <Dialog open={isReplaceOpen} onOpenChange={setIsReplaceOpen}>
      <DialogContent className="w-[95vw] max-w-[550px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ArrowLeftRight className="h-5 w-5 text-amber-500" /> Replace Faculty Member
          </DialogTitle>
        </DialogHeader>

        {/* Warning notice */}
        <div className="flex items-start gap-2 sm:gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs sm:text-sm">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            You are about to replace <strong>{replacingFaculty?.name || replacingFaculty?.email}</strong>.
            This will remove their account and create a new one. The new member will receive login credentials via email.
          </p>
        </div>

        <form onSubmit={handleReplace} className="space-y-4 py-2">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm">New Faculty Name *</Label>
              <Input placeholder="Dr. Jane Smith" value={replaceForm.name}
                onChange={e => setReplaceForm({ ...replaceForm, name: e.target.value })} required className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">New Email *</Label>
              <Input type="email" placeholder="new.faculty@institution.edu" value={replaceForm.email}
                onChange={e => setReplaceForm({ ...replaceForm, email: e.target.value })} required className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Phone Number *</Label>
              <Input placeholder="1234567890" maxLength={10} value={replaceForm.phone}
                onChange={e => setReplaceForm({ ...replaceForm, phone: e.target.value.replace(/\D/g, '') })} required className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Department *</Label>
              <Select value={replaceForm.department} onValueChange={handleReplaceDeptChange}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select Department" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d._id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-sm">Domain / Expertise</Label>
              <Select value={replaceForm.domain} onValueChange={(v) => setReplaceForm({ ...replaceForm, domain: v })} disabled={!replaceSelectedDept}>
                <SelectTrigger className="h-10"><SelectValue placeholder={replaceSelectedDept ? "Select Domain" : "Select Dept First"} /></SelectTrigger>
                <SelectContent>
                  {replaceSelectedDept?.domains.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsReplaceOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={creating} className="w-full sm:w-auto bg-[#1e3c72] hover:bg-[#2a5298] text-white">
              {creating ? "Replacing..." : "Replace & Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </DashboardLayout>;
}