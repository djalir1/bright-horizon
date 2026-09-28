import AdminLayout from "@/components/admin/AdminLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { confirmDialog } from "@/lib/confirmDialog";
import { Loader2, Plus, X, ShieldCheck } from "lucide-react";
import type { AppRole } from "@/lib/auth";

type Profile = { id: string; full_name: string | null; email: string | null; created_at: string };
type RoleRow = { id: string; user_id: string; role: AppRole; created_at: string };

const ALL_ROLES: AppRole[] = ['superadmin', 'agent', 'door_in', 'door_out'];
const ROLE_LABEL: Record<AppRole, string> = {
  superadmin: 'Superadmin',
  agent: 'Agent — Registrations & Payments',
  door_in: 'Door — Entry',
  door_out: 'Door — Exit',
};

const AdminAgents = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantOpen, setGrantOpen] = useState<Profile | null>(null);
  const [grantRole, setGrantRole] = useState<AppRole>('agent');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('*'),
    ]);
    setProfiles((p as Profile[]) || []);
    setRoles((r as RoleRow[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const rolesFor = (uid: string) => roles.filter(r => r.user_id === uid);

  const grant = async () => {
    if (!grantOpen) return;
    setSaving(true);
    const { error } = await supabase.from('user_roles').insert({ user_id: grantOpen.id, role: grantRole });
    setSaving(false);
    if (error) { toast.error(error.message.includes('unique') ? 'User already has this role' : error.message); return; }
    toast.success('Role granted');
    setGrantOpen(null);
    load();
  };

  const revoke = async (row: RoleRow, userLabel: string) => {
    const ok = await confirmDialog({ title: `Revoke "${ROLE_LABEL[row.role]}"?`, description: `Remove this role from ${userLabel}.`, confirmText: 'Revoke', destructive: true });
    if (!ok) return;
    const { error } = await supabase.from('user_roles').delete().eq('id', row.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Role revoked');
    load();
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="gold-card rounded-xl p-5 mb-4 flex items-start gap-3">
          <ShieldCheck className="text-gold mt-0.5 shrink-0" size={20} />
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="text-foreground font-medium">Staff accounts use Lovable Cloud authentication.</p>
            <p>To add a new staff member, open <span className="text-gold">Cloud → Users</span> and click <span className="text-gold">Add user</span> with an email + password. They appear here automatically, then assign their role(s) below.</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{profiles.length} staff account(s)</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gold" /></div>
      ) : profiles.length === 0 ? (
        <div className="gold-card rounded-xl p-8 text-center text-muted-foreground">
          No accounts yet. Create the first one in Cloud → Users — it will automatically become the Superadmin.
        </div>
      ) : (
        <div className="gold-card rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Roles</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => {
                const userRoles = rolesFor(p.id);
                return (
                  <tr key={p.id} className="border-t border-gold/5">
                    <td className="px-4 py-3 text-foreground">{p.full_name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {userRoles.length === 0 && <span className="text-xs text-muted-foreground italic">no role</span>}
                        {userRoles.map(r => (
                          <span key={r.id} className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-gold/10 text-gold border border-gold/20">
                            {ROLE_LABEL[r.role]}
                            <button onClick={() => revoke(r, p.email || p.full_name || 'user')} className="hover:text-destructive" title="Revoke">
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setGrantOpen(p); setGrantRole('agent'); }} className="text-xs px-3 py-1.5 bg-gold text-background rounded hover:bg-gold-light inline-flex items-center gap-1">
                        <Plus size={12} /> Grant role
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {grantOpen && (
        <div className="fixed inset-0 bg-background/60 z-50 flex items-center justify-center p-4" onClick={() => setGrantOpen(null)}>
          <div className="gold-card rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl text-gold-gradient mb-1">Grant role</h3>
            <p className="text-sm text-muted-foreground mb-4">{grantOpen.email}</p>
            <select value={grantRole} onChange={e => setGrantRole(e.target.value as AppRole)}
              className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground focus:outline-none focus:border-gold/60 mb-4">
              {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setGrantOpen(null)} className="flex-1 py-2 border border-gold/20 text-foreground rounded-lg hover:bg-surface-2">Cancel</button>
              <button onClick={grant} disabled={saving} className="flex-1 py-2 bg-gold text-background rounded-lg hover:bg-gold-light flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : null} Grant
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAgents;
