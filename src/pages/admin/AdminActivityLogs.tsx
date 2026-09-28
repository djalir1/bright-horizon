import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatDateTimeSec } from "@/lib/format";
import { exportCsv, exportPdfReport } from "@/lib/reports";
import { Download, FileText, Activity } from "lucide-react";

const AdminActivityLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAgent, setFilterAgent] = useState("");
  const [filterAction, setFilterAction] = useState("");

  useEffect(() => {
    supabase.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(2000)
      .then(({ data }) => { setLogs(data || []); setLoading(false); });
  }, []);

  const agents = Array.from(new Set(logs.map(l => l.agent_name)));
  const actions = Array.from(new Set(logs.map(l => l.action)));

  const filtered = logs.filter(l =>
    (!filterAgent || l.agent_name === filterAgent) &&
    (!filterAction || l.action === filterAction)
  );

  const headers = ['Date', 'Agent', 'Role', 'Action', 'Details'];
  const rows = () => filtered.map(l => [
    formatDateTimeSec(l.created_at), l.agent_name, l.agent_role, l.action, l.details || '',
  ]);

  return (
    <AdminLayout>
      <div className="bg-card border border-gold/10 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="text-gold" size={18} />
            <h2 className="font-display text-lg text-foreground">Agent Activity Log</h2>
            <span className="text-xs text-muted-foreground">({filtered.length})</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}
              className="px-3 py-1.5 text-xs bg-surface-2 border border-gold/20 rounded-lg">
              <option value="">All agents</option>
              {agents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
              className="px-3 py-1.5 text-xs bg-surface-2 border border-gold/20 rounded-lg">
              <option value="">All actions</option>
              {actions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={() => exportCsv(`activity-${Date.now()}.csv`, headers, rows())}
              className="px-3 py-1.5 text-xs bg-surface-2 border border-gold/20 rounded-lg flex items-center gap-1"><Download size={12}/> CSV</button>
            <button onClick={() => exportPdfReport({ title: 'Agent Activity Log', subtitle: `${filtered.length} entries`, headers, rows: rows(), filename: `activity-${Date.now()}.pdf` })}
              className="px-3 py-1.5 text-xs bg-gold/10 text-gold border border-gold/30 rounded-lg flex items-center gap-1"><FileText size={12}/> PDF</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-gold/10">
                <th className="text-left pb-3">When</th>
                <th className="text-left pb-3">Agent</th>
                <th className="text-left pb-3">Role</th>
                <th className="text-left pb-3">Action</th>
                <th className="text-left pb-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No activity yet</td></tr>}
              {filtered.map(l => (
                <tr key={l.id} className="border-b border-gold/5">
                  <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">{formatDate(l.created_at)}</td>
                  <td className="py-2 text-foreground">{l.agent_name}</td>
                  <td className="py-2 text-xs text-muted-foreground capitalize">{l.agent_role}</td>
                  <td className="py-2"><span className="text-xs px-2 py-1 rounded-full bg-gold/10 text-gold">{l.action}</span></td>
                  <td className="py-2 text-muted-foreground text-xs">{l.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminActivityLogs;