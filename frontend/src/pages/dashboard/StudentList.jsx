import { useState, useEffect } from "react";
import api from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { GraduationCap, Mail, Phone, Building2, Calendar, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchStudents = async () => {
    try {
      const response = await api.get("/users/role/student");
      setStudents(response.data);
    } catch (error) {
      toast.error("Failed to fetch student list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">Student Management</h2>
          <p className="text-sm text-muted-foreground">View and manage student profiles</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : students.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No students found</div>
        ) : (
          <>
            {/* Desktop view — table */}
            <Card className="shadow-sm border border-border/50 bg-card hidden md:block">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-xl font-bold">Student Directory</CardTitle>
                <span className="ml-auto text-sm text-muted-foreground">{students.length} students</span>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Student</th>
                      <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Registration No.</th>
                      <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Department</th>
                      <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Year</th>
                      <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Domain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr
                        key={s._id}
                        className="border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/dashboard/admin/user/${s._id}`)}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {s.profilePicture && <AvatarImage src={s.profilePicture} alt={s.name || s.email} />}
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                {s.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || s.email?.charAt(0).toUpperCase() || 'S'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium text-foreground">{s.name || s.email || 'N/A'}</span>
                              {s.name && <p className="text-xs text-muted-foreground truncate max-w-[180px]">{s.email}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">{s.regNo || 'N/A'}</td>
                        <td className="py-3 px-3">{s.department || 'N/A'}</td>
                        <td className="py-3 px-3">{s.year || 'N/A'}</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/10">
                            {s.domain || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Mobile view — card list */}
            <div className="md:hidden space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-lg">Student Directory</h3>
                <span className="ml-auto text-xs text-muted-foreground">{students.length} students</span>
              </div>
              {students.map((s) => (
                <div
                  key={s._id}
                  className="rounded-xl border border-border/50 bg-card p-4 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
                  onClick={() => navigate(`/dashboard/admin/user/${s._id}`)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      {s.profilePicture && <AvatarImage src={s.profilePicture} alt={s.name || s.email} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {s.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || s.email?.charAt(0).toUpperCase() || 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{s.name || s.email || 'N/A'}</p>
                      {s.name && <p className="text-xs text-muted-foreground truncate">{s.email}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {s.regNo && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{s.regNo}</span>
                      </div>
                    )}
                    {s.department && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{s.department}</span>
                      </div>
                    )}
                    {s.year && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{s.year}</span>
                      </div>
                    )}
                    {s.domain && (
                      <div>
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {s.domain}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}