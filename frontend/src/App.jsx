import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import Login from "@/pages/auth/Login";
import LandingPage from "@/pages/LandingPage";
import AdminDashboard from "@/pages/dashboard/AdminDashboard";
import FacultyList from "@/pages/dashboard/FacultyList";
import StudentList from "@/pages/dashboard/StudentList";
import DepartmentList from "@/pages/dashboard/DepartmentList";
import UserProfile from "@/pages/dashboard/UserProfile";
import AdminSettings from "@/pages/dashboard/AdminSettings";
import FacultyDashboard from "@/pages/dashboard/FacultyDashboard";
import FacultyStudents from "@/pages/dashboard/FacultyStudents";
import StudentDashboard from "@/pages/dashboard/StudentDashboard";
import IndustryDashboard from "@/pages/dashboard/IndustryDashboard";
import Chat from "@/pages/Chat";
import CommunityPosts from "@/pages/dashboard/CommunityPosts";
import NotificationsPage from "@/pages/dashboard/NotificationsPage";
import MyProfile from "@/pages/dashboard/MyProfile";
import NotFound from "@/pages/NotFound";
const queryClient = new QueryClient();
const App = () => <QueryClientProvider client={queryClient}>
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

          <Route path="/dashboard/admin" element={<ProtectedRoute allowedRoles={["super-admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/admin/faculty" element={<ProtectedRoute allowedRoles={["super-admin"]}><FacultyList /></ProtectedRoute>} />
          <Route path="/dashboard/admin/users" element={<ProtectedRoute allowedRoles={["super-admin"]}><StudentList /></ProtectedRoute>} />
          <Route path="/dashboard/admin/departments" element={<ProtectedRoute allowedRoles={["super-admin"]}><DepartmentList /></ProtectedRoute>} />
          <Route path="/dashboard/admin/user/:id" element={<ProtectedRoute allowedRoles={["super-admin", "admin"]}><UserProfile /></ProtectedRoute>} />
          <Route path="/dashboard/admin/settings" element={<ProtectedRoute allowedRoles={["super-admin"]}><AdminSettings /></ProtectedRoute>} />
          <Route path="/dashboard/faculty" element={<ProtectedRoute allowedRoles={["admin"]}><FacultyDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/faculty/students" element={<ProtectedRoute allowedRoles={["admin"]}><FacultyStudents /></ProtectedRoute>} />
          <Route path="/dashboard/faculty/faculties" element={<ProtectedRoute allowedRoles={["admin"]}><FacultyList /></ProtectedRoute>} />
          <Route path="/dashboard/student" element={<ProtectedRoute allowedRoles={["student"]}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/industry" element={<ProtectedRoute allowedRoles={["industry_partner"]}><IndustryDashboard /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/community" element={<ProtectedRoute><CommunityPosts /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </TooltipProvider>
</QueryClientProvider>;
export default App;