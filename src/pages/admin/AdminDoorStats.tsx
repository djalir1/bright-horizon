import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSession } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { DoorOpen, DoorClosed, Users, Activity } from "lucide-react";
import { formatDateTimeSec } from "@/lib/format";

const REFRESH_MS = 5000;

const AdminDoorStats = () => {
  const session = useAdminSession();
  const navigate = useNavigate();
  const [admitted, setAdmitted] = useState(0);
  const [exited, setExited] = useState(0);
  const [sold, setSold] = useState(0);
  const [byTier, setByTier] = useState<Array<{ name: string; count: number }>>([]);
  const [feed, setFeed] = useState<any[]>([]);

  useEffect(() => {
    if (session && session.role !== 'superadmin') navigate('/admin');
  }, [session, navigate]);

  const load = useCallback(async () => {
    const [admR, exR, soldR, tiersR, feedR] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('entered', true),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('exited', true),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('payment_status', 'paid'),
      supabase.from('users').select('tier_id, ticket_tiers:ticket_tiers!users_tier_id_fkey(name)').eq('entered', true),
      supabase.from('scan_logs').select('id, result, gate, scanned_at, scanned_by_email, scanned_code, users:users!scan_logs_user_id_fkey(first_name, last_name)').order('scanned_at', { ascending: false }).limit(20),
    ]);
    setAdmitted(admR.count || 0);
    setExited(exR.count || 0);
    setSold(soldR.count || 0);

    const tierMap = new Map<string, number>();
    (tiersR.data || []).forEach((r: any) => {
      const name = Array.isArray(r.ticket_tiers) ? r.ticket_tiers?.[0]?.name : r.ticket_tiers?.name;
      if (!name) return;
      tierMap.set(name, (tierMap.get(name) || 0) + 1);
    });
    setByTier(Array.from(tierMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
    setFeed(feedR.data || []);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const inside = admitted - exited;
  const capacityPct = sold > 0 ? Math.min(100, Math.round((admitted / sold) * 100)) : 0;

  const resultColor = (r: string) => {
    if (r === 'admitted' || r === 'exited') return 'text-green-400';
    if (r === 'already_entered' || r === 'already_exited') return 'text-red-400';
    if (r === 'not_paid' || r === 'not_entered') return 'text-orange-400';
    return 'text-red-500';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl text-gold">Live Door Statistics</h2>
          <p className="text-xs text-muted-foreground">Auto-refreshes every {REFRESH_MS / 1000} seconds.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<DoorOpen className="text-green-400" size={20} />} label="Admitted tonight" value={admitted} />
          <StatCard icon={<Users className="text-gold" size={20} />} label="Currently inside" value={inside} />
          <StatCard icon={<DoorClosed className="text-blue-400" size={20} />} label="Total exited" value={exited} />
          <StatCard icon={<Activity className="text-purple-400" size={20} />} label="Tickets sold" value={sold} />
        </div>

        <div className="bg-card border border-gold/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-lg text-gold">Capacity used</h3>
            <span className="text-sm text-foreground">{admitted} / {sold} ({capacityPct}%)</span>
          </div>
          <div className="h-3 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-gold/70 to-gold transition-all" style={{ width: `${capacityPct}%` }} />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-card border border-gold/10 rounded-xl p-5">
            <h3 className="font-display text-lg text-gold mb-3">Admitted by tier</h3>
            {byTier.length === 0
              ? <p className="text-sm text-muted-foreground">No entries yet.</p>
              : <ul className="space-y-2">
                  {byTier.map(t => (
                    <li key={t.name} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{t.name}</span>
                      <span className="font-mono text-gold">{t.count}</span>
                    </li>
                  ))}
                </ul>}
          </div>
          <div className="bg-card border border-gold/10 rounded-xl p-5">
            <h3 className="font-display text-lg text-gold mb-3">Recent scans</h3>
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {feed.length === 0 && <p className="text-sm text-muted-foreground">No scans yet.</p>}
              {feed.map((f: any) => {
                const u = Array.isArray(f.users) ? f.users[0] : f.users;
                const name = u ? `${u.first_name} ${u.last_name}` : (f.scanned_code || 'Unknown');
                return (
                  <div key={f.id} className="text-xs flex items-center justify-between border-b border-gold/5 pb-1.5">
                    <div>
                      <span className="text-foreground font-medium">{name}</span>
                      <span className="text-muted-foreground"> · {f.gate}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold ${resultColor(f.result)}`}>{f.result.replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground">{formatDateTimeSec(f.scanned_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="bg-card border border-gold/10 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground uppercase tracking-wide">{icon} {label}</div>
    <div className="font-display text-3xl text-foreground">{value.toLocaleString()}</div>
  </div>
);

export default AdminDoorStats;