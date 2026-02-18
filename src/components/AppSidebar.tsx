import { LayoutDashboard, Upload, BarChart3, BrainCircuit, TrafficCone, Activity } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Data Upload", url: "/upload", icon: Upload },
  { title: "Analysis", url: "/analysis", icon: BarChart3 },
  { title: "Predictions", url: "/predictions", icon: BrainCircuit },
  { title: "Signal Control", url: "/signals", icon: TrafficCone },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="bg-sidebar pt-2">
        {/* Logo */}
        <div className={`flex items-center gap-2 px-4 py-3 mb-2 ${collapsed ? 'justify-center px-2' : ''}`}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 border border-primary/30">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-xs font-bold text-foreground leading-tight">ITPCS</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Traffic Control</p>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? 'sr-only' : ''}>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md px-2 py-2 transition-colors"
                      activeClassName="bg-sidebar-primary/20 text-sidebar-primary border border-sidebar-primary/30"
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <div className="mt-auto px-3 py-4 mx-2 mb-2 rounded-lg bg-muted/30 border border-border">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">System</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-traffic-low animate-pulse-slow" />
              <span className="text-xs text-foreground">All systems online</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">LSTM Model v2.1 loaded</p>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
