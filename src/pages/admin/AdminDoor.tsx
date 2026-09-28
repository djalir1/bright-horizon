import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { getAdminSession } from "@/lib/auth";
import { logAgentAction } from "@/lib/agentLog";
import { formatDate, formatDateTimeSec } from "@/lib/format";
import { toast } from "sonner";
import { Search, Loader2, CheckCircle, XCircle, LogIn, LogOut, FileText, FileSpreadsheet } from "lucide-react";
import { exportCsv, exportPdfReport } from "@/lib/reports";

const AdminDoor = () => {
  const session = getAdminSession();
  const isEntry = session?.role === 'door_in' || session?.role === 'superadmin';
  const isExit = session?.role === 'door_out' || session?.role === 'superadmin';
  const mode: 'in' | 'out' = session?.role === 'door_out' ? 'out' : 'in';

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");

  // Report date range (defaults to today)
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [exporting, setExporting] = useState(false);

  const fetchAttendance = async (type: 'in' | 'out') => {
    const col = type === 'in' ? 'entered_at' : 'exited_at';
    const flag = type === 'in' ? 'entered' : 'exited';
    const from = new Date(fromDate + 'T00:00:00').toISOString();
    const to = new Date(toDate + 'T23:59:59').toISOString();
    const { data } = await supabase
      .from('users')
      .select('first_name,last_name,phone,school_name,level,entered_at,exited_at,codes:codes!fk_codes_used_by(code)')
      .eq(flag, true)
      .gte(col, from)
      .lte(col, to)
      .order(col, { ascending: true });
    return (data || []).map((u: any) => ({
      code: u.codes?.code || '-',
      name: `${u.first_name} ${u.last_name}`,
      school: u.school_name || '-',
      level: u.level || '-',
      phone: u.phone || '-',
      time: type === 'in' ? u.entered_at : u.exited_at,
    }));
  };

  const exportReport = async (type: 'in' | 'out', fmt: 'csv' | 'pdf') => {
    setExporting(true);
    try {
      const rows = await fetchAttendance(type);
      if (rows.length === 0) { toast.error("No records in this date range."); return; }
      const label = type === 'in' ? 'Entries' : 'Exits';
      const headers = ['Code', 'Name', 'School', 'Level', 'Phone', label === 'Entries' ? 'Entry Time' : 'Exit Time'];
      const body = rows.map(r => [r.code, r.name, r.school, r.level, r.phone, r.time ? formatDateTimeSec(r.time) : '-']);
      const filename = `Senior-Gala-${label}-${fromDate}_to_${toDate}`;
      if (fmt === 'csv') {
        exportCsv(`${filename}.csv`, headers, body);
      } else {
        await exportPdfReport({
          title: `Attendance ${label}`,
          subtitle: `${fromDate} to ${toDate}  ·  ${rows.length} record(s)  ·  Generated ${formatDate(new Date().toISOString())}`,
          headers, rows: body,
          filename: `${filename}.pdf`,
        });
      }
      await logAgentAction('export_attendance', `Exported ${rows.length} ${label.toLowerCase()} (${fromDate} → ${toDate}) as ${fmt.toUpperCase()}`);
    } finally { setExporting(false); }
  };

  const lookup = async () => {
    setError(""); setUser(null);
    if (!/^\d{3,4}$/.test(code.trim())) { setError("Enter the 4-digit code (numbers only)."); return; }
    setLoading(true);
    const fullCode = "SG-" + code.trim();
    const { data } = await supabase
      .from('codes')
      .select('*, users:users!fk_codes_used_by(*), schools(name)')
      .eq('code', fullCode).maybeSingle();
    setLoading(false);
    const u = (data as any)?.users;
    if (!data || !u) { setError("Code not found or not registered."); return; }
    setUser({ ...u, code: data.code, school_name: u.school_name || (data as any).schools?.name });
  };

  const markEntry = async () => {
    if (!user) return;
    if (user.payment_status !== 'paid') { toast.error("Payment not complete — cannot enter."); return; }
    if (user.entered) { toast.error("Already entered."); return; }
    const { error } = await supabase.from('users').update({ entered: true, entered_at: new Date().toISOString() }).eq('id', user.id);
    if (error) { toast.error(error.message); return; }
    await logAgentAction('door_entry', `Marked entry for ${user.first_name} ${user.last_name} (${user.code})`, { type: 'user', id: user.id });
    toast.success(`Entry recorded — ${user.first_name} ${user.last_name}`);
    setUser(null); setCode("");
  };

  const markExit = async () => {
    if (!user) return;
    if (!user.entered) { toast.error("This person hasn't entered yet."); return; }
    if (user.exited) { toast.error("Already exited."); return; }
    const { error } = await supabase.from('users').update({ exited: true, exited_at: new Date().toISOString() }).eq('id', user.id);
    if (error) { toast.error(error.message); return; }
    await logAgentAction('door_exit', `Marked exit for ${user.first_name} ${user.last_name} (${user.code})`, { type: 'user', id: user.id });
    toast.success(`Exit recorded — ${user.first_name} ${user.last_name}`);
    setUser(null); setCode("");
  };

  return (
    <AdminLayout>
      <div className="max-w-xl mx-auto">
        <div className="bg-card border border-gold/10 rounded-xl p-6">
          <h2 className="font-display text-2xl text-gold mb-1">Door — {mode === 'out' ? 'Exit' : 'Entry'}</h2>
          <p className="text-xs text-muted-foreground mb-6">
            Enter the attendee's 4-digit code. The system finds them automatically.
          </p>

          <div className="flex gap-2 mb-3">
            <div className="flex flex-1">
              <span className="px-4 py-3 bg-gold/10 text-gold font-mono text-lg rounded-l-lg border border-r-0 border-gold/20 flex items-center min-w-[70px] justify-center">SG-</span>
              <input type="number" placeholder="4821" value={code} autoFocus
                onChange={(e) => setCode(e.target.value.slice(0, 4))}
                onKeyDown={(e) => e.key === 'Enter' && lookup()}
                className="flex-1 px-4 py-3 bg-surface-2 border border-gold/20 rounded-r-lg text-foreground font-mono text-lg focus:outline-none focus:border-gold/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            </div>
            <button onClick={lookup} disabled={loading}
              className="px-4 bg-gold text-background rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Find
            </button>
          </div>
          {error && <p className="text-sm text-destructive mb-3">{error}</p>}

          {user && (
            <div className="mt-4 p-4 bg-surface-2 border border-gold/10 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-display text-xl text-foreground">{user.first_name} {user.last_name}</p>
                  <p className="text-xs text-muted-foreground">{user.school_name} · {user.code}</p>
                </div>
                {user.payment_status === 'paid'
                  ? <span className="text-xs px-2 py-1 rounded-full bg-green-900/30 text-green-400 flex items-center gap-1"><CheckCircle size={12} /> Paid</span>
                  : <span className="text-xs px-2 py-1 rounded-full bg-destructive/20 text-destructive flex items-center gap-1"><XCircle size={12} /> Unpaid</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
                <div>Entry: <span className="text-foreground">{user.entered ? formatDate(user.entered_at) : '—'}</span></div>
                <div>Exit: <span className="text-foreground">{user.exited ? formatDate(user.exited_at) : '—'}</span></div>
              </div>
              <div className="flex gap-2">
                {isEntry && (
                  <button onClick={markEntry} disabled={user.entered || user.payment_status !== 'paid'}
                    className="flex-1 py-3 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-40">
                    <LogIn size={16} /> Mark Entry
                  </button>
                )}
                {isExit && (
                  <button onClick={markExit} disabled={!user.entered || user.exited}
                    className="flex-1 py-3 bg-destructive hover:bg-destructive/80 text-white font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-40">
                    <LogOut size={16} /> Mark Exit
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reports section */}
        <div className="bg-card border border-gold/10 rounded-xl p-6 mt-6">
          <h3 className="font-display text-xl text-gold mb-1">Attendance Reports</h3>
          <p className="text-xs text-muted-foreground mb-4">Export entries & exits with exact date and time stamps.</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">From</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 bg-surface-2 border border-gold/20 rounded-lg text-foreground text-sm focus:outline-none focus:border-gold/60" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">To</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 bg-surface-2 border border-gold/20 rounded-lg text-foreground text-sm focus:outline-none focus:border-gold/60" />
            </div>
          </div>
          <div className="space-y-2">
            {isEntry && (
              <div className="flex gap-2">
                <span className="flex-1 px-3 py-2 text-sm text-foreground flex items-center gap-2"><LogIn size={14} className="text-green-400" /> Entries report</span>
                <button onClick={() => exportReport('in', 'csv')} disabled={exporting}
                  className="px-3 py-2 text-xs bg-surface-2 border border-gold/20 rounded-lg hover:bg-gold/10 flex items-center gap-1 disabled:opacity-50">
                  <FileSpreadsheet size={14} /> CSV
                </button>
                <button onClick={() => exportReport('in', 'pdf')} disabled={exporting}
                  className="px-3 py-2 text-xs bg-gold text-background rounded-lg hover:bg-gold-light flex items-center gap-1 disabled:opacity-50">
                  <FileText size={14} /> PDF
                </button>
              </div>
            )}
            {isExit && (
              <div className="flex gap-2">
                <span className="flex-1 px-3 py-2 text-sm text-foreground flex items-center gap-2"><LogOut size={14} className="text-destructive" /> Exits report</span>
                <button onClick={() => exportReport('out', 'csv')} disabled={exporting}
                  className="px-3 py-2 text-xs bg-surface-2 border border-gold/20 rounded-lg hover:bg-gold/10 flex items-center gap-1 disabled:opacity-50">
                  <FileSpreadsheet size={14} /> CSV
                </button>
                <button onClick={() => exportReport('out', 'pdf')} disabled={exporting}
                  className="px-3 py-2 text-xs bg-gold text-background rounded-lg hover:bg-gold-light flex items-center gap-1 disabled:opacity-50">
                  <FileText size={14} /> PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDoor;