import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatDateTimeSec } from "@/lib/format";
import { exportCsv, exportPdfReport } from "@/lib/reports";
import { Download, FileText } from "lucide-react";

const AdminAttendance = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'entered' | 'exited' | 'inside'>('all');

  useEffect(() => {
    supabase.from('users').select('*, schools(name)').order('entered_at', { ascending: false })
      .then(({ data }) => { setUsers(data || []); setLoading(false); });
  }, []);

  const filtered = users.filter(u => {
    if (filter === 'entered') return u.entered;
    if (filter === 'exited') return u.exited;
    if (filter === 'inside') return u.entered && !u.exited;
    return true;
  });

  const headers = ['Code', 'Name', 'School', 'Level', 'Entered At', 'Exited At', 'Status'];
  const rows = () => filtered.map(u => [
    u.code_id ? '—' : '',
    `${u.first_name} ${u.last_name}`,
    u.school_name || u.schools?.name || '',
    u.level || '',
    u.entered ? formatDateTimeSec(u.entered_at) : '',
    u.exited ? formatDateTimeSec(u.exited_at) : '',
    u.exited ? 'Exited' : u.entered ? 'Inside' : 'Not entered',
  ]);

  const csv = () => exportCsv(`attendance-${Date.now()}.csv`, headers, rows());
  const pdf = () => exportPdfReport({
    title: 'Attendance Report', subtitle: `Filter: ${filter} · ${filtered.length} records`,
    headers, rows: rows(), filename: `attendance-${Date.now()}.pdf`,
  });

  const totals = {
    total: users.length,
    entered: users.filter(u => u.entered).length,
    inside: users.filter(u => u.entered && !u.exited).length,
    exited: users.filter(u => u.exited).length,
  };

  return (
    <AdminLayout>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Registered', value: totals.total },
          { label: 'Entered', value: totals.entered },
          { label: 'Inside', value: totals.inside },
          { label: 'Exited', value: totals.exited },
        ].map(s => (
          <div key={s.label} className="bg-card border border-gold/10 rounded-lg p-4 border-l-4 border-l-gold">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-display text-gold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-gold/10 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex gap-1 flex-wrap">
            {(['all', 'entered', 'inside', 'exited'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-lg capitalize ${filter === f ? 'bg-gold text-background' : 'bg-surface-2 text-muted-foreground hover:text-foreground'}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={csv} className="px-3 py-1.5 text-xs bg-surface-2 border border-gold/20 rounded-lg flex items-center gap-1 hover:border-gold/40">
              <Download size={12} /> CSV
            </button>
            <button onClick={pdf} className="px-3 py-1.5 text-xs bg-gold/10 text-gold border border-gold/30 rounded-lg flex items-center gap-1 hover:bg-gold/20">
              <FileText size={12} /> PDF
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-gold/10">
                <th className="text-left pb-3">Name</th>
                <th className="text-left pb-3">School</th>
                <th className="text-left pb-3 hidden md:table-cell">Entered</th>
                <th className="text-left pb-3 hidden md:table-cell">Exited</th>
                <th className="text-right pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No records</td></tr>}
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-gold/5">
                  <td className="py-3 text-foreground">{u.first_name} {u.last_name}</td>
                  <td className="py-3 text-muted-foreground">{u.school_name || u.schools?.name}</td>
                  <td className="py-3 text-xs text-muted-foreground hidden md:table-cell">{u.entered ? formatDate(u.entered_at) : '—'}</td>
                  <td className="py-3 text-xs text-muted-foreground hidden md:table-cell">{u.exited ? formatDate(u.exited_at) : '—'}</td>
                  <td className="py-3 text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${u.exited ? 'bg-muted text-muted-foreground' : u.entered ? 'bg-green-900/30 text-green-400' : 'bg-gold/10 text-gold'}`}>
                      {u.exited ? 'Exited' : u.entered ? 'Inside' : 'Not entered'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAttendance;