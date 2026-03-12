import { useState, useEffect } from "react";
import api from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Mail, Phone, Calendar, Building2, GraduationCap,
  Globe, Users, Eye, Search, UserRound, MessageSquare
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [assignedFaculty, setAssignedFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get(`/users/${id}`);
        setUser(data);
        setEditForm({
          name: data.name || '',
          phone: data.phone || '',
          year: data.year || '',
          regNo: data.regNo || '',
          address: data.address || '',
        });

        // If viewing a faculty member, also fetch their students
        if (data.role === 'admin') {
          try {
            const studentsRes = await api.get(`/users/${id}/students`);
            setStudents(studentsRes.data);
          } catch {
            // Not critical — may not have permission
          }
        }

        // If viewing a student, fetch assigned faculty
        if (data.role === 'student') {
          try {
            const facultyRes = await api.get(`/users/${id}/faculty`);
            setAssignedFaculty(facultyRes.data);
          } catch {
            // Not critical — may not have permission
          }
        }
      } catch (error) {
        toast.error("Failed to fetch user profile");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  if (loading) return <DashboardLayout><div className="text-center py-20">Loading...</div></DashboardLayout>;
  if (!user) return <DashboardLayout><div className="text-center py-20">User not found</div></DashboardLayout>;

  const displayName = user.name || user.email?.split('@')[0] || 'User';
  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user.email?.charAt(0).toUpperCase() || 'U';

  const isFaculty = user.role === 'admin';
  const isStudent = user.role === 'student';

  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'N/A';

  // Filter students by search
  const filteredStudents = studentSearch.trim()
    ? students.filter(s =>
      (s.name || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.regNo || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(studentSearch.toLowerCase())
    )
    : students;

  const getStudentInitials = (name) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  // Check if current user is faculty and viewing one of their students
  const canEdit = currentUser?.role === 'admin' && user?.role === 'student' &&
    (currentUser.domain ? user.domain?.includes(currentUser.domain) : user.department === currentUser.department);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/users/${id}`, editForm);
      // Backend returns { message, user } — read the user object
      setUser(res.data.user || res.data);
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return <DashboardLayout>
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Navigation */}
      <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-border/50">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
        </Button>
        <span className="text-sm font-semibold text-[#1e3c72]">
          {isFaculty ? "Faculty Profile" : isStudent ? "Student Profile" : "User Profile"}
        </span>
      </div>

      {/* Profile Header */}
      <Card className="shadow-sm border border-border/50 bg-card">
        <CardContent className="p-5 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar */}
            <Avatar className="h-24 w-24 shadow-md ring-4 ring-white shrink-0">
              {user.profilePicture && <AvatarImage src={user.profilePicture} alt={displayName} />}
              <AvatarFallback className="bg-[#1e3c72] text-white text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Name + Meta */}
            <div className="flex-1 text-center sm:text-left w-full">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1e3c72] mb-1">{displayName}</h1>
              <p className="text-muted-foreground mb-4">
                {isFaculty && user.department ? `${user.department} Faculty` : ''}
                {isStudent && user.department ? `${user.department} Student` : ''}
                {!user.department ? user.role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : ''}
              </p>

              {/* Meta grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 sm:col-span-2 lg:col-span-1">
                  <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-semibold break-all">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                  <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                    <Phone className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-semibold">{user.phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                  <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="text-sm font-semibold">{joinedDate}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Managing Count (Faculty only) */}
      {isFaculty && (
        <div className="max-w-sm mx-auto sm:mx-0">
          <Card className="shadow-sm border border-border/50 bg-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1e3c72]">{students.length}</p>
                <p className="text-sm text-muted-foreground">Students Managing</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Personal Information */}
      <Card className="shadow-sm border border-border/50 bg-card">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <UserRound className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-[#1e3c72]">Personal Information</h2>
            </div>
            {canEdit && !isEditing && (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )}
            {canEdit && isEditing && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border-l-[3px] border-blue-600">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Full Name</p>
              {isEditing ? (
                <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="h-8 text-sm bg-white" />
              ) : (
                <p className="font-semibold text-foreground">{displayName}</p>
              )}
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border-l-[3px] border-blue-600">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Department</p>
              <p className="font-semibold text-foreground">{user.department || 'N/A'} <span className="text-[10px] text-gray-400 font-normal ml-1">(Unchangeable)</span></p>
            </div>
            {(isFaculty || isStudent) && user.domain && (
              <div className="bg-slate-50 p-3.5 rounded-xl border-l-[3px] border-blue-600">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Domain / Expertise</p>
                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                  <Globe className="h-3.5 w-3.5" />
                  {user.domain}
                </span>
                {isEditing && <span className="text-[10px] text-gray-400 block mt-1">(Unchangeable)</span>}
              </div>
            )}
            {isStudent && (
              <>
                <div className="bg-slate-50 p-3.5 rounded-xl border-l-[3px] border-blue-600">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Registration No.</p>
                  {isEditing ? (
                    <Input value={editForm.regNo} onChange={e => setEditForm({ ...editForm, regNo: e.target.value })} className="h-8 text-sm bg-white" />
                  ) : (
                    <p className="font-semibold text-foreground">{user.regNo || 'N/A'}</p>
                  )}
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border-l-[3px] border-blue-600">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Current Year</p>
                  {isEditing ? (
                    <Input value={editForm.year} onChange={e => setEditForm({ ...editForm, year: e.target.value })} className="h-8 text-sm bg-white" />
                  ) : (
                    <p className="font-semibold text-foreground">{user.year || 'N/A'}</p>
                  )}
                </div>
              </>
            )}
            {(user.address || isEditing) && (
              <div className="bg-slate-50 p-3.5 rounded-xl border-l-[3px] border-blue-600 sm:col-span-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Address</p>
                {isEditing ? (
                  <Input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className="h-8 text-sm bg-white" />
                ) : (
                  <p className="font-semibold text-foreground">{user.address}</p>
                )}
              </div>
            )}
            {isEditing && (
              <div className="bg-slate-50 p-3.5 rounded-xl border-l-[3px] border-blue-600 sm:col-span-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Phone</p>
                <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="h-8 text-sm bg-white" maxLength={10} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assigned Faculty Section (Student only) */}
      {isStudent && assignedFaculty.length > 0 && (
        <Card className="shadow-sm border border-border/50 bg-card">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-border/50">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-[#1e3c72]">Assigned Faculty</h2>
            </div>
            <div className="divide-y divide-border/50">
              {assignedFaculty.map((f) => (
                <div
                  key={f._id}
                  className="flex items-center gap-3 py-3 cursor-pointer hover:bg-slate-50/80 px-2 -mx-2 rounded-lg transition-colors"
                  onClick={() => navigate(`/dashboard/admin/user/${f._id}`)}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    {f.profilePicture && <AvatarImage src={f.profilePicture} alt={f.name} />}
                    <AvatarFallback className="bg-slate-100 text-blue-600 text-xs font-bold">
                      {f.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{f.name || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground truncate" title={f.email}>{f.email}</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs shrink-0 hidden sm:flex"
                    onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/admin/user/${f._id}`); }}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Students Section (Faculty only) */}
      {isFaculty && (
        <Card className="shadow-sm border border-border/50 bg-card">
          <CardContent className="p-5 sm:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-[#1e3c72]">Students ({students.length})</h2>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>

            {/* Student rows */}
            <div className="divide-y divide-border/50">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  {students.length === 0 ? "No students under this faculty" : "No students match your search"}
                </div>
              ) : (
                filteredStudents.map((s) => (
                  <div
                    key={s._id}
                    className="flex items-center gap-3 py-3 cursor-pointer hover:bg-slate-50/80 px-2 -mx-2 rounded-lg transition-colors"
                    onClick={() => navigate(`/dashboard/admin/user/${s._id}`)}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      {s.profilePicture && <AvatarImage src={s.profilePicture} alt={s.name} />}
                      <AvatarFallback className="bg-slate-100 text-blue-600 text-xs font-bold">
                        {getStudentInitials(s.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{s.name || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.department || ''} {s.year ? `• ${s.year}` : ''} {s.regNo ? `• ${s.regNo}` : ''}
                      </p>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" title="Active" />
                    <Button variant="outline" size="sm" className="h-8 text-xs shrink-0 hidden sm:flex"
                      onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/admin/user/${s._id}`); }}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message Button */}
      <div className="flex justify-center pb-4">
        <Button
          className="bg-green-600 hover:bg-green-700 text-white px-8"
          onClick={() => navigate('/dashboard/chat')}
        >
          <MessageSquare className="h-4 w-4 mr-2" /> Send Message
        </Button>
      </div>
    </div>
  </DashboardLayout>;
}