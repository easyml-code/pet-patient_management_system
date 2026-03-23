import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { applyThemeColor } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Calendar, CalendarCheck, Users, UserCog, Stethoscope,
  BarChart3, Bell, Settings, LogOut, Menu, X, ChevronDown, ChevronLeft, ChevronRight, Zap, UserCircle
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';


const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', end: true, roles: ['admin', 'staff', 'doctor'] },
  { to: '/dashboard/calendar', icon: Calendar, label: 'Calendar', roles: ['admin', 'staff', 'doctor'] },
  { to: '/dashboard/appointments', icon: CalendarCheck, label: 'Appointments', roles: ['admin', 'staff', 'doctor'] },
  { to: '/dashboard/patients', icon: Users, label: 'Patients', roles: ['admin', 'staff', 'doctor'] },
  { to: '/dashboard/staff', icon: UserCog, label: 'Staff', roles: ['admin', 'staff', 'doctor'] },
  { to: '/dashboard/services', icon: Stethoscope, label: 'Services', roles: ['admin', 'staff'] },
  { to: '/dashboard/analytics', icon: BarChart3, label: 'Analytics', roles: ['admin', 'staff'] },
  { to: '/dashboard/notifications', icon: Bell, label: 'Notifications', roles: ['admin', 'staff', 'doctor'] },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
  { to: '/dashboard/profile', icon: UserCircle, label: 'Profile', roles: ['admin', 'staff', 'doctor'] },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const userRole = profile?.role || 'staff';
  const isAdmin = profile?.is_admin || profile?.role === 'admin';

  useEffect(() => {
    api.get('/tenant/me').then(res => {
      if (res.data?.theme_color) applyThemeColor(res.data.theme_color);
    }).catch(() => {});
  }, []);

  const handleSignOut = async () => {
    // Reset theme to default on sign out
    document.documentElement.style.removeProperty('--primary');
    document.documentElement.style.removeProperty('--ring');
    document.documentElement.style.removeProperty('--chart-1');
    await signOut();
    navigate('/');
  };

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  const SidebarContent = ({ isCollapsed = false }) => (
    <div className="flex flex-col h-full">
      <div className={`h-16 flex items-center border-b border-slate-100 ${isCollapsed ? 'justify-center' : 'gap-2.5 px-5'}`}>
        <Zap className="h-7 w-7 text-primary shrink-0" />
        {!isCollapsed && <span className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>Zap AI</span>}
      </div>
      <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${isCollapsed ? 'flex flex-col items-center' : 'px-3'}`}>
        {NAV_ITEMS.filter(item => !item.roles || item.roles.includes(userRole) || (isAdmin && item.roles.includes('admin'))).map((item) => {
          const link = (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center rounded-lg text-sm font-medium transition-colors ${
                  isCollapsed ? 'justify-center w-10 h-10' : 'gap-3 px-3 py-2.5 w-full'
                } ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && item.label}
            </NavLink>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={item.to} delayDuration={0}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }
          return link;
        })}
      </nav>

      {/* Collapse toggle (desktop only) */}
      {!isCollapsed ? (
        <div className="hidden lg:block px-3 pb-1">
          <button
            onClick={toggleCollapsed}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Collapse
          </button>
        </div>
      ) : (
        <div className="hidden lg:flex justify-center pb-1">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleCollapsed}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand</TooltipContent>
          </Tooltip>
        </div>
      )}

      <div className={`border-t border-slate-100 ${isCollapsed ? 'flex justify-center p-2' : 'p-3'}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-testid="user-menu-btn"
              className={`rounded-lg hover:bg-slate-50 ${isCollapsed ? 'w-full flex justify-center py-2.5' : 'w-full flex items-center gap-3 px-3 py-2.5 text-left'}`}
            >
              {profile?.photo_url ? (
                <img src={profile.photo_url} alt={profile.full_name} className="w-8 h-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{profile?.full_name || 'User'}</p>
                    <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isCollapsed ? 'start' : 'end'} side={isCollapsed ? 'right' : 'top'} className="w-56">
            <DropdownMenuItem data-testid="sign-out-btn" onClick={handleSignOut} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <div data-testid="dashboard-layout" className="flex h-screen bg-slate-50/50">
        {/* Desktop Sidebar */}
        <aside className={`hidden lg:flex flex-col bg-white border-r border-slate-200/60 shrink-0 transition-all duration-200 ${collapsed ? 'w-16' : 'w-64'}`}>
          <SidebarContent isCollapsed={collapsed} />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
              <SidebarContent isCollapsed={false} />
            </aside>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 h-16 flex items-center gap-4 border-b border-slate-200/60 bg-white/95 backdrop-blur-lg px-6">
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)} data-testid="mobile-sidebar-btn">
              <Menu className="h-5 w-5 text-slate-600" />
            </button>
            <div className="flex-1" />
            <div className="text-sm text-slate-500 capitalize">
              {isAdmin ? 'Admin' : profile?.role}
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
