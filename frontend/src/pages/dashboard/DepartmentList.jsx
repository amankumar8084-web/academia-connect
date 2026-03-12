import { useState, useEffect } from "react";
import api from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Globe, GraduationCap, UserCheck, ChevronRight, ArrowLeft, Plus, Edit2, Trash2, X, Mail, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

export default function DepartmentList() {
  const { role } = useAuth();
  const isSuperAdmin = role === 'super-admin';
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const navigate = useNavigate();

  // Dialog states
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptName, setDeptName] = useState("");
  const [deptDomains, setDeptDomains] = useState([]);
  const [newDomain, setNewDomain] = useState("");

  const fetchDepartments = async () => {
    try {
      const response = await api.get("/departments");
      setDepartments(response.data);
    } catch (error) {
      toast.error("Failed to fetch department list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleDomainClick = async (domain) => {
    setSelectedDomain(domain);
    try {
      const response = await api.get(`/users/domain/${encodeURIComponent(domain)}`);
      setStudents(response.data.students || []);
      setFaculty(response.data.faculty || []);
    } catch (error) {
      toast.error("Failed to fetch domain details");
    }
  };

  const resetView = () => {
    if (selectedDomain) {
      setSelectedDomain(null);
      setStudents([]);
      setFaculty([]);
    } else if (selectedDept) {
      setSelectedDept(null);
    }
  };

  const openAddDeptDialog = () => {
    setEditingDept(null);
    setDeptName("");
    setDeptDomains([]);
    setIsDeptDialogOpen(true);
  };

  const openEditDeptDialog = (e, dept) => {
    e.stopPropagation();
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptDomains(dept.domains);
    setIsDeptDialogOpen(true);
  };

  const addDomainToDept = () => {
    if (newDomain.trim()) {
      setDeptDomains([...deptDomains, newDomain.trim()]);
      setNewDomain("");
    }
  };

  const removeDomainFromDept = (index) => {
    setDeptDomains(deptDomains.filter((_, i) => i !== index));
  };

  const saveDepartment = async () => {
    if (!deptName.trim()) {
      toast.error("Department name is required");
      return;
    }

    try {
      if (editingDept) {
        await api.put(`/departments/${editingDept._id}`, { name: deptName, domains: deptDomains });
        toast.success("Department updated successfully");
      } else {
        await api.post("/departments", { name: deptName, domains: deptDomains });
        toast.success("Department created successfully");
      }
      setIsDeptDialogOpen(false);
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save department");
    }
  };

  const deleteDepartment = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this department?")) {
      try {
        await api.delete(`/departments/${id}`);
        toast.success("Department deleted successfully");
        fetchDepartments();
      } catch (error) {
        toast.error("Failed to delete department");
      }
    }
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  };

  if (loading) return <DashboardLayout><div className="text-center py-20">Loading...</div></DashboardLayout>;

  return <DashboardLayout>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          {(selectedDept || selectedDomain) && (
            <button
              onClick={resetView}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground truncate">
              {selectedDomain ? `${selectedDomain}` : selectedDept ? `${selectedDept.name} Domains` : "Institutional Departments"}
            </h2>
            <p className="text-sm text-muted-foreground truncate">
              {selectedDomain
                ? `Students & Faculty in ${selectedDept?.name || ''} → ${selectedDomain}`
                : selectedDept ? "Browse specialization areas" : "Overview of all departments"}
            </p>
          </div>
        </div>
        {isSuperAdmin && !selectedDept && !selectedDomain && (
          <Button onClick={openAddDeptDialog} className="bg-primary hover:bg-primary/90 text-primary-foreground self-start sm:self-auto shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Add Department
          </Button>
        )}
      </div>

      {!selectedDept ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {departments.length === 0 ? (
            <div className="col-span-full text-center py-20 text-muted-foreground bg-white rounded-xl shadow-sm border-none">
              No departments found
            </div>
          ) : (
            departments.map((dept) => (
              <Card
                key={dept._id}
                className="shadow-sm border border-border/50 bg-card cursor-pointer hover:shadow-md transition-all hover:-translate-y-1 relative group"
                onClick={() => setSelectedDept(dept)}
              >
                {isSuperAdmin && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary-foreground hover:bg-primary/90" onClick={(e) => openEditDeptDialog(e, dept)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive-foreground hover:bg-destructive/90" onClick={(e) => deleteDepartment(e, dept._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-foreground truncate" title={dept.name}>{dept.name}</h3>
                      <p className="text-xs text-muted-foreground">{dept.domains.length} Specialized Domains</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : !selectedDomain ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {selectedDept.domains.length === 0 ? (
            <div className="col-span-full text-center py-20 text-muted-foreground bg-white rounded-xl shadow-sm border-none">
              No specialized domains listed for this department
            </div>
          ) : (
            selectedDept.domains.map((domain) => (
              <Card
                key={domain}
                className="shadow-sm border border-border/50 bg-card cursor-pointer hover:shadow-md transition-all hover:-translate-y-1"
                onClick={() => handleDomainClick(domain)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Globe className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base text-foreground break-words leading-snug" title={domain}>{domain}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">View Students &amp; Faculty</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Faculty Section */}
          <Card className="shadow-sm border border-border/50 bg-card">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <UserCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Faculty — {selectedDept?.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{faculty.length} faculty member{faculty.length !== 1 ? 's' : ''} in this department</p>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mobile card view */}
              <div className="md:hidden space-y-3">
                {faculty.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No faculty assigned to this department</div>
                ) : (
                  faculty.map((f) => (
                    <div
                      key={f._id}
                      className="rounded-xl border border-border/50 bg-white p-4 space-y-2 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                      onClick={() => navigate(`/dashboard/admin/user/${f._id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          {f.profilePicture && <AvatarImage src={f.profilePicture} alt={f.name} />}
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-[10px] font-bold">
                            {getInitials(f.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">{f.name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1" title={f.email}><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{f.email}</span></p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="font-medium flex items-center gap-1">{f.phone ? <><Phone className="h-3 w-3 shrink-0" />{f.phone}</> : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Department</p>
                          <p className="font-medium">{f.department || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto">
                <Table className="min-w-[560px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Faculty</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Department</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faculty.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No faculty assigned to this department</TableCell></TableRow>
                    ) : (
                      faculty.map((f) => (
                        <TableRow
                          key={f._id}
                          className="cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => navigate(`/dashboard/admin/user/${f._id}`)}
                        >
                          <TableCell className="font-medium flex items-center gap-3 text-foreground">
                            <Avatar className="h-8 w-8">
                              {f.profilePicture && <AvatarImage src={f.profilePicture} alt={f.name} />}
                              <AvatarFallback className="bg-blue-100 text-blue-700 text-[10px] font-bold">
                                {getInitials(f.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{f.name || 'N/A'}</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px]">
                            <span className="flex items-center gap-1.5 truncate" title={f.email}><Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{f.email}</span></span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {f.phone ? <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{f.phone}</span> : 'N/A'}
                          </TableCell>
                          <TableCell>{f.department || 'N/A'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Students Section */}
          <Card className="shadow-sm border border-border/50 bg-card">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Students — {selectedDomain}</CardTitle>
                <p className="text-sm text-muted-foreground">{students.length} student{students.length !== 1 ? 's' : ''} assigned to this domain</p>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mobile card view */}
              <div className="md:hidden space-y-3">
                {students.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No students assigned to this domain</div>
                ) : (
                  students.map((s) => (
                    <div
                      key={s._id}
                      className="rounded-xl border border-border/50 bg-white p-4 space-y-2 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                      onClick={() => navigate(`/dashboard/admin/user/${s._id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          {s.profilePicture && <AvatarImage src={s.profilePicture} alt={s.name} />}
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                            {getInitials(s.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">{s.name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1" title={s.email}><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{s.email}</span></p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Reg. No.</p>
                          <p className="font-medium">{s.regNo || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Year</p>
                          <p className="font-medium">{s.year || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto">
                <Table className="min-w-[560px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Registration No.</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Year</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No students assigned to this domain</TableCell></TableRow>
                    ) : (
                      students.map((s) => (
                        <TableRow
                          key={s._id}
                          className="cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => navigate(`/dashboard/admin/user/${s._id}`)}
                        >
                          <TableCell className="font-medium flex items-center gap-3 text-foreground">
                            <Avatar className="h-8 w-8">
                              {s.profilePicture && <AvatarImage src={s.profilePicture} alt={s.name} />}
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                {getInitials(s.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{s.name || 'N/A'}</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{s.regNo || 'N/A'}</TableCell>
                           <TableCell className="text-muted-foreground max-w-[200px]">
                            <span className="flex items-center gap-1.5 truncate" title={s.email}><Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{s.email}</span></span>
                          </TableCell>
                          <TableCell>{s.year || 'N/A'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>

    {/* Add/Edit Department Dialog */}
    <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingDept ? "Edit Department" : "Add New Department"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dept-name">Department Name</Label>
            <Input id="dept-name" value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="e.g. CSE" />
          </div>
          <div className="space-y-2">
            <Label>Business Domains</Label>
            <div className="flex gap-2">
              <Input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="Add domain..." onKeyDown={(e) => e.key === 'Enter' && addDomainToDept()} />
              <Button onClick={addDomainToDept} size="icon" className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {deptDomains.map((domain, index) => (
                <span key={index} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm font-medium">
                  {domain}
                  <button onClick={() => removeDomainFromDept(index)} className="hover:text-primary-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDeptDialogOpen(false)}>Cancel</Button>
          <Button onClick={saveDepartment} className="bg-primary hover:bg-primary/90 text-primary-foreground">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </DashboardLayout>;
}
