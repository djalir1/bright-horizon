import AdminLayout from "@/components/admin/AdminLayout";
import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTimeSec } from "@/lib/format";
import { exportCsv, exportPdfReport } from "@/lib/reports";
import { toast } from "sonner";

const AdminReports = () => {
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } catch (e) { console.error(e); toast.error('Export failed'); }
    setBusy(null);
  };

  // Helpers — append a TOTAL row summing numeric money columns (indices given).
  const sumMoney = (rows: any[][], idx: number) =>
    rows.reduce((acc, r) => {
      const raw = String(r[idx] ?? '').replace(/[^\d.-]/g, '');
      const n = Number(raw);
      return acc + (isFinite(n) ? n : 0);
    }, 0);
  const totalRow = (rows: any[][], labelIdx: number, label: string, moneyIdxs: number[]): any[] => {
    if (!rows.length) return [];
    const row = new Array(rows[0].length).fill('');
    row[labelIdx] = label;
    moneyIdxs.forEach(i => { row[i] = sumMoney(rows, i).toLocaleString(); });
    return row;
  };

  const reportRegistrations = async (kind: 'csv' | 'pdf') => {
    const [u, s, c] = await Promise.all([
      supabase.from('users').select('*').order('registered_at', { ascending: false }),
      supabase.from('schools').select('id, name'),
      supabase.from('codes').select('id, code'),
    ]);
    const schoolMap: Record<string, string> = {};
    (s.data || []).forEach((x: any) => { schoolMap[x.id] = x.name; });
    const codeMap: Record<string, string> = {};
    (c.data || []).forEach((x: any) => { codeMap[x.id] = x.code; });
    const headers = ['Code', 'Name', 'School', 'Level', 'Phone', 'Email', 'Gender', 'Status', 'Paid', 'Remaining', 'Registered'];
    const rows = (u.data || []).map((x: any) => [
      codeMap[x.code_id] || '-',
      `${x.first_name} ${x.last_name}`,
      x.school_name || schoolMap[x.school_id] || '',
      x.level || '', x.phone, x.email, x.gender,
      x.payment_status, x.paid_amount, x.remaining_amount,
      formatDateTimeSec(x.registered_at),
    ]);
    const tot = totalRow(rows, 1, 'TOTAL', [8, 9]);
    if (tot.length) rows.push(tot);
    const fname = `Senior-Gala-Registrations-${Date.now()}.${kind}`;
    if (kind === 'csv') exportCsv(fname, headers, rows);
    else await exportPdfReport({ title: 'Registrations Report', subtitle: `${rows.length} students`, headers, rows, filename: fname });
    toast.success(`${kind.toUpperCase()} downloaded`);
  };

  const reportPayments = async (kind: 'csv' | 'pdf') => {
    const { data } = await supabase.from('payments').select('*, users(first_name, last_name, school_name)').order('submitted_at', { ascending: false });
    const headers = ['Date', 'Name', 'School', 'Amount (RWF)', 'Method', 'Status', 'Reviewer', 'TXN'];
    const rows = (data || []).map((p: any) => [
      formatDateTimeSec(p.submitted_at),
      `${p.users?.first_name || ''} ${p.users?.last_name || ''}`,
      p.users?.school_name || '',
      p.amount.toLocaleString(), p.method, p.status, p.reviewed_by || '', p.transaction_id || '',
    ]);
    const tot = totalRow(rows, 1, 'TOTAL', [3]);
    if (tot.length) rows.push(tot);
    const fname = `Senior-Gala-Payments-${Date.now()}.${kind}`;
    if (kind === 'csv') exportCsv(fname, headers, rows);
    else await exportPdfReport({ title: 'Payments Report', subtitle: `${rows.length} records`, headers, rows, filename: fname });
    toast.success(`${kind.toUpperCase()} downloaded`);
  };

  const reportTransactions = async (kind: 'csv' | 'pdf') => {
    const { data } = await supabase.from('transactions').select('*, users(first_name, last_name, school_name)').order('created_at', { ascending: false });
    const headers = ['Date', 'Name', 'School', 'Amount (RWF)', 'Method', 'Recorded By'];
    const rows = (data || []).map((t: any) => [
      formatDateTimeSec(t.created_at),
      `${t.users?.first_name || ''} ${t.users?.last_name || ''}`,
      t.users?.school_name || '',
      t.amount.toLocaleString(), t.method, t.recorded_by || '',
    ]);
    const tot = totalRow(rows, 1, 'TOTAL', [3]);
    if (tot.length) rows.push(tot);
    const fname = `Senior-Gala-Transactions-${Date.now()}.${kind}`;
    if (kind === 'csv') exportCsv(fname, headers, rows);
    else await exportPdfReport({ title: 'Transactions Ledger', subtitle: `${rows.length} entries`, headers, rows, filename: fname });
    toast.success(`${kind.toUpperCase()} downloaded`);
  };

  const reportAttendance = async (kind: 'csv' | 'pdf') => {
    const { data } = await supabase.from('users').select('*').order('entered_at', { ascending: false });
    const headers = ['Name', 'School', 'Level', 'Phone', 'Entered', 'Exited', 'Status'];
    const rows = (data || []).map((u: any) => [
      `${u.first_name} ${u.last_name}`, u.school_name || '', u.level || '', u.phone,
      u.entered ? formatDateTimeSec(u.entered_at) : '',
      u.exited ? formatDateTimeSec(u.exited_at) : '',
      u.exited ? 'Exited' : u.entered ? 'Inside' : 'Not entered',
    ]);
    const fname = `Senior-Gala-Attendance-${Date.now()}.${kind}`;
    if (kind === 'csv') exportCsv(fname, headers, rows);
    else await exportPdfReport({ title: 'Attendance Report', subtitle: `${rows.length} students`, headers, rows, filename: fname });
    toast.success(`${kind.toUpperCase()} downloaded`);
  };

  const reportPerSchool = async (kind: 'csv' | 'pdf') => {
    const [u, s] = await Promise.all([
      supabase.from('users').select('school_id, payment_status, paid_amount, entered, exited'),
      supabase.from('schools').select('id, name'),
    ]);
    const agg: Record<string, any> = {};
    (s.data || []).forEach((sc: any) => { agg[sc.id] = { name: sc.name, total: 0, paid: 0, unpaid: 0, revenue: 0, entered: 0, exited: 0 }; });
    (u.data || []).forEach((x: any) => {
      const k = x.school_id; if (!k || !agg[k]) return;
      agg[k].total++;
      if (x.payment_status === 'paid') agg[k].paid++; else agg[k].unpaid++;
      agg[k].revenue += x.paid_amount || 0;
      if (x.entered) agg[k].entered++;
      if (x.exited) agg[k].exited++;
    });
    const headers = ['School', 'Total', 'Paid', 'Unpaid', 'Entered', 'Exited', 'Revenue (RWF)'];
    const rows = Object.values(agg).map((r: any) => [r.name, r.total, r.paid, r.unpaid, r.entered, r.exited, r.revenue.toLocaleString()]);
    const tot = totalRow(rows, 0, 'TOTAL', [1, 2, 3, 4, 5, 6]);
    if (tot.length) rows.push(tot);
    const fname = `Senior-Gala-Per-School-${Date.now()}.${kind}`;
    if (kind === 'csv') exportCsv(fname, headers, rows);
    else await exportPdfReport({ title: 'Per-School Summary', subtitle: `${rows.length} schools`, headers, rows, filename: fname });
    toast.success(`${kind.toUpperCase()} downloaded`);
  };

  const reportAgentActivity = async (kind: 'csv' | 'pdf') => {
    const { data } = await supabase.from('agent_logs').select('*').order('created_at', { ascending: false });
    const headers = ['Time', 'Agent', 'Role', 'Action', 'Target', 'Details'];
    const rows = (data || []).map((l: any) => [
      formatDateTimeSec(l.created_at), l.agent_name, l.agent_role, l.action,
      [l.target_type, l.target_id].filter(Boolean).join(':'), l.details || '',
    ]);
    const fname = `Senior-Gala-Activity-${Date.now()}.${kind}`;
    if (kind === 'csv') exportCsv(fname, headers, rows);
    else await exportPdfReport({ title: 'Agent Activity Log', subtitle: `${rows.length} entries`, headers, rows, filename: fname });
    toast.success(`${kind.toUpperCase()} downloaded`);
  };

  const reports = [
    { key: 'reg',  label: 'Registrations',      desc: 'Every student, code, school, level, contact, payment status.', run: reportRegistrations },
    { key: 'pay',  label: 'Payments',           desc: 'All submitted payments (pending, approved, rejected).',        run: reportPayments },
    { key: 'tx',   label: 'Transactions',       desc: 'Approved money-in ledger (cash & MoMo).',                       run: reportTransactions },
    { key: 'att',  label: 'Attendance',         desc: 'Who entered, who exited, exact timestamps.',                    run: reportAttendance },
    { key: 'sch',  label: 'Per-School Summary', desc: 'Totals per school: registered, paid, revenue, entries.',       run: reportPerSchool },
    { key: 'act',  label: 'Agent Activity',     desc: 'Audit trail of admin/agent actions.',                          run: reportAgentActivity },
  ];

  return (
    <AdminLayout>
      <div className="max-w-5xl">
        <div className="mb-6">
          <h2 className="font-display text-2xl text-gold-gradient mb-1">Reports</h2>
          <p className="text-sm text-muted-foreground">Every report is branded with the S.A.D Corporation logo, footer, and exact timestamps.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map(r => (
            <div key={r.key} className="bg-card border border-gold/15 rounded-xl p-5">
              <h3 className="font-display text-lg text-foreground mb-1">{r.label}</h3>
              <p className="text-xs text-muted-foreground mb-4">{r.desc}</p>
              <div className="flex gap-2">
                <button onClick={() => run(`${r.key}-csv`, () => r.run('csv'))} disabled={busy !== null}
                  className="flex-1 px-3 py-2 text-sm bg-surface-2 border border-gold/20 rounded-lg hover:border-gold/40 flex items-center justify-center gap-2 disabled:opacity-50">
                  {busy === `${r.key}-csv` ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} CSV
                </button>
                <button onClick={() => run(`${r.key}-pdf`, () => r.run('pdf'))} disabled={busy !== null}
                  className="flex-1 px-3 py-2 text-sm bg-gold/10 text-gold border border-gold/30 rounded-lg hover:bg-gold/20 flex items-center justify-center gap-2 disabled:opacity-50">
                  {busy === `${r.key}-pdf` ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
