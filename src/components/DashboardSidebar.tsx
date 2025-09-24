import React from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Bot, 
  Users, 
  Phone, 
  Settings, 
  LogOut,
  Plus
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
];

const premiumMenuItems = [
  { title: "Agent erstellen", url: "/create-agent", icon: Plus },
  { title: "Agenten verwalten", url: "/manage-agents", icon: Bot },
  { title: "Telefonnummern", url: "/phone-numbers", icon: Phone },
];

interface DashboardSidebarProps {
  userProfile?: {
    username: string;
    subscription_type: string;
  };
}

export function DashboardSidebar({ userProfile }: DashboardSidebarProps) {
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Fehler beim Abmelden",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-medium hover:bg-primary/90" 
      : "hover:bg-muted text-foreground";

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-8 h-8" />
          <div>
            <h2 className="font-bold text-lg">Telefonagent</h2>
            <p className="text-sm text-muted-foreground">Makler</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-foreground font-medium">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass}>
                      <item.icon className="mr-3 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {userProfile?.is_premium && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-foreground font-medium">Premium Features</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {premiumMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavClass}>
                        <item.icon className="mr-3 h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/settings" className={getNavClass}>
                    <Settings className="mr-3 h-4 w-4" />
                    <span>Einstellungen</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        {userProfile && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{userProfile.username}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {userProfile.subscription_type}
                </p>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                userProfile.subscription_type === 'premium' ? 'bg-primary' : 'bg-muted-foreground'
              }`} />
            </div>
          </div>
        )}
        <Button 
          variant="ghost" 
          onClick={handleSignOut}
          className="w-full justify-start text-foreground hover:text-foreground hover:bg-muted"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Abmelden
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}