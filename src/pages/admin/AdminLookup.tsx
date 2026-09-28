import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Loader2, Copy, Printer, X, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, formatDateTimeSec } from "@/lib/format";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const AdminLookup = () => {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    setSearched(true);
    const like = `%${term}%`;
    // Try users first by name / email / phone
    const { data: byUser } = await supabase
      .from('users')
      .select('*, codes(code, code_type, fee_amount), schools(name), ticket_tiers(name, price)')
      .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .order('registered_at', { ascending: false })
      .limit(50);
    let combined: any[] = byUser || [];
    // Also try by code directly
    const { data: byCode } = await supabase
      .from('codes')
      .select('id, code')
      .ilike('code', like)
      .limit(50);
    if (byCode && byCode.length) {
      const ids = byCode.map(c => c.id);
      const { data: usersByCode } = await supabase
        .from('users')
        .select('*, codes(code, code_type, fee_amount), schools(name), ticket_tiers(name, price)')
        .in('code_id', ids);
      if (usersByCode) {
        const seen = new Set(combined.map((u: any) => u.id));
        usersByCode.forEach((u: any) => { if (!seen.has(u.id)) combined.push(u); });
      }
    }
    setResults(combined);
    setLoading(false);
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    toast.success("Copied");
  };

  const printDetails = (u: any) => {
    const code = u.codes?.code || '—';
    const w = window.open('', '_blank', 'width=720,height=900');
    if (!w) { toast.error('Pop-up blocked'); return; }
    const row = (k: string, v: string) => `<tr><td style="padding:6px 12px;color:#888;text-transform:uppercase;font-size:11px;letter-spacing:0.5px">${k}</td><td style="padding:6px 12px;color:#111;font-weight:600">${v}</td></tr>`;
    w.document.write(`<!doctype html><html><head><title>${u.first_name} ${u.last_name} — ${code}</title>
      <style>body{font-family:system-ui,Arial,sans-serif;padding:32px;color:#111}h1{font-size:22px;margin:0 0 4px}h2{font-size:14px;color:#666;margin:0 0 24px;font-weight:400}table{border-collapse:collapse;width:100%;border:1px solid #eee;border-radius:8px;overflow:hidden}tr:nth-child(odd){background:#fafafa}.code{font-family:ui-monospace,Menlo,monospace;font-size:18px;color:#8a6d2c}.footer{margin-top:24px;color:#999;font-size:11px}</style>
      </head><body>
      <h1>${u.first_name} ${u.last_name}</h1>
      <h2>Senior Gala Kigali 2026 — Registrant details</h2>
      <table>
        ${row('Code', `<span class="code">${code}</span>`)}
        ${row('Email', u.email || '—')}
        ${row('Phone', u.phone || '—')}
        ${row('Gender', u.gender || '—')}
        ${row('School', u.schools?.name || u.school_name || '—')}
        ${row('Level / Section', `${u.level || '—'} ${u.section ? '· ' + u.section : ''}`)}
        ${row('Department', u.department || '—')}
        ${row('Tier', u.ticket_tiers?.name || '—')}
        ${row('Ticket price', formatMoney(u.ticket_price || 0))}
        ${row('Paid', formatMoney(u.paid_amount || 0))}
        ${row('Remaining', formatMoney(u.remaining_amount || 0))}
        ${row('Payment status', (u.payment_status || '—').toUpperCase())}
        ${row('Ticket state', (u.ticket_state || '—').toUpperCase())}
        ${row('Entered', u.entered ? 'Yes · ' + (u.entered_at ? formatDateTimeSec(u.entered_at) : '') : 'No')}
        ${row('Exited', u.exited ? 'Yes · ' + (u.exited_at ? formatDateTimeSec(u.exited_at) : '') : 'No')}
        ${row('Registered', u.registered_at ? formatDateTimeSec(u.registered_at) : '—')}
      </table>
      <p class="footer">Printed from /admin/lookup · ${formatDateTimeSec(new Date().toISOString())}</p>
      <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="font-display text-2xl text-gold mb-1">Lookup</h2>
          <p className="text-sm text-muted-foreground font-body">Search by name, email, phone, or code to instantly view a registrant.</p>
        </div>

        <form onSubmit={search} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. Jean, +250 78..., SG-..."
              className="w-full bg-surface border border-gold/15 rounded-lg pl-10 pr-3 py-2.5 text-sm font-body focus:outline-none focus:border-gold/40"
            />
          </div>
          <button type="submit" disabled={loading || !q.trim()}
            className="px-5 bg-gold text-background font-body font-semibold rounded-lg text-sm hover:bg-gold-light transition-all disabled:opacity-50 inline-flex items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Search
          </button>
        </form>

        {searched && !loading && results.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground font-body border border-gold/10 rounded-lg bg-surface/30">
            No matches found.
          </div>
        )}

        <div className="space-y-3">
          {results.map((u) => (
            <button
              type="button"
              key={u.id}
              onClick={() => setSelected(u)}
              className="w-full text-left bg-surface border border-gold/10 hover:border-gold/40 rounded-lg p-4 font-body transition-all flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-display text-base text-foreground truncate">{u.first_name} {u.last_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {u.schools?.name || u.school_name || '—'} · {u.phone || '—'} · {u.email || '—'}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="font-mono text-gold text-sm font-bold">{u.codes?.code || '—'}</span>
                <span className={`text-[10px] px-2 py-1 rounded ${u.payment_status === 'paid' ? 'bg-green-900/30 text-green-400' : 'bg-destructive/10 text-destructive'} uppercase tracking-wider`}>
                  {u.payment_status}
                </span>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelected(null)}>
            <div className="bg-surface border border-gold/30 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3 p-5 border-b border-gold/10">
                <div>
                  <h3 className="font-display text-2xl text-gold">{selected.first_name} {selected.last_name}</h3>
                  <p className="text-xs text-muted-foreground font-body">{selected.schools?.name || selected.school_name || '—'}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground p-1"><X size={18} /></button>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4 text-xs font-body">
                {[
                  ['Code', selected.codes?.code || '—', true],
                  ['Phone', selected.phone || '—'],
                  ['Email', selected.email || '—'],
                  ['Gender', selected.gender || '—'],
                  ['Level / Section', `${selected.level || '—'} ${selected.section ? '· ' + selected.section : ''}`],
                  ['Department', selected.department || '—'],
                  ['Tier', selected.ticket_tiers?.name || '—'],
                  ['Ticket price', formatMoney(selected.ticket_price || 0)],
                  ['Paid', formatMoney(selected.paid_amount || 0)],
                  ['Remaining', formatMoney(selected.remaining_amount || 0)],
                  ['Payment status', (selected.payment_status || '—').toUpperCase()],
                  ['Ticket state', (selected.ticket_state || '—').toUpperCase()],
                  ['Entered', selected.entered ? `Yes · ${selected.entered_at ? formatDateTimeSec(selected.entered_at) : ''}` : 'No'],
                  ['Exited', selected.exited ? `Yes · ${selected.exited_at ? formatDateTimeSec(selected.exited_at) : ''}` : 'No'],
                  ['Registered', selected.registered_at ? formatDateTimeSec(selected.registered_at) : '—'],
                ].map(([k, v, isCode]: any) => (
                  <div key={k}>
                    <p className="text-muted-foreground uppercase tracking-wider mb-0.5">{k}</p>
                    {isCode ? (
                      <button onClick={() => copy(v)} className="font-mono text-gold font-bold inline-flex items-center gap-1 hover:underline">
                        {v} <Copy size={11} />
                      </button>
                    ) : (
                      <p className="text-foreground break-words">{v}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="p-5 border-t border-gold/10 flex flex-wrap gap-2 justify-end">
                {selected.codes?.code && (
                  <Link to={`/ticket/${selected.codes.code}`} target="_blank"
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 inline-flex items-center gap-2">
                    <ExternalLink size={13} /> Open ticket
                  </Link>
                )}
                <button onClick={() => printDetails(selected)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-gold text-background hover:bg-gold-light inline-flex items-center gap-2">
                  <Printer size={13} /> Print details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminLookup;