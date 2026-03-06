import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { NotificationDropdown } from "./NotificationDropdown";

export function DashboardLayout({
  children,
  title,
  description
}) {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  return <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <header className="flex h-16 items-center justify-between border-b border-border/50 px-4 sm:px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex items-center gap-3 sm:gap-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          <div className="hidden sm:flex flex-col">
            <h1 className="font-display text-lg font-bold text-foreground leading-none">Welcome {user?.name || "User"}!</h1>
            <p className="text-xs text-muted-foreground mt-1"></p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <NotificationDropdown />
          <div
            className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-border/50 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/profile")}
            role="button"
            tabIndex={0}
            title="View Profile"
          >
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-sm font-semibold text-foreground leading-none">{user?.name || "User"}</p>
              {role !== 'super-admin' && (
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{role?.replace("_", " ") || "Loading..."}</p>
              )}
            </div>
            <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground border border-border/50 hover:ring-2 hover:ring-primary/30 transition-all overflow-hidden">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <span className="font-bold text-xs sm:text-sm">
                  {initials}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 bg-background animate-fade-in">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
          {children}
        </div>
      </main>
    </SidebarInset>
  </SidebarProvider>;
}