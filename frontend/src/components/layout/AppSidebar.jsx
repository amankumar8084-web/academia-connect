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
    label: "Industry Posts",
    icon: Briefcase,
    path: "/community"
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
    <SidebarHeader className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
          <GraduationCap className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-sidebar-foreground">PROJECT MAYAA</p>
          {role !== 'super-admin' && (
            <p className="text-xs text-sidebar-foreground/60 capitalize">
              {role?.replace("_", " ") ?? "Loading..."}
            </p>
          )}
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