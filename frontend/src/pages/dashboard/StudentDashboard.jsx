import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GraduationCap, Users, UserSquare2, BookOpen } from "lucide-react";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [assignedFaculty, setAssignedFaculty] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?._id) return;
    (async () => {
      try {
        const [profileRes, facultyRes] = await Promise.all([
          api.get(`/users/${user._id}`),
          api.get('/users/role/admin')
        ]);
        setProfile(profileRes.data);

        const stProfile = profileRes.data;
        const allFaculty = facultyRes.data;

        const stDomains = (stProfile.domain || "").split(',').map(d => d.trim()).filter(Boolean);

        const assigned = allFaculty.filter(f => {
          if (f.department !== stProfile.department && !f.department) return false; // Basic matching
          const fDomains = (f.domain || "").split(',').map(d => d.trim()).filter(Boolean);
          if (stDomains.length > 0 && fDomains.length > 0) {
            return fDomains.some(d => stDomains.includes(d));
          }
          return f.department === stProfile.department;
        });

        setAssignedFaculty(assigned);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  };

  if (loading) {
    return (
      <DashboardLayout title="Student Dashboard">
        <div className="flex items-center justify-center py-20">Loading dashboard...</div>
      </DashboardLayout>
    );
  }

  // Placeholder data for Groups since it's not yet implemented in backend
  const userGroups = [
    { name: "AI Research Project", members: 5, role: "Creator" },
    { name: "Web Dev Team", members: 4, role: "Member" },
    { name: "Study Group 2024", members: 6, role: "Member" },
    { name: "Hackathon Team", members: 3, role: "Creator" }
  ];

  return (
    <DashboardLayout title="Student Dashboard">
      <div className="max-w-[1200px] mx-auto pb-8">

        {/* Student Header */}
        <div className="bg-white rounded-2xl p-5 mb-6 md:mb-8 shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-slate-200 flex flex-col md:flex-row items-center md:items-start gap-4 text-center md:text-left animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="w-[60px] h-[60px] rounded-full bg-[#1e3c72] flex items-center justify-center text-white text-xl md:text-2xl font-semibold shrink-0 overflow-hidden border-2 border-slate-100">
            {profile?.profilePicture ? (
              <img src={profile.profilePicture} alt={profile?.name} className="w-full h-full object-cover" />
            ) : (
              getInitials(profile?.name || profile?.email)
            )}
          </div>
          <div className="flex-1 mt-1">
            <h1 className="text-xl md:text-2xl font-semibold text-[#1e3c72] mb-1.5">{profile?.name || "Student"}</h1>
            <p className="text-slate-500 text-[0.95rem] flex flex-wrap items-center justify-center md:justify-start gap-1.5 md:gap-2">
              <GraduationCap className="text-blue-600 w-[18px] h-[18px] shrink-0" />
              {profile?.department || "No Department"}
              <span className="hidden md:inline">•</span>
              {profile?.year || "Year N/A"}
              <span className="hidden md:inline">•</span>
              Roll: {profile?.regNo || "N/A"}
            </p>
          </div>
        </div>

        {/* Two Box Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 lg:gap-8 mb-8">

          {/* Box 1: Assigned Faculty */}
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-slate-200 transition-transform active:scale-[0.98] animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-[45px] h-[45px] rounded-xl flex items-center justify-center bg-blue-100 text-blue-600 shrink-0">
                <UserSquare2 className="w-[22px] h-[22px]" />
              </div>
              <span className="font-semibold text-slate-800 text-base">Assigned Faculty</span>
            </div>

            <div className="flex flex-col">
              {assignedFaculty.length === 0 ? (
                <p className="text-slate-500 text-sm py-4 text-center bg-slate-50 rounded-lg">No faculty assigned to your domain.</p>
              ) : (
                assignedFaculty.map((faculty, idx) => (
                  <div key={faculty._id || idx} className="flex items-center justify-between py-3 border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors px-2 -mx-2 rounded-lg cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-[35px] h-[35px] rounded-full bg-slate-100 flex items-center justify-center text-blue-600 font-semibold text-sm shrink-0 overflow-hidden border border-slate-200">
                        {faculty.profilePicture ? (
                          <img src={faculty.profilePicture} alt={faculty.name} className="w-full h-full object-cover" />
                        ) : (
                          getInitials(faculty.name || faculty.email)
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800 text-[0.95rem]">{faculty.name || faculty.email}</div>
                        <div className="text-[0.8rem] text-slate-500">{faculty.department || "General"}</div>
                      </div>
                    </div>
                    <span className="text-[0.75rem] px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium whitespace-nowrap">Active</span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 text-right border-t border-slate-100 pt-3">
              <span className="text-blue-600 text-[0.9rem] font-medium">{assignedFaculty.length} faculty assigned</span>
            </div>
          </div>

          {/* Box 2: Groups Information */}
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-slate-200 transition-transform active:scale-[0.98] animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-[45px] h-[45px] rounded-xl flex items-center justify-center bg-green-100 text-green-600 shrink-0">
                <Users className="w-[22px] h-[22px]" />
              </div>
              <span className="font-semibold text-slate-800 text-base">Groups (Coming Soon)</span>
            </div>

            <div className="flex flex-col gap-3.5 mb-5 space-y-1">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100/50">
                <span className="text-slate-500 text-[0.95rem] font-medium">Groups Created</span>
                <span className="font-bold text-[1.3rem] text-blue-600">2</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100/50">
                <span className="text-slate-500 text-[0.95rem] font-medium">Groups Enrolled</span>
                <span className="font-bold text-[1.3rem] text-green-600">4</span>
              </div>
            </div>

            <div className="flex flex-col mt-2">
              {userGroups.map((group, idx) => (
                <div key={idx} className="flex justify-between items-center py-2.5 border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors px-2 -mx-2 rounded-lg cursor-pointer">
                  <div>
                    <div className="font-medium text-slate-800 text-[0.95rem] flex items-center gap-1.5 pl-1">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      {group.name}
                    </div>
                    <div className="text-[0.82rem] text-slate-500 ml-5">{group.members} members</div>
                  </div>
                  <span className={`text-[0.75rem] px-2.5 py-1 rounded-full whitespace-nowrap font-medium ${group.role === 'Creator' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                    {group.role}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 text-right border-t border-slate-100 pt-3">
              <span className="text-green-600 text-[0.9rem] font-medium">{userGroups.length} total groups</span>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}