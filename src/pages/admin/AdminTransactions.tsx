import { confirmDialog } from "@/lib/confirmDialog";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Download, Trash2, Loader2, Pencil, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatDateTimeSec } from "@/lib/format";
import { getAdminSession } from "@/lib/auth";
import { toast } from "sonner";
import { exportCsv, exportPdfReport } from "@/lib/reports";

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [editingTx, setEditingTx] = useState<any>(null);
  const [editAmount, setEditAmount] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const session = getAdminSession();
  const isAdmin = session?.role === 'superadmin';

  useEffect(() => { loadTransactions(); }, []);

  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, users!transactions_user_id_fkey(first_name, last_name, paid_amount, remaining_amount, ticket_price, payment_status, codes!users_code_id_fkey(code))')
      .order('created_at', { ascending: false });
    if (error) { console.error('loadTransactions', error); toast.error('Failed to load transactions'); }
    setTransactions(data || []);
    setLoading(false);
  };

  const filtered = transactions.filter(t => {
    const s = search.toLowerCase();
    const name = `${t.users.first_name} ${t.users.last_name}`.toLowerCase();
    const matchesSearch = !s || name.includes(s) || (t.users.codes?.code || '').toLowerCase().includes(s);
    const matchesMethod = !methodFilter || t.method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const handleDeleteTransaction = async (tx: any) => {
    const ok = await confirmDialog({
      title: 'Delete transaction?',
      description: `Delete this ${tx.method} transaction of ${tx.amount.toLocaleString()} RWF? This cannot be undone.`,
      confirmText: 'Delete', destructive: true,
    });
    if (!ok) return;
    setProcessingId(tx.id);
    toast.loading("Deleting...");
    try {
      // Delete the transaction
      await supabase.from('transactions').delete().eq('id', tx.id);
      // If there's a linked payment, delete it too
      if (tx.payment_id) {
        await supabase.from('payments').delete().eq('id', tx.payment_id);
      }
      // Recalculate user balance
      const newPaid = Math.max(0, tx.users.paid_amount - tx.amount);
      const newRemaining = tx.users.ticket_price - newPaid;
      const newStatus = newPaid <= 0 ? 'unpaid' : newRemaining <= 0 ? 'paid' : 'partial';
      await supabase.from('users').update({ paid_amount: newPaid, remaining_amount: Math.max(0, newRemaining), payment_status: newStatus }).eq('id', tx.user_id);
      toast.dismiss();
      toast.success("Transaction deleted, balance updated.");
      loadTransactions();
    } catch {
      toast.dismiss();
      toast.error("Failed to delete transaction.");
    }
    setProcessingId(null);
  };

  const handleEditTransaction = async () => {
    if (!editingTx) return;
    const newAmount = Number(editAmount);
    if (!newAmount || newAmount < 1) { toast.error("Enter a valid amount"); return; }
    setProcessingId(editingTx.id);
    toast.loading("Updating...");
    try {
      const diff = newAmount - editingTx.amount;
      await supabase.from('transactions').update({ amount: newAmount }).eq('id', editingTx.id);
      if (editingTx.payment_id) {
        await supabase.from('payments').update({ amount: newAmount }).eq('id', editingTx.payment_id);
      }
      const newPaid = editingTx.users.paid_amount + diff;
      const newRemaining = editingTx.users.ticket_price - newPaid;
      const newStatus = newPaid <= 0 ? 'unpaid' : newRemaining <= 0 ? 'paid' : 'partial';
      await supabase.from('users').update({ paid_amount: Math.max(0, newPaid), remaining_amount: Math.max(0, newRemaining), payment_status: newStatus }).eq('id', editingTx.user_id);
      toast.dismiss();
      toast.success("Transaction updated.");
      setEditingTx(null);
      loadTransactions();
    } catch {
      toast.dismiss();
      toast.error("Failed to update.");
    }
    setProcessingId(null);
  };

  const buildRows = () => {
    const headers = ['#', 'Date', 'Name', 'Code', 'Amount (RWF)', 'Method', 'Recorded By'];
    const rows = filtered.map((t, i) => [
      i + 1, formatDateTimeSec(t.created_at),
      `${t.users.first_name} ${t.users.last_name}`,
      t.users.codes?.code || '-',
      (t.amount || 0).toLocaleString(), t.method, t.recorded_by || '-',
    ]);
    if (rows.length) {
      const total = filtered.reduce((s, t) => s + (t.amount || 0), 0);
      rows.push(['', '', 'TOTAL', '', total.toLocaleString(), '', '']);
    }
    return { headers, rows };
  };
  const exportCSV = () => {
    const { headers, rows } = buildRows();
    exportCsv(`Senior-Gala-Transactions-${Date.now()}.csv`, headers, rows);
    toast.success("Exported CSV");
  };
  const exportPDF = async () => {
    const { headers, rows } = buildRows();
    await exportPdfReport({
      title: 'Transactions Ledger',
      subtitle: `${rows.length} entries`,
      headers, rows,
      filename: `Senior-Gala-Transactions-${Date.now()}.pdf`,
    });
    toast.success("Exported PDF");
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search by name or code..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-surface-2 border border-gold/20 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60 transition-colors" />
          </div>
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="px-3 py-2.5 bg-surface-2 border border-gold/20 rounded-lg text-sm text-foreground focus:outline-none focus:border-gold/60">
            <option value="">All Methods</option>
            <option value="momo">MoMo</option>
            <option value="cash">Cash</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-4 py-2 text-sm bg-surface-2 text-foreground border border-gold/20 rounded-lg hover:border-gold/40 transition-colors flex items-center gap-2">
            <Download size={14} /> CSV
          </button>
          <button onClick={exportPDF} className="px-4 py-2 text-sm bg-gold/10 text-gold border border-gold/30 rounded-lg hover:bg-gold/20 transition-colors flex items-center gap-2">
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {editingTx && (
        <div className="fixed inset-0 bg-background/60 z-50 flex items-center justify-center p-4" onClick={() => setEditingTx(null)}>
          <div className="gold-card rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl text-gold-gradient mb-4">Edit Transaction Amount</h3>
            <p className="text-sm text-muted-foreground mb-2">Current: {editingTx.amount.toLocaleString()} RWF</p>
            <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="New amount (RWF)"
              className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground focus:outline-none focus:border-gold/60 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setEditingTx(null)} className="flex-1 py-2 border border-gold/20 text-foreground rounded-lg hover:bg-surface-2">Cancel</button>
              <button onClick={handleEditTransaction} disabled={processingId === editingTx.id} className="flex-1 py-2 bg-gold text-background rounded-lg hover:bg-gold-light flex items-center justify-center gap-2 disabled:opacity-50">
                {processingId === editingTx.id ? <Loader2 size={14} className="animate-spin" /> : null} Save
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
                <th className="text-left p-4">#</th>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4 hidden md:table-cell">Code</th>
                <th className="text-right p-4">Amount</th>
                <th className="text-left p-4 hidden lg:table-cell">Method</th>
                <th className="text-left p-4 hidden lg:table-cell">Recorded By</th>
                <th className="text-left p-4 hidden md:table-cell">Date</th>
                {isAdmin && <th className="text-center p-4">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No transactions yet</td></tr>}
              {filtered.map((t, i) => (
                <tr key={t.id} className="border-b border-gold/5 hover:bg-surface transition-colors">
                  <td className="p-4 text-muted-foreground">{i + 1}</td>
                  <td className="p-4 text-foreground">{t.users.first_name} {t.users.last_name}</td>
                  <td className="p-4 font-mono text-gold text-xs hidden md:table-cell">{t.users.codes?.code || '-'}</td>
                  <td className="p-4 text-right text-gold">{t.amount.toLocaleString()} RWF</td>
                  <td className="p-4 hidden lg:table-cell">
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${t.method === 'cash' ? 'bg-gold/10 text-gold' : 'text-muted-foreground'}`}>
                      {t.method}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground hidden lg:table-cell">{t.recorded_by || '-'}</td>
                  <td className="p-4 text-muted-foreground text-xs hidden md:table-cell">{formatDate(t.created_at)}</td>
                  {isAdmin && (
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => { setEditingTx(t); setEditAmount(String(t.amount)); }} className="p-1.5 rounded bg-gold/10 text-gold hover:bg-gold/20 transition-colors" title="Edit amount">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDeleteTransaction(t)} disabled={processingId === t.id} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors" title="Delete">
                          {processingId === t.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTransactions;
