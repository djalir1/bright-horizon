import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSession } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Search, Loader2, CheckCircle2, Clock } from "lucide-react";

interface Row {
  user: any;
  refund: any | null;
}

const AdminRefunds = () => {
  const session = useAdminSession();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventStatus, setEventStatus] = useState<string>('active');
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (session && session.role !== 'superadmin') navigate('/admin');
  }, [session, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    const [usersRes, refundsRes, statusRes] = await Promise.all([
      supabase.from('users').select('id, first_name, last_name, phone, paid_amount, school_name, codes:codes!fk_codes_used_by(code)').eq('payment_status', 'paid').order('first_name'),
      supabase.from('refunds').select('*'),
      supabase.from('settings').select('value').eq('key', 'event_status').maybeSingle(),
    ]);
    setEventStatus(statusRes.data?.value || 'active');
    const map = new Map<string, any>();
    (refundsRes.data || []).forEach(r => map.set(r.user_id, r));
    setRows((usersRes.data || []).map((u: any) => ({ user: u, refund: map.get(u.id) || null })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (status: string) => {
    await supabase.from('settings').upsert({ key: 'event_status', value: status }, { onConflict: 'key' });
    setEventStatus(status);
    toast.success(`Event status set to: ${status}`);
  };

  const createOrUpdate = async (row: Row, momoFee: number, markProcessed: boolean) => {
    setBusyId(row.user.id);
    try {
      const original = row.user.paid_amount || 0;
      const refundAmount = Math.max(0, original - momoFee);
      const phone = row.user.phone || null;
      if (row.refund) {
        const patch: any = { momo_fee: momoFee, refund_amount: refundAmount, refund_phone: phone };
        if (markProcessed) {
          patch.status = 'processed';
          patch.processed_at = new Date().toISOString();
          patch.processed_by_email = session?.email || null;
        }
        await supabase.from('refunds').update(patch).eq('id', row.refund.id);
      } else {
        await supabase.from('refunds').insert({
          user_id: row.user.id,
          original_amount: original,
          momo_fee: momoFee,
          refund_amount: refundAmount,
          refund_phone: phone,
          reason: 'event_cancelled',
          status: markProcessed ? 'processed' : 'pending',
          processed_at: markProcessed ? new Date().toISOString() : null,
          processed_by_email: markProcessed ? (session?.email || null) : null,
        });
      }
      toast.success('Refund updated');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    }
    setBusyId(null);
  };

  const totalOutstanding = rows.reduce((s, r) => s + ((r.refund && r.refund.status !== 'processed') ? r.refund.refund_amount : (r.refund ? 0 : (r.user.paid_amount || 0))), 0);
  const totalRefunded = rows.reduce((s, r) => s + (r.refund?.status === 'processed' ? r.refund.refund_amount : 0), 0);

  const filtered = rows.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const code = (Array.isArray(r.user.codes) ? r.user.codes?.[0]?.code : r.user.codes?.code) || '';
    return `${r.user.first_name} ${r.user.last_name}`.toLowerCase().includes(q) || code.toLowerCase().includes(q) || (r.user.phone || '').includes(q);
  });

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-gold">Refunds</h2>
            <p className="text-xs text-muted-foreground">Only used if the event is cancelled or postponed. Refund = paid amount minus MoMo fee.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Event status:</span>
            {['active', 'postponed', 'cancelled'].map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-3 py-1.5 text-xs rounded-lg border ${eventStatus === s ? 'bg-gold text-background border-gold' : 'border-gold/20 text-foreground/70 hover:border-gold/50'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card label="Paid tickets" value={rows.length.toLocaleString()} />
          <Card label="Outstanding" value={`${totalOutstanding.toLocaleString()} RWF`} />
          <Card label="Refunded" value={`${totalRefunded.toLocaleString()} RWF`} />
        </div>

        <div className="bg-card border border-gold/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search size={14} className="text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, code or phone"
              className="flex-1 px-3 py-2 bg-surface-2 border border-gold/20 rounded-lg text-sm focus:outline-none focus:border-gold/60" />
          </div>

          {loading ? <div className="py-8 text-center"><Loader2 className="animate-spin text-gold mx-auto" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-gold/10">
                    <th className="py-2 pr-3">Guest</th>
                    <th className="py-2 pr-3">Code</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">Paid</th>
                    <th className="py-2 pr-3">MoMo fee</th>
                    <th className="py-2 pr-3">Refund</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row => <RefundRow key={row.user.id} row={row} onSave={createOrUpdate} busy={busyId === row.user.id} />)}
                  {filtered.length === 0 && <tr><td colSpan={8} className="text-center text-muted-foreground py-6">No paid tickets.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

const Card = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-card border border-gold/10 rounded-xl p-4">
    <div className="text-xs uppercase text-muted-foreground tracking-wide">{label}</div>
    <div className="font-display text-2xl text-foreground mt-1">{value}</div>
  </div>
);

const RefundRow = ({ row, onSave, busy }: { row: Row; onSave: (row: Row, fee: number, processed: boolean) => void; busy: boolean }) => {
  const initFee = row.refund?.momo_fee ?? 0;
  const [fee, setFee] = useState<number>(initFee);
  const paid = row.user.paid_amount || 0;
  const refundAmount = Math.max(0, paid - fee);
  const code = Array.isArray(row.user.codes) ? row.user.codes?.[0]?.code : row.user.codes?.code;
  const status = row.refund?.status || 'none';
  return (
    <tr className="border-b border-gold/5">
      <td className="py-2 pr-3">
        <div className="text-foreground">{row.user.first_name} {row.user.last_name}</div>
        <div className="text-[11px] text-muted-foreground">{row.user.school_name || '-'}</div>
      </td>
      <td className="py-2 pr-3 font-mono text-xs text-gold">{code || '-'}</td>
      <td className="py-2 pr-3 text-xs">{row.user.phone || '-'}</td>
      <td className="py-2 pr-3 font-mono">{paid.toLocaleString()}</td>
      <td className="py-2 pr-3">
        <input type="number" min={0} value={fee} onChange={(e) => setFee(Math.max(0, Number(e.target.value) || 0))}
          className="w-24 px-2 py-1 bg-surface-2 border border-gold/20 rounded text-xs font-mono focus:outline-none focus:border-gold/60" />
      </td>
      <td className="py-2 pr-3 font-mono text-gold">{refundAmount.toLocaleString()}</td>
      <td className="py-2 pr-3">
        {status === 'processed' ? (
          <span className="text-xs text-green-400 inline-flex items-center gap-1"><CheckCircle2 size={12} /> processed</span>
        ) : status === 'pending' ? (
          <span className="text-xs text-orange-400 inline-flex items-center gap-1"><Clock size={12} /> pending</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
        {row.refund?.processed_at && (
          <div className="text-[10px] text-muted-foreground">{formatDate(row.refund.processed_at)}</div>
        )}
      </td>
      <td className="py-2 pr-3 space-x-1">
        <button disabled={busy || status === 'processed'} onClick={() => onSave(row, fee, false)}
          className="px-2 py-1 text-xs rounded bg-surface-2 border border-gold/20 hover:bg-gold/10 disabled:opacity-40">Save</button>
        <button disabled={busy || status === 'processed'} onClick={() => onSave(row, fee, true)}
          className="px-2 py-1 text-xs rounded bg-gold text-background font-semibold hover:bg-gold-light disabled:opacity-40">Mark processed</button>
      </td>
    </tr>
  );
};

export default AdminRefunds;