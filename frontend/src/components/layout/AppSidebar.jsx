import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { LayoutDashboard, MessageSquare, Users, Building2, GraduationCap, Briefcase, LogOut, Globe, Newspaper } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
const navByRole = {
  "super-admin": [{
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard/admin"
  }, {
    label: "Departments",
    icon: Building2,
    path: "/dashboard/admin/departments"
  }, {
    label: "Students",
    icon: GraduationCap,
    path: "/dashboard/admin/users"
  }, {
    label: "Faculty",
    icon: Users,
    path: "/dashboard/admin/faculty"
  }, {
    label: "Community",
    icon: Newspaper,
    path: "/community"
  }, {
    label: "Chat",
    icon: MessageSquare,
    path: "/chat"
  }],
  admin: [{
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard/faculty"
  }, {
    label: "Students",
    icon: GraduationCap,
    path: "/dashboard/faculty/students"
  }, {
    label: "Community",
    icon: Newspaper,
    path: "/community"
  }, {
    label: "Chat",
    icon: MessageSquare,
    path: "/chat"
  }],
  student: [{
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard/student"
  }, {
    label: "Achievements",
    icon: GraduationCap,
    path: "/dashboard/student/achievements"
  }, {
    label: "Community",
    icon: Newspaper,
    path: "/community"
  }, {
    label: "Chat",
    icon: MessageSquare,
    path: "/chat"
  }],
  industry_partner: [{
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard/industry"
  }, {
    label: "My Posts",
    icon: Globe,
    path: "/community"
  }, {
    label: "Community",
    icon: Newspaper,
    path: "/community"
  }, {
    label: "Chat",
    icon: MessageSquare,
    path: "/chat"
  }]
};
export function AppSidebar() {
  const {
    user,
    role,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const items = navByRole[role ?? "student"] ?? navByRole.student;
  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "U";
  return <Sidebar>
    <SidebarHeader className="p-4 border-b border-sidebar-border">
      <div className="flex items-center gap-3">
        {/* Green map icon — matches landing & login navbar */}
        <div style={{
          width: '38px',
          height: '38px',
          background: '#10B981',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.1rem',
          color: '#ffffff',
          flexShrink: 0,
          transition: 'transform 0.3s ease',
        }}
          className="sidebar-logo-icon"
        >
          <i className="fas fa-map"></i>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            lineHeight: 1.2,
            color: 'var(--sidebar-foreground)',
            letterSpacing: '-0.01em',
          }}>
            Project<span style={{ color: '#10B981', marginLeft: '0.15rem' }}>Mayaa</span>
          </span>
          <span style={{
            fontSize: '0.6rem',
            color: 'rgba(255,255,255,0.55)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginTop: '1px',
          }}>
            Engineering • Business • Innovation
          </span>
        </div>
      </div>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map(item => <SidebarMenuItem key={item.path}>
              <SidebarMenuButton isActive={location.pathname === item.path} onClick={() => navigate(item.path)} tooltip={item.label}>
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="mt-auto">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => {
                signOut();
                navigate("/login");
              }} tooltip="Logout" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>;
}