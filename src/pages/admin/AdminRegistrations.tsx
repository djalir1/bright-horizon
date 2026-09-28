import { confirmDialog } from "@/lib/confirmDialog";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Download, Trash2, Eye, FileText, Printer, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, formatDate, formatDateTimeSec } from "@/lib/format";
import { toast } from "sonner";
import { getAdminSession } from "@/lib/auth";
import { exportCsv, exportPdfReport, exportStudentPaymentPdf } from "@/lib/reports";
import { generateETicket } from "@/lib/pdf";
import { logAgentAction } from "@/lib/agentLog";

const statusColors: Record<string, string> = {
  paid: "bg-green-900/30 text-green-400",
  unpaid: "bg-destructive/10 text-destructive",
};

const AdminRegistrations = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSchool, setFilterSchool] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [tab, setTab] = useState("all");
  const [reprintUser, setReprintUser] = useState<any>(null);
  const [reprintReason, setReprintReason] = useState<'lost' | 'damaged' | 'technical_issue' | 'other'>('lost');
  const [reprintNote, setReprintNote] = useState("");
  const [reprintLoading, setReprintLoading] = useState(false);
  const session = getAdminSession();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [{ data: usersData, error: uErr }, { data: schoolsData }] = await Promise.all([
      supabase.from('users').select('*, codes(code, code_type), schools(name), ticket_tiers(name, price)').order('registered_at', { ascending: false }),
      supabase.from('schools').select('*').order('name'),
    ]);
    if (uErr) {
      // Fallback: load without join if relationship lookup fails
      const { data: rawUsers } = await supabase.from('users').select('*').order('registered_at', { ascending: false });
      const { data: rawCodes } = await supabase.from('codes').select('id, code');
      const codeMap = new Map((rawCodes || []).map((c: any) => [c.id, c.code]));
      setUsers((rawUsers || []).map((u: any) => ({ ...u, codes: { code: codeMap.get(u.code_id) || '-' } })));
    } else {
      setUsers(usersData || []);
    }
    setSchools(schoolsData || []);
    setLoading(false);
  };

  const filtered = users.filter(u => {
    if (tab === 'paid' && u.payment_status !== 'paid') return false;
    if (tab === 'unpaid' && u.payment_status !== 'unpaid') return false;

    const s = search.toLowerCase();
    const matchSearch = !s || u.first_name.toLowerCase().includes(s) || u.last_name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || (u.codes?.code || '').toLowerCase().includes(s);
    const matchSchool = !filterSchool || u.school_id === filterSchool;
    const matchStatus = !filterStatus || u.payment_status === filterStatus;
    return matchSearch && matchSchool && matchStatus;
  });

  const deleteUser = async (id: string) => {
    const ok = await confirmDialog({ title: 'Delete registration?', description: 'The student record and code link will be removed.', confirmText: 'Delete', destructive: true });
    if (!ok) return;
    await supabase.from('users').delete().eq('id', id);
    toast.success("Registration deleted");
    loadData();
    setSelectedUser(null);
  };

  const doReprint = async () => {
    if (!reprintUser) return;
    setReprintLoading(true);
    toast.loading("Generating reprint...");
    try {
      const { data: settingsData } = await supabase.from('settings').select('*');
      const map: Record<string, string> = {};
      (settingsData || []).forEach((r: any) => { map[r.key] = r.value; });
      await generateETicket({
        name: `${reprintUser.first_name} ${reprintUser.last_name}`,
        department: reprintUser.school_name || reprintUser.department,
        code: reprintUser.codes?.code || '',
        eventName: map.event_name || 'Senior Gala Night',
        eventDate: map.event_date || 'TBD',
        venue: map.venue_confirmed === 'true' ? (map.venue_name || 'TBA') : 'To Be Announced',
        ticketType: reprintUser.ticket_tiers?.name,
        tierPrice: reprintUser.ticket_tiers?.price,
        paidAmount: reprintUser.paid_amount,
        codeType: reprintUser.codes?.code_type === 'general' ? 'general' : 'student',
        isReprint: true,
      });
      await supabase.from('ticket_print_logs').insert({
        user_id: reprintUser.id,
        print_type: 'reprint',
        reason: reprintNote ? `${reprintReason}: ${reprintNote}` : reprintReason,
        printed_by_email: session?.email || session?.name || 'unknown',
        is_admin_reprint: true,
      });
      await logAgentAction('ticket_reprinted', `Reprinted ticket for ${reprintUser.first_name} ${reprintUser.last_name} — ${reprintReason}`, { type: 'user', id: reprintUser.id });
      toast.dismiss();
      toast.success("Reprint generated and logged");
      setReprintUser(null); setReprintReason('lost'); setReprintNote("");
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || "Reprint failed");
    }
    setReprintLoading(false);
  };

  const buildRows = () => {
    const headers = ['Code', 'Name', 'School', 'Level', 'Phone', 'Email', 'Gender', 'Status', 'Paid (RWF)', 'Remaining (RWF)', 'Registered'];
    const rows = filtered.map(u => [
      u.codes?.code || '-',
      `${u.first_name} ${u.last_name}`,
      u.school_name || u.department || '',
      u.level || '', u.phone, u.email, u.gender,
      u.payment_status,
      (u.paid_amount || 0).toLocaleString(),
      (u.remaining_amount || 0).toLocaleString(),
      formatDateTimeSec(u.registered_at),
    ]);
    // Append totals row for money columns (Paid + Remaining)
    const sumPaid = filtered.reduce((s, u) => s + (u.paid_amount || 0), 0);
    const sumRem = filtered.reduce((s, u) => s + (u.remaining_amount || 0), 0);
    rows.push(['', `TOTAL (${filtered.length})`, '', '', '', '', '', '', sumPaid.toLocaleString(), sumRem.toLocaleString(), '']);
    return { headers, rows };
  };

  const exportCSV = () => {
    const { headers, rows } = buildRows();
    exportCsv(`Senior-Gala-Registrations-${Date.now()}.csv`, headers, rows);
    toast.success("Exported CSV");
  };

  const exportPDF = async () => {
    const { headers, rows } = buildRows();
    await exportPdfReport({
      title: 'Registrations Report',
      subtitle: `${rows.length} students${filterSchool ? ' · filtered' : ''}`,
      headers, rows,
      filename: `Senior-Gala-Registrations-${Date.now()}.pdf`,
    });
    toast.success("Exported PDF");
  };

  const printOne = async (u: any) => {
    toast.loading('Building PDF...');
    try {
      const { data: pays } = await supabase.from('payments').select('*').eq('user_id', u.id).order('submitted_at', { ascending: false });
      await exportStudentPaymentPdf({
        code: u.codes?.code || '-',
        name: `${u.first_name} ${u.last_name}`,
        school: u.school_name || u.department || '-',
        level: u.level, phone: u.phone, email: u.email,
        ticket_price: u.ticket_price, paid_amount: u.paid_amount, remaining_amount: u.remaining_amount,
        payment_status: u.payment_status,
        entered: u.entered, entered_at: u.entered_at,
        exited: u.exited, exited_at: u.exited_at,
      }, (pays || []).map((p: any) => ({
        amount: p.amount, method: p.method, status: p.status,
        submitted_at: p.submitted_at, reviewed_by: p.reviewed_by, transaction_id: p.transaction_id,
      })));
      toast.dismiss(); toast.success('PDF ready');
    } catch (e) { toast.dismiss(); toast.error('Failed to print'); }
  };

  const tabs = [
    { key: 'all', label: 'All', count: users.length },
    { key: 'paid', label: 'Paid', count: users.filter(u => u.payment_status === 'paid').length },
    { key: 'unpaid', label: 'Unpaid', count: users.filter(u => u.payment_status === 'unpaid').length },
  ];

  return (
    <AdminLayout>
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap ${tab === t.key ? 'bg-gold/10 text-gold border border-gold/30' : 'text-muted-foreground hover:text-foreground border border-gold/10'}`}>
            {t.label} <span className="text-xs opacity-60">({t.count})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search by name, email, code..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-surface-2 border border-gold/20 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60 transition-colors" />
          </div>
          <select value={filterSchool} onChange={(e) => setFilterSchool(e.target.value)} className="px-3 py-2.5 bg-surface-2 border border-gold/20 rounded-lg text-sm text-foreground focus:outline-none focus:border-gold/60">
            <option value="">All Schools</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-4 py-2 text-sm bg-surface-2 text-foreground border border-gold/20 rounded-lg hover:border-gold/40 transition-colors flex items-center gap-2">
            <Download size={14} /> CSV
          </button>
          <button onClick={exportPDF} className="px-4 py-2 text-sm bg-gold/10 text-gold border border-gold/30 rounded-lg hover:bg-gold/20 transition-colors flex items-center gap-2">
            <FileText size={14} /> PDF (Print All)
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-background/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="gold-card rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl text-gold-gradient mb-4">Registration Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Code</span><span className="font-mono text-gold">{selectedUser.codes?.code}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{selectedUser.first_name} {selectedUser.last_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">School</span><span>{selectedUser.school_name || selectedUser.department}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Level</span><span>{selectedUser.level || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{selectedUser.email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{selectedUser.phone}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Gender</span><span>{selectedUser.gender}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="text-gold">{formatMoney(selectedUser.paid_amount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Payment Status</span><span className={`text-xs px-2 py-1 rounded-full capitalize ${statusColors[selectedUser.payment_status]}`}>{selectedUser.payment_status}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Registered</span><span>{formatDate(selectedUser.registered_at)}</span></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setSelectedUser(null)} className="flex-1 py-2 border border-gold/20 text-foreground rounded-lg hover:bg-surface-2">Close</button>
              <button onClick={() => printOne(selectedUser)} className="py-2 px-4 bg-gold/10 text-gold border border-gold/30 rounded-lg hover:bg-gold/20 flex items-center gap-1">
                <Printer size={14} /> Print PDF
              </button>
              {selectedUser.ticket_printed && (
                <button onClick={() => { setReprintUser(selectedUser); setSelectedUser(null); }}
                  className="py-2 px-4 bg-gold text-background rounded-lg hover:bg-gold-light flex items-center gap-1">
                  <RotateCcw size={14} /> Reprint Ticket
                </button>
              )}
              <button onClick={() => deleteUser(selectedUser.id)} className="py-2 px-4 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 flex items-center gap-1">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {reprintUser && (
        <div className="fixed inset-0 bg-background/60 z-50 flex items-center justify-center p-4" onClick={() => !reprintLoading && setReprintUser(null)}>
          <div className="gold-card rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl text-gold-gradient mb-2">Reprint Ticket</h3>
            <p className="text-sm text-muted-foreground mb-4">Are you sure you want to reprint the ticket for <strong className="text-foreground">{reprintUser.first_name} {reprintUser.last_name}</strong>? This will be logged and watermarked as REPRINT.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Reason</label>
                <select value={reprintReason} onChange={(e) => setReprintReason(e.target.value as any)}
                  className="w-full px-3 py-2 bg-surface-2 border border-gold/20 rounded-lg text-foreground text-sm focus:outline-none focus:border-gold/60">
                  <option value="lost">Lost</option>
                  <option value="damaged">Damaged</option>
                  <option value="technical_issue">Technical issue</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <input value={reprintNote} onChange={(e) => setReprintNote(e.target.value)} placeholder="Additional notes (optional)"
                className="w-full px-3 py-2 bg-surface-2 border border-gold/20 rounded-lg text-foreground text-sm focus:outline-none focus:border-gold/60" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setReprintUser(null)} disabled={reprintLoading} className="flex-1 py-2 border border-gold/20 text-foreground rounded-lg hover:bg-surface-2">Cancel</button>
              <button onClick={doReprint} disabled={reprintLoading} className="flex-1 py-2 bg-gold text-background rounded-lg hover:bg-gold-light flex items-center justify-center gap-2 disabled:opacity-50">
                {reprintLoading ? '...' : <><RotateCcw size={14} /> Confirm Reprint</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-gold/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="text-muted-foreground border-b border-gold/10">
                <th className="text-left p-4">Code</th>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4 hidden lg:table-cell">School</th>
                <th className="text-left p-4 hidden lg:table-cell">Level</th>
                <th className="text-right p-4">Paid</th>
                <th className="text-center p-4">Status</th>
                <th className="text-center p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No registrations found</td></tr>}
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-gold/5 hover:bg-surface transition-colors">
                  <td className="p-4 font-mono text-gold text-xs">{u.codes?.code || '-'}</td>
                  <td className="p-4 text-foreground">{u.first_name} {u.last_name}</td>
                  <td className="p-4 text-muted-foreground hidden lg:table-cell">{u.school_name || u.department}</td>
                  <td className="p-4 text-muted-foreground hidden lg:table-cell">{u.level || '-'}</td>
                  <td className="p-4 text-right text-gold">{u.paid_amount.toLocaleString()}</td>
                  <td className="p-4 text-center"><span className={`text-xs px-2 py-1 rounded-full capitalize ${statusColors[u.payment_status]}`}>{u.payment_status}</span></td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setSelectedUser(u)} className="p-1.5 rounded bg-gold/10 text-gold hover:bg-gold/20 transition-colors" title="View"><Eye size={14} /></button>
                      <button onClick={() => printOne(u)} className="p-1.5 rounded bg-gold/10 text-gold hover:bg-gold/20 transition-colors" title="Print PDF"><Printer size={14} /></button>
                      <button onClick={() => deleteUser(u.id)} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors" title="Delete"><Trash2 size={14} /></button>
                    </div>
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

export default AdminRegistrations;
