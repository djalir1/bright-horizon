import { logAgentAction } from "@/lib/agentLog";
import AdminLayout from "@/components/admin/AdminLayout";
import { Check, X, Loader2, Eye, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, formatDate } from "@/lib/format";
import { getAdminSession } from "@/lib/auth";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-gold/10 text-gold",
  approved: "bg-green-900/30 text-green-400",
  rejected: "bg-destructive/10 text-destructive",
};

const AdminPayments = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashCode, setCashCode] = useState("");
  const [cashUser, setCashUser] = useState<any>(null);
  const [cashAmount, setCashAmount] = useState("");
  const [cashNotes, setCashNotes] = useState("");
  const [cashLoading, setCashLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmingPayment, setConfirmingPayment] = useState<any>(null);
  const session = getAdminSession();

  useEffect(() => { loadPayments(); }, []);

  const loadPayments = async () => {
    const { data, error } = await supabase.from('payments').select('*, users!payments_user_id_fkey(first_name, last_name, remaining_amount, paid_amount, ticket_price, codes!users_code_id_fkey(code))').order('submitted_at', { ascending: false });
    if (error) { console.error('loadPayments error', error); toast.error('Failed to load payments'); }
    setPayments(data || []);
    setLoading(false);
  };

  const handleApprove = async (payment: any) => {
    setProcessingId(payment.id);
    toast.loading("Approving...");
    try {
      await supabase.from('payments').update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: session?.email }).eq('id', payment.id);
      await supabase.from('transactions').insert({ user_id: payment.user_id, payment_id: payment.id, amount: payment.amount, method: payment.method, recorded_by: session?.email });
      
      const newPaid = (payment.users?.paid_amount || 0) + payment.amount;
      const ticketPrice = payment.users?.ticket_price || 25000;
      const newRemaining = Math.max(0, ticketPrice - newPaid);
      // Single full payment model — any approved payment marks user as paid
      await supabase.from('users').update({
        paid_amount: newPaid,
        remaining_amount: newRemaining,
        payment_status: 'paid',
        ticket_state: 'confirmed',
      }).eq('id', payment.user_id);

      // Fire ticket-confirmed email (best effort)
      if (payment.users?.email) {
        supabase.functions.invoke('send-ticket-confirmed', {
          body: { userId: payment.user_id, recipientEmail: payment.users.email, code: payment.users?.codes?.code },
        }).catch(() => {});
      }

      toast.dismiss();
      toast.success("Payment approved!");
      await logAgentAction('payment_approved', `Approved ${payment.amount.toLocaleString()} RWF via ${payment.method} for ${payment.users?.first_name || ''} ${payment.users?.last_name || ''}`, { type: 'payment', id: payment.id });
      setConfirmingPayment(null);
      loadPayments();
    } catch {
      toast.dismiss();
      toast.error("Failed to approve");
    }
    setProcessingId(null);
  };

  const handleConfirmReject = async (payment: any) => {
    const reason = rejectReason.trim();
    setProcessingId(payment.id);
    await supabase.from('payments').update({
      status: 'rejected', rejection_reason: reason, review_note: reason,
      reviewed_at: new Date().toISOString(), reviewed_by: session?.email,
    } as any).eq('id', payment.id);
    // Void the user's ticket and disable their code so the QR no longer admits
    await supabase.from('users').update({ ticket_state: 'rejected' } as any).eq('id', payment.user_id);
    if (payment.users?.codes?.code) {
      await supabase.from('codes').update({ status: 'disabled' }).eq('code', payment.users.codes.code);
    }
    // Fire rejection email (best effort)
    if (payment.users?.email) {
      supabase.functions.invoke('send-ticket-rejected', {
        body: { userId: payment.user_id, recipientEmail: payment.users.email, code: payment.users?.codes?.code, reason: reason || 'Payment could not be verified.' },
      }).catch(() => {});
    }
    toast.success("Payment rejected");
    await logAgentAction('payment_rejected', `Rejected payment ${payment.amount.toLocaleString()} RWF — ${reason || 'no reason'}`, { type: 'payment', id: payment.id });
    setRejectingId(null);
    setRejectReason("");
    loadPayments();
    setProcessingId(null);
  };

  const lookupCashUser = async () => {
    const digits = cashCode.replace(/\D/g, '');
    if (!digits) { toast.error("Enter the code digits"); return; }
    const code = 'SG-' + digits;
    const { data: codeRow } = await supabase.from('codes').select('*, users(*), schools(name)').eq('code', code).maybeSingle();
    if (!codeRow?.users) { toast.error("User not found for this code"); return; }
    setCashUser({ ...codeRow.users, _school: codeRow.schools?.name });
    setCashAmount(String(codeRow.users.remaining_amount || 25000));
  };

  const recordCash = async () => {
    if (!cashUser || !cashAmount) return;
    const amt = Number(cashAmount);
    if (amt < 1 || amt > cashUser.remaining_amount) { toast.error(`Amount must be between 1 and ${cashUser.remaining_amount}`); return; }
    setCashLoading(true);
    toast.loading("Recording cash payment...");
    try {
      const { data: payment } = await supabase.from('payments').insert({
        user_id: cashUser.id, amount: amt, method: 'cash', status: 'approved', momo_name: 'Cash', reviewed_by: session?.email, reviewed_at: new Date().toISOString()
      }).select().single();

      await supabase.from('transactions').insert({ user_id: cashUser.id, payment_id: payment.id, amount: amt, method: 'cash', recorded_by: session?.email });
      
      const newPaid = cashUser.paid_amount + amt;
      const newRemaining = cashUser.ticket_price - newPaid;
      await supabase.from('users').update({ paid_amount: newPaid, remaining_amount: Math.max(0, newRemaining), payment_status: newRemaining <= 0 ? 'paid' : 'partial' }).eq('id', cashUser.id);

      toast.dismiss();
      toast.success(`Cash payment of ${amt.toLocaleString()} RWF recorded`);
      await logAgentAction('cash_recorded', `Recorded ${amt.toLocaleString()} RWF cash for ${cashUser.first_name} ${cashUser.last_name}`, { type: 'user', id: cashUser.id });
      setShowCashModal(false);
      setCashCode(""); setCashUser(null); setCashAmount(""); setCashNotes("");
      loadPayments();
    } catch {
      toast.dismiss();
      toast.error("Failed to record");
    }
    setCashLoading(false);
  };

  const filtered = payments.filter(p => !filter || p.status === filter);

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2.5 bg-surface-2 border border-gold/20 rounded-lg text-sm text-foreground focus:outline-none focus:border-gold/60">
          <option value="">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
        </select>
        <button onClick={() => setShowCashModal(true)} className="px-4 py-2 text-sm bg-gold text-background rounded-lg hover:bg-gold-light transition-colors flex items-center gap-2">
          <Plus size={14} /> Record Cash Payment
        </button>
      </div>

      {showCashModal && (
        <div className="fixed inset-0 bg-background/60 z-50 flex items-center justify-center p-4" onClick={() => setShowCashModal(false)}>
          <div className="gold-card rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl text-gold-gradient mb-4">Record Cash Payment</h3>
            {!cashUser ? (
              <div className="space-y-4">
                <label className="text-sm text-muted-foreground block">Enter registration code</label>
                <div className="flex">
                  <span className="px-3 py-3 bg-gold/10 text-gold font-mono text-sm rounded-l-lg border border-r-0 border-gold/20">SG-</span>
                  <input placeholder="Code suffix" value={cashCode} onChange={(e) => setCashCode(e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-3 bg-surface-2 border border-gold/20 rounded-r-lg text-foreground font-mono focus:outline-none focus:border-gold/60" />
                </div>
                <button onClick={lookupCashUser} className="w-full py-2 bg-gold text-background rounded-lg hover:bg-gold-light">Find User</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-surface-2 rounded-lg p-3">
                  <p className="text-foreground font-semibold">{cashUser.first_name} {cashUser.last_name}</p>
                  <p className="text-xs text-muted-foreground">{cashUser._school || cashUser.school_name || cashUser.department} · {cashUser.level || ''}</p>
                  <p className="text-xs text-gold mt-1">Remaining: {cashUser.remaining_amount.toLocaleString()} RWF · Phone: {cashUser.phone}</p>
                </div>
                <input type="number" placeholder="Amount (RWF)" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground focus:outline-none focus:border-gold/60" />
                <input placeholder="Notes (optional)" value={cashNotes} onChange={(e) => setCashNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground focus:outline-none focus:border-gold/60" />
                <div className="flex gap-3">
                  <button onClick={() => setCashUser(null)} className="flex-1 py-2 border border-gold/20 text-foreground rounded-lg">Back</button>
                  <button onClick={recordCash} disabled={cashLoading} className="flex-1 py-2 bg-gold text-background rounded-lg hover:bg-gold-light flex items-center justify-center gap-2">
                    {cashLoading ? <Loader2 size={14} className="animate-spin" /> : null} Record
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {screenshotUrl && (
        <div className="fixed inset-0 bg-background/80 z-50 flex items-center justify-center p-4" onClick={() => setScreenshotUrl(null)}>
          <div className="max-w-2xl max-h-[80vh]"><img src={screenshotUrl} alt="Screenshot" className="rounded-lg max-h-[80vh] object-contain" /></div>
        </div>
      )}

      {confirmingPayment && (
        <div className="fixed inset-0 bg-background/70 z-50 flex items-center justify-center p-4" onClick={() => setConfirmingPayment(null)}>
          <div className="gold-card rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl text-gold-gradient mb-1">Confirm payment approval</h3>
            <p className="text-xs text-muted-foreground mb-4">Verify the details match the MoMo notification before approving.</p>

            <div className="space-y-3 mb-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-2 rounded-lg p-3">
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">Registrant</p>
                  <p className="text-foreground font-semibold">{confirmingPayment.users?.first_name} {confirmingPayment.users?.last_name}</p>
                  <p className="font-mono text-gold text-xs">{confirmingPayment.users?.codes?.code || '-'}</p>
                </div>
                <div className="bg-surface-2 rounded-lg p-3">
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">Amount claimed</p>
                  <p className="text-gold font-bold text-lg">{confirmingPayment.amount.toLocaleString()} RWF</p>
                  <p className="text-xs text-muted-foreground capitalize">via {confirmingPayment.method}</p>
                </div>
              </div>
              <div className="bg-gold/10 border border-gold/30 rounded-lg p-3">
                <p className="text-[10px] uppercase text-gold mb-1">Name on MoMo (from registrant)</p>
                <p className="text-foreground font-semibold">{confirmingPayment.momo_name || <span className="text-muted-foreground italic">Not provided</span>}</p>
              </div>
              {confirmingPayment.transaction_id && (
                <div className="bg-surface-2 rounded-lg p-3">
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">Transaction reference</p>
                  <p className="font-mono text-foreground text-xs break-all">{confirmingPayment.transaction_id}</p>
                </div>
              )}
              {confirmingPayment.momo_number_used && (
                <div className="bg-surface-2 rounded-lg p-3">
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">MoMo method used</p>
                  <p className="font-mono text-foreground text-xs break-all">{confirmingPayment.momo_number_used}</p>
                </div>
              )}
              {confirmingPayment.screenshot_url ? (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">Payment screenshot</p>
                  <a href={confirmingPayment.screenshot_url} target="_blank" rel="noopener noreferrer">
                    <img src={confirmingPayment.screenshot_url} alt="Payment proof" className="w-full max-h-64 object-contain rounded-lg border border-gold/20 bg-black/40" />
                  </a>
                  <p className="text-[10px] text-muted-foreground mt-1">Click to open full size.</p>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-400">
                  ⚠ No screenshot provided. Match the name on MoMo and amount to the notification before approving.
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setConfirmingPayment(null)} className="flex-1 py-2 border border-gold/20 text-foreground rounded-lg hover:bg-surface-2">Cancel</button>
              <button onClick={() => handleApprove(confirmingPayment)} disabled={processingId === confirmingPayment.id}
                className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                {processingId === confirmingPayment.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirm Approve
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
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4 hidden md:table-cell">Code</th>
                <th className="text-right p-4">Amount</th>
                <th className="text-left p-4 hidden lg:table-cell">Method</th>
                <th className="text-left p-4 hidden lg:table-cell">Name on MoMo</th>
                <th className="text-left p-4 hidden lg:table-cell">TXN ID</th>
                <th className="text-left p-4 hidden lg:table-cell">Screenshot</th>
                <th className="text-left p-4 hidden md:table-cell">Date</th>
                <th className="text-center p-4">Status</th>
                <th className="text-center p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">No payments found</td></tr>}
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-gold/5 hover:bg-surface transition-colors">
                  <td className="p-4 text-foreground">{p.users?.first_name} {p.users?.last_name}</td>
                  <td className="p-4 font-mono text-gold text-xs hidden md:table-cell">{p.users?.codes?.code || '-'}</td>
                  <td className="p-4 text-right text-gold">{p.amount.toLocaleString()} RWF</td>
                  <td className="p-4 text-muted-foreground hidden lg:table-cell capitalize">{p.method}</td>
                  <td className="p-4 text-foreground/80 hidden lg:table-cell text-xs">{p.momo_name || '-'}</td>
                  <td className="p-4 font-mono text-xs text-muted-foreground hidden lg:table-cell">{p.transaction_id || '-'}</td>
                  <td className="p-4 hidden lg:table-cell">
                    {p.screenshot_url ? (
                      <button onClick={() => setScreenshotUrl(p.screenshot_url)} className="text-gold hover:text-gold-light flex items-center gap-1 text-xs"><Eye size={12} /> View</button>
                    ) : '-'}
                  </td>
                  <td className="p-4 text-muted-foreground text-xs hidden md:table-cell">{formatDate(p.submitted_at)}</td>
                  <td className="p-4 text-center"><span className={`text-xs px-2 py-1 rounded-full capitalize ${statusColors[p.status]}`}>{p.status}</span></td>
                  <td className="p-4 text-center">
                    {p.status === "pending" && (
                      rejectingId === p.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <input autoFocus value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason (optional)"
                            className="px-2 py-1.5 bg-surface-2 border border-destructive/40 rounded text-xs text-foreground focus:outline-none focus:border-destructive w-40" />
                          <button onClick={() => handleConfirmReject(p)} disabled={processingId === p.id}
                            className="px-2 py-1.5 rounded bg-destructive text-white text-xs hover:bg-destructive/80 disabled:opacity-50">
                            {processingId === p.id ? <Loader2 size={12} className="animate-spin" /> : 'Confirm'}
                          </button>
                          <button onClick={() => { setRejectingId(null); setRejectReason(""); }}
                            className="px-2 py-1.5 rounded border border-gold/20 text-xs text-muted-foreground hover:text-foreground">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setConfirmingPayment(p)} disabled={processingId === p.id} className="p-1.5 rounded bg-green-900/30 text-green-400 hover:bg-green-900/50 transition-colors disabled:opacity-50" title="Review & approve">
                            {processingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                          <button onClick={() => { setRejectingId(p.id); setRejectReason(""); }} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors" title="Reject"><X size={14} /></button>
                        </div>
                      )
                    )}
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

export default AdminPayments;
