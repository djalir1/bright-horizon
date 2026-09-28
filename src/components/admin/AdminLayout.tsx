import { useState, useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, CreditCard, Receipt, KeyRound, Search,
  Settings, UserCog, LogOut, Menu, X, ChevronRight, MessageSquare, GraduationCap, Sun, Moon, DoorOpen, DoorClosed, Activity, FileText, Loader2, Volume2, VolumeX, ScanLine, RotateCcw
} from "lucide-react";
import { fetchAdminSession, signOutAdmin, onAdminAuthChange, type AdminSession } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { isSoundEnabled, setSoundEnabled, playInfo } from "@/lib/sounds";

const STAFF_LOGIN_PATH = "/sg26-staff/login";

const allNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin", roles: ["agent", "superadmin"] },
  { label: "Lookup", icon: Search, href: "/admin/lookup", roles: ["superadmin", "agent"] },
  { label: "Registrations", icon: Users, href: "/admin/registrations", roles: ["agent", "superadmin"] },
  { label: "Payments", icon: CreditCard, href: "/admin/payments", roles: ["agent", "superadmin"] },
  { label: "Transactions", icon: Receipt, href: "/admin/transactions", roles: ["agent", "superadmin"] },
  { label: "Attendance", icon: DoorOpen, href: "/admin/attendance", roles: ["superadmin"] },
  { label: "Reports", icon: FileText, href: "/admin/reports", roles: ["superadmin"] },
  { label: "Activity Log", icon: Activity, href: "/admin/activity", roles: ["superadmin"] },
  { label: "Schools", icon: GraduationCap, href: "/admin/schools", roles: ["superadmin"] },
  { label: "Codes", icon: KeyRound, href: "/admin/codes", roles: ["agent", "superadmin"] },
  { label: "Staff", icon: UserCog, href: "/admin/agents", roles: ["superadmin"] },
  { label: "Contact", icon: MessageSquare, href: "/admin/contact", roles: ["agent", "superadmin"] },
  { label: "Settings", icon: Settings, href: "/admin/settings", roles: ["superadmin"] },
  { label: "Door — Entry", icon: DoorOpen, href: "/admin/door", roles: ["door_in"] },
  { label: "Door — Exit", icon: DoorClosed, href: "/admin/door", roles: ["door_out"] },
  { label: "Scan — Entry", icon: ScanLine, href: "/admin/scan/entry", roles: ["superadmin"] },
  { label: "Scan — Exit", icon: ScanLine, href: "/admin/scan/exit", roles: ["superadmin"] },
  { label: "Door Stats", icon: Activity, href: "/admin/door-stats", roles: ["superadmin"] },
  { label: "Refunds", icon: RotateCcw, href: "/admin/refunds", roles: ["superadmin"] },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [lightMode, setLightMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('admin_theme') === 'light';
  });
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const s = await fetchAdminSession();
      if (!active) return;
      setSession(s);
      setChecking(false);
      if (!s) navigate(STAFF_LOGIN_PATH, { replace: true });
    };
    refresh();
    const unsub = onAdminAuthChange(() => { refresh(); });
    return () => { active = false; unsub(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!session) return;
    if (session.role === 'door_in') {
      const allowed = ['/admin/door', '/admin/scan/entry'];
      if (!allowed.includes(location.pathname)) navigate('/admin/scan/entry');
      return;
    }
    if (session.role === 'door_out') {
      const allowed = ['/admin/door', '/admin/scan/exit'];
      if (!allowed.includes(location.pathname)) navigate('/admin/scan/exit');
      return;
    }
    if (session.role === 'agent') {
      const agentBlocked = ['/admin/schools', '/admin/settings', '/admin/agents', '/admin/attendance', '/admin/activity', '/admin/reports', '/admin/scan/entry', '/admin/scan/exit', '/admin/door-stats', '/admin/refunds'];
      if (agentBlocked.includes(location.pathname)) navigate("/admin");
    }
  }, [session, navigate, location.pathname]);

  useEffect(() => {
    if (!session) return;
    const loadBadges = async () => {
      const [reg, pay, msg] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('payment_status', 'unpaid'),
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('read', false),
      ]);
      setBadges({
        '/admin/registrations': reg.count || 0,
        '/admin/payments': pay.count || 0,
        '/admin/contact': msg.count || 0,
      });
    };
    loadBadges();
  }, [location.pathname, session]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('admin_theme', lightMode ? 'light' : 'dark');
  }, [lightMode]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playInfo();
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-gold" size={28} />
      </div>
    );
  }
  if (!session) return null;

  const navItems = allNavItems.filter(item => item.roles.includes(session.role));
  const currentPage = navItems.find(item => item.href === location.pathname)?.label || "Dashboard";

  const handleLogout = async () => {
    await signOutAdmin();
    navigate(STAFF_LOGIN_PATH);
  };

  return (
    <div className={`${lightMode ? 'admin-light' : ''} min-h-screen bg-background flex font-body`}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-gold/10 flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-5 border-b border-gold/10 flex items-center justify-between">
          <div>
            <Link to="/admin" className="font-display text-xl text-gold font-semibold">Senior Gala</Link>
            <p className="text-xs text-muted-foreground mt-1">Admin Dashboard</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground"><X size={20} /></button>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.href;
            const badge = badges[item.href] || 0;
            return (
              <Link key={item.href} to={item.href} onClick={() => setSidebarOpen(false)}
                className={`relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${active ? "bg-gold/10 text-gold border-l-2 border-gold" : "text-foreground/60 hover:text-foreground hover:bg-surface"}`}>
                <span className="relative">
                  <item.icon size={18} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </span>
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-3 border-t border-gold/10">
          <div className="px-4 py-2 text-xs text-muted-foreground mb-2">
            {session.name} · {session.role}
          </div>
          <button onClick={() => setLightMode(v => !v)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-foreground/60 hover:text-gold hover:bg-surface w-full transition-colors mb-1" title="Toggle theme">
            {lightMode ? <Moon size={18} /> : <Sun size={18} />}
            <span>{lightMode ? 'Dark mode' : 'Light mode'}</span>
          </button>
          <button onClick={toggleSound}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-foreground/60 hover:text-gold hover:bg-surface w-full transition-colors mb-1" title="Toggle notification sounds">
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            <span>{soundOn ? 'Sounds on' : 'Sounds off'}</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-foreground/60 hover:text-destructive hover:bg-destructive/5 w-full transition-colors">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 border-b border-gold/10 flex items-center justify-between px-4 lg:px-8 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-foreground p-1">
              <Menu size={22} />
            </button>
            <h1 className="font-display text-xl text-foreground">{currentPage}</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{session.name}</span>
            <ChevronRight size={14} />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
