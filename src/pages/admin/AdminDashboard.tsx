import AdminLayout from "@/components/admin/AdminLayout";
import { Users, CreditCard, Clock, TrendingUp, ShieldCheck, Download, FileText } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, formatDate, formatDateTimeSec } from "@/lib/format";
import { exportCsv, exportPdfReport } from "@/lib/reports";

const COLORS = ['#C0392B', '#C9A84C', '#2D6A4F'];

const AdminDashboard = () => {
  const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0, pendingPayments: 0, revenue: 0 });
  const [schoolData, setSchoolData] = useState<{name: string; count: number}[]>([]);
  const [revenueData, setRevenueData] = useState<{day: string; revenue: number}[]>([]);
  const [paymentStatusData, setPaymentStatusData] = useState<{name: string; value: number}[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [agentTotals, setAgentTotals] = useState<{ name: string; codes: number; cash: number; momo: number }[]>([]);
  const [tierStats, setTierStats] = useState<{ id: string; name: string; price: number; sold: number; total: number; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  // === Report exports ===
  const fetchAll = async <T,>(table: string, select = '*'): Promise<T[]> => {
    const { data } = await supabase.from(table as any).select(select);
    return (data as T[]) || [];
  };

  const reportRegistrations = async (kind: 'csv' | 'pdf') => {
    const [u, s] = await Promise.all([
      supabase.from('users').select('*').order('registered_at', { ascending: false }),
      supabase.from('schools').select('id, name'),
    ]);
    const schoolMap: Record<string, string> = {};
    (s.data || []).forEach((x: any) => { schoolMap[x.id] = x.name; });
    const headers = ['Code', 'Name', 'School', 'Level', 'Phone', 'Email', 'Status', 'Paid', 'Remaining', 'Registered'];
    const rows = (u.data || []).map((x: any) => [
      '', `${x.first_name} ${x.last_name}`, x.school_name || schoolMap[x.school_id] || '',
      x.level || '', x.phone, x.email, x.payment_status,
      x.paid_amount, x.remaining_amount, formatDateTimeSec(x.registered_at),
    ]);
    const fname = `registrations-${Date.now()}.${kind}`;
    if (kind === 'csv') exportCsv(fname, headers, rows);
    else await exportPdfReport({ title: 'Registrations Report', subtitle: `${rows.length} students`, headers, rows, filename: fname });
  };

  const reportPayments = async (kind: 'csv' | 'pdf') => {
    const { data } = await supabase.from('payments').select('*, users(first_name, last_name, school_name)').order('submitted_at', { ascending: false });
    const headers = ['Date', 'Name', 'School', 'Amount', 'Method', 'Status', 'Reviewer', 'TXN'];
    const rows = (data || []).map((p: any) => [
      formatDateTimeSec(p.submitted_at), `${p.users?.first_name || ''} ${p.users?.last_name || ''}`,
      p.users?.school_name || '', p.amount, p.method, p.status, p.reviewed_by || '', p.transaction_id || '',
    ]);
    const fname = `payments-${Date.now()}.${kind}`;
    if (kind === 'csv') exportCsv(fname, headers, rows);
    else await exportPdfReport({ title: 'Payments Report', subtitle: `${rows.length} records`, headers, rows, filename: fname });
  };

  const reportAttendance = async (kind: 'csv' | 'pdf') => {
    const { data } = await supabase.from('users').select('*').order('entered_at', { ascending: false });
    const headers = ['Name', 'School', 'Level', 'Entered', 'Exited', 'Status'];
    const rows = (data || []).map((u: any) => [
      `${u.first_name} ${u.last_name}`, u.school_name || '', u.level || '',
      u.entered ? formatDateTimeSec(u.entered_at) : '', u.exited ? formatDateTimeSec(u.exited_at) : '',
      u.exited ? 'Exited' : u.entered ? 'Inside' : 'Not entered',
    ]);
    const fname = `attendance-${Date.now()}.${kind}`;
    if (kind === 'csv') exportCsv(fname, headers, rows);
    else await exportPdfReport({ title: 'Attendance Report', subtitle: `${rows.length} students`, headers, rows, filename: fname });
  };

  const reportPerSchool = async (kind: 'csv' | 'pdf') => {
    const [u, s] = await Promise.all([
      supabase.from('users').select('school_id, payment_status, paid_amount, entered, exited'),
      supabase.from('schools').select('id, name'),
    ]);
    const agg: Record<string, any> = {};
    (s.data || []).forEach((sc: any) => { agg[sc.id] = { name: sc.name, total: 0, paid: 0, unpaid: 0, revenue: 0, entered: 0 }; });
    (u.data || []).forEach((x: any) => {
      const k = x.school_id; if (!k || !agg[k]) return;
      agg[k].total++;
      if (x.payment_status === 'paid') agg[k].paid++; else agg[k].unpaid++;
      agg[k].revenue += x.paid_amount || 0;
      if (x.entered) agg[k].entered++;
    });
    const headers = ['School', 'Total', 'Paid', 'Unpaid', 'Entered', 'Revenue (RWF)'];
    const rows = Object.values(agg).map((r: any) => [r.name, r.total, r.paid, r.unpaid, r.entered, r.revenue.toLocaleString()]);
    const fname = `per-school-${Date.now()}.${kind}`;
    if (kind === 'csv') exportCsv(fname, headers, rows);
    else await exportPdfReport({ title: 'Per-School Summary', subtitle: `${rows.length} schools`, headers, rows, filename: fname });
  };

  const reports = [
    { label: 'Registrations', run: reportRegistrations },
    { label: 'Payments', run: reportPayments },
    { label: 'Attendance', run: reportAttendance },
    { label: 'Per-school summary', run: reportPerSchool },
  ];

  const loadData = async () => {
    try {
      const [{ data: users }, { data: transactions }, { data: payments }, { data: schools }, { data: codes }, { data: tiers }] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('transactions').select('*, users!inner(first_name, last_name)'),
        supabase.from('payments').select('*, users!inner(first_name, last_name)').order('submitted_at', { ascending: false }).limit(10),
        supabase.from('schools').select('*'),
        supabase.from('codes').select('created_by, payment_method, fee_amount'),
        supabase.from('ticket_tiers').select('*').order('sort_order'),
      ]);

      const u = users || [];
      const unpaidCount = u.filter(x => x.payment_status === 'unpaid').length;
      const paidCount = u.filter(x => x.payment_status === 'paid').length;

      setStats({
        total: u.length,
        pending: unpaidCount,
        paid: paidCount,
        pendingPayments: u.filter(x => x.payment_status !== 'paid').length,
        revenue: (transactions || []).reduce((sum, t) => sum + t.amount, 0),
      });

      setPaymentStatusData([
        { name: 'Unpaid', value: unpaidCount },
        { name: 'Paid', value: paidCount },
      ]);

      // School data
      const schoolMap: Record<string, { name: string; count: number }> = {};
      (schools || []).forEach(s => { schoolMap[s.id] = { name: s.name, count: 0 }; });
      u.forEach(user => { if (user.school_id && schoolMap[user.school_id]) schoolMap[user.school_id].count++; });
      setSchoolData(Object.values(schoolMap).filter(s => s.count > 0).sort((a, b) => b.count - a.count).slice(0, 8));

      // Revenue by day
      const days: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        days[key] = 0;
      }
      (transactions || []).forEach(t => {
        const d = new Date(t.created_at);
        const key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        if (days[key] !== undefined) days[key] += t.amount;
      });
      setRevenueData(Object.entries(days).map(([day, revenue]) => ({ day, revenue })));

      setRecentPayments((payments || []).map(p => ({
        name: `${p.users.first_name} ${p.users.last_name}`,
        amount: p.amount,
        method: p.method,
        time: formatDate(p.submitted_at),
        status: p.status,
      })));

      // Per-agent collection summary (registration fees from generated codes)
      const agentMap: Record<string, { name: string; codes: number; cash: number; momo: number }> = {};
      (codes || []).forEach((c: any) => {
        const name = c.created_by || 'unknown';
        if (!agentMap[name]) agentMap[name] = { name, codes: 0, cash: 0, momo: 0 };
        agentMap[name].codes++;
        const fee = c.fee_amount ?? 0;
        if (c.payment_method === 'cash') agentMap[name].cash += fee;
        else if (c.payment_method === 'momo') agentMap[name].momo += fee;
      });
      setAgentTotals(Object.values(agentMap).sort((a, b) => (b.cash + b.momo) - (a.cash + a.momo)));

      // Tier breakdown
      setTierStats((tiers || []).map((t: any) => ({
        id: t.id, name: t.name, price: t.price,
        sold: t.quantity_sold || 0, total: t.quantity_total || 0,
        revenue: (t.quantity_sold || 0) * (t.price || 0),
      })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const statCards = [
    { label: "Total Registered", value: String(stats.total), icon: Users },
    { label: "Pending Verification", value: String(stats.pending), icon: ShieldCheck },
    { label: "Fully Paid", value: String(stats.paid), icon: CreditCard },
    { label: "Pending Payments", value: String(stats.pendingPayments), icon: Clock },
    { label: "Total Revenue", value: formatMoney(stats.revenue), icon: TrendingUp },
  ];

  const statusColors: Record<string, string> = {
    pending: "bg-gold/10 text-gold",
    approved: "bg-green-900/30 text-green-400",
    rejected: "bg-destructive/10 text-destructive",
  };

  return (
    <AdminLayout>
      <div className="bg-card border border-gold/10 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-display text-lg text-foreground">Reports</h3>
          <p className="text-xs text-muted-foreground">Branded with S.A.D Corporation logo and footer</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {reports.map(r => (
            <div key={r.label} className="bg-surface-2 border border-gold/10 rounded-lg p-3">
              <p className="text-xs text-foreground mb-2 font-semibold">{r.label}</p>
              <div className="flex gap-1">
                <button onClick={() => r.run('csv')} className="flex-1 px-2 py-1.5 text-xs bg-card border border-gold/20 rounded hover:border-gold/40 flex items-center justify-center gap-1">
                  <Download size={12} /> CSV
                </button>
                <button onClick={() => r.run('pdf')} className="flex-1 px-2 py-1.5 text-xs bg-gold/10 text-gold border border-gold/30 rounded hover:bg-gold/20 flex items-center justify-center gap-1">
                  <FileText size={12} /> PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-card border border-gold/10 rounded-lg p-4 border-l-4 border-l-gold">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <stat.icon size={16} className="text-gold/50" />
            </div>
            <p className="text-xl font-display font-semibold text-foreground">{loading ? "..." : stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-gold/10 rounded-lg p-5">
          <h3 className="font-display text-lg text-foreground mb-4">Registrations by School</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={schoolData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.1)" />
              <XAxis dataKey="name" tick={{ fill: '#8A8070', fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fill: '#8A8070', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, color: '#F5F0E8' }} />
              <Bar dataKey="count" fill="#C9A84C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-gold/10 rounded-lg p-5">
          <h3 className="font-display text-lg text-foreground mb-4">Daily Revenue (14 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.1)" />
              <XAxis dataKey="day" tick={{ fill: '#8A8070', fontSize: 10 }} />
              <YAxis tick={{ fill: '#8A8070', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, color: '#F5F0E8' }} />
              <Line type="monotone" dataKey="revenue" stroke="#C9A84C" strokeWidth={2} dot={{ fill: '#C9A84C', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-gold/10 rounded-lg p-5">
          <h3 className="font-display text-lg text-foreground mb-4">Payment Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={paymentStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {paymentStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, color: '#F5F0E8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-gold/10 rounded-lg p-5">
        <h3 className="font-display text-lg text-foreground mb-4">Recent Payments</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-gold/10">
                <th className="text-left pb-3">Name</th>
                <th className="text-right pb-3">Amount</th>
                <th className="text-right pb-3 hidden sm:table-cell">Method</th>
                <th className="text-right pb-3 hidden md:table-cell">Date</th>
                <th className="text-right pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.length === 0 && !loading && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No payments yet</td></tr>
              )}
              {recentPayments.map((p, i) => (
                <tr key={i} className="border-b border-gold/5">
                  <td className="py-3 text-foreground">{p.name}</td>
                  <td className="py-3 text-right text-gold">{p.amount.toLocaleString()} RWF</td>
                  <td className="py-3 text-right text-muted-foreground hidden sm:table-cell capitalize">{p.method}</td>
                  <td className="py-3 text-right text-muted-foreground text-xs hidden md:table-cell">{p.time}</td>
                  <td className="py-3 text-right">
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusColors[p.status] || ''}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card border border-gold/10 rounded-lg p-5 mt-6">
        <h3 className="font-display text-lg text-foreground mb-1">Ticket Tiers — Sales Breakdown</h3>
        <p className="text-xs text-muted-foreground mb-4">Live counts per tier. Revenue = sold × price.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-gold/10">
                <th className="text-left pb-3">Tier</th>
                <th className="text-right pb-3">Price (RWF)</th>
                <th className="text-right pb-3">Sold</th>
                <th className="text-right pb-3">Capacity</th>
                <th className="text-right pb-3">Remaining</th>
                <th className="text-right pb-3">Revenue (RWF)</th>
              </tr>
            </thead>
            <tbody>
              {tierStats.length === 0 && !loading && (
                <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No tiers configured</td></tr>
              )}
              {tierStats.map((t) => (
                <tr key={t.id} className="border-b border-gold/5">
                  <td className="py-3 text-foreground">{t.name}</td>
                  <td className="py-3 text-right text-muted-foreground">{t.price.toLocaleString()}</td>
                  <td className="py-3 text-right text-foreground">{t.sold}</td>
                  <td className="py-3 text-right text-muted-foreground">{t.total}</td>
                  <td className="py-3 text-right text-muted-foreground">{Math.max(0, t.total - t.sold)}</td>
                  <td className="py-3 text-right text-gold font-semibold">{t.revenue.toLocaleString()}</td>
                </tr>
              ))}
              {tierStats.length > 0 && (
                <tr className="border-t border-gold/20">
                  <td className="py-3 text-foreground font-semibold" colSpan={2}>Total</td>
                  <td className="py-3 text-right text-foreground">{tierStats.reduce((s, t) => s + t.sold, 0)}</td>
                  <td className="py-3 text-right text-muted-foreground">{tierStats.reduce((s, t) => s + t.total, 0)}</td>
                  <td className="py-3 text-right text-muted-foreground">{tierStats.reduce((s, t) => s + Math.max(0, t.total - t.sold), 0)}</td>
                  <td className="py-3 text-right text-gold font-semibold">{tierStats.reduce((s, t) => s + t.revenue, 0).toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card border border-gold/10 rounded-lg p-5 mt-6">
        <h3 className="font-display text-lg text-foreground mb-1">Agent Collections — Manual Codes</h3>
        <p className="text-xs text-muted-foreground mb-4">Totals are based on the fee recorded on each manually-generated code. Cash totals are owed by the agent to S.A.D.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-gold/10">
                <th className="text-left pb-3">Agent / Admin</th>
                <th className="text-right pb-3">Codes</th>
                <th className="text-right pb-3">Cash (RWF)</th>
                <th className="text-right pb-3">MoMo (RWF)</th>
                <th className="text-right pb-3">Total (RWF)</th>
              </tr>
            </thead>
            <tbody>
              {agentTotals.length === 0 && !loading && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No codes generated yet</td></tr>
              )}
              {agentTotals.map((a) => (
                <tr key={a.name} className="border-b border-gold/5">
                  <td className="py-3 text-foreground">{a.name}</td>
                  <td className="py-3 text-right text-muted-foreground">{a.codes}</td>
                  <td className="py-3 text-right text-foreground">{a.cash.toLocaleString()}</td>
                  <td className="py-3 text-right text-foreground">{a.momo.toLocaleString()}</td>
                  <td className="py-3 text-right text-gold font-semibold">{(a.cash + a.momo).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
