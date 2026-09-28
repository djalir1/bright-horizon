import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Download, Loader2, CheckCircle, Clock, XCircle } from "lucide-react";
import PublicLayout from "@/components/public/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { generatePaymentConfirmationReceipt } from "@/lib/pdf";
import { toast } from "sonner";

type Outcome =
  | { kind: "approved_enabled"; payload: any }
  | { kind: "approved_disabled"; code: string }
  | { kind: "pending" }
  | { kind: "rejected"; note: string }
  | { kind: "not_found" };

const ReceiptPage = () => {
  const [codeSuffix, setCodeSuffix] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleCheck = async () => {
    setError("");
    const suffix = codeSuffix.trim();
    if (!/^\d{3,5}$/.test(suffix)) { setError("Enter 3–5 digits (e.g. 4821)."); return; }
    const fullCode = "SG-" + suffix;
    setLoading(true);
    try {
      const { data: settingsData } = await supabase.from('settings').select('key, value').in('key', ['receipts_enabled']);
      const receiptsEnabled = (settingsData || []).find(s => s.key === 'receipts_enabled')?.value === 'true';

      const { data: code } = await supabase
        .from('codes')
        .select('id, code, used_by_user_id, users:users!fk_codes_used_by(*)')
        .eq('code', fullCode)
        .maybeSingle();
      const u = Array.isArray((code as any)?.users) ? (code as any).users?.[0] : (code as any)?.users;
      if (!code || !u) { setOutcome({ kind: 'not_found' }); setLoading(false); return; }

      // Find latest payment for this user
      const { data: pay } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const status = pay?.status || 'pending';
      if (status === 'rejected') {
        setOutcome({ kind: 'rejected', note: pay?.review_note || pay?.rejection_reason || 'No reason provided.' });
      } else if (status === 'approved' || u.payment_status === 'paid' || u.ticket_state === 'confirmed') {
        if (!receiptsEnabled) {
          setOutcome({ kind: 'approved_disabled', code: fullCode });
        } else {
          let tierName: string | undefined;
          if (u.tier_id) {
            const { data: t } = await supabase.from('ticket_tiers').select('name, price').eq('id', u.tier_id).maybeSingle();
            tierName = t?.name;
          }
          setOutcome({
            kind: 'approved_enabled',
            payload: {
              paymentId: pay?.id || u.id,
              name: `${u.first_name} ${u.last_name}`,
              email: u.email,
              phone: u.phone,
              code: fullCode,
              tier: tierName,
              amount: pay?.amount || u.paid_amount || u.ticket_price || 0,
              method: pay?.method || 'momo',
              issuedAt: pay?.reviewed_at ? new Date(pay.reviewed_at) : new Date(),
            },
          });
        }
      } else {
        setOutcome({ kind: 'pending' });
      }
    } catch (e: any) {
      console.error(e);
      setError("Lookup failed. Please try again.");
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (outcome?.kind !== 'approved_enabled') return;
    setDownloading(true);
    try {
      await generatePaymentConfirmationReceipt(outcome.payload);
      toast.success("Receipt downloaded.");
    } catch (e) {
      toast.error("Failed to generate receipt.");
    }
    setDownloading(false);
  };

  const reset = () => { setOutcome(null); setCodeSuffix(""); setError(""); };

  return (
    <PublicLayout>
      <div className="min-h-screen flex items-center justify-center pt-24 pb-16 px-4">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {!outcome ? (
              <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="gold-card rounded-xl p-8 text-center">
                <h1 className="font-display text-3xl font-semibold text-gold-gradient mb-2">Payment Receipt</h1>
                <p className="text-sm text-muted-foreground font-body mb-8">
                  Enter your ticket code to download your payment confirmation.
                </p>
                <div className="flex">
                  <span className="px-4 py-3 bg-gold/10 text-gold font-mono text-lg rounded-l-lg border border-r-0 border-gold/20 flex items-center min-w-[70px] justify-center">SG-</span>
                  <input type="number" placeholder="e.g. 4821" value={codeSuffix}
                    onChange={(e) => setCodeSuffix(e.target.value.slice(0, 5))}
                    onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                    className="flex-1 px-4 py-3 bg-surface-2 border border-gold/20 rounded-r-lg text-foreground font-mono text-lg placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60" />
                </div>
                {error && <p className="text-sm text-destructive font-body mt-4">{error}</p>}
                <button onClick={handleCheck} disabled={loading}
                  className="w-full mt-4 py-3 bg-gold text-background font-body font-semibold rounded-lg hover:bg-gold-light flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <><Search size={16} /> Find My Receipt</>}
                </button>
              </motion.div>
            ) : (
              <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="gold-card rounded-xl p-6 space-y-4">
                {outcome.kind === 'approved_enabled' && (
                  <>
                    <div className="bg-green-900/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                      <div>
                        <p className="text-green-400 font-semibold font-body">Payment Confirmed</p>
                        <p className="text-xs text-muted-foreground">Your receipt is ready to download.</p>
                      </div>
                    </div>
                    <button onClick={handleDownload} disabled={downloading}
                      className="w-full py-3 bg-gold text-background font-body font-semibold rounded-lg hover:bg-gold-light flex items-center justify-center gap-2 disabled:opacity-50">
                      {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                      {downloading ? "Preparing..." : "Download Receipt"}
                    </button>
                  </>
                )}
                {outcome.kind === 'approved_disabled' && (
                  <div className="bg-green-900/10 border border-green-500/30 rounded-lg p-4">
                    <p className="text-green-400 font-semibold font-body mb-2">Your payment has been confirmed ✓</p>
                    <p className="text-sm text-foreground/80 font-body">
                      Receipts are not available yet. We will notify you by email and WhatsApp when they are ready.
                    </p>
                    <p className="text-sm text-foreground/80 font-body mt-2">
                      Keep your code safe: <span className="font-mono text-gold font-bold">{outcome.code}</span>
                    </p>
                  </div>
                )}
                {outcome.kind === 'pending' && (
                  <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-4 flex items-start gap-3">
                    <Clock className="w-6 h-6 text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-amber-400 font-semibold font-body mb-1">Pending Review</p>
                      <p className="text-xs text-foreground/80 font-body">
                        Your payment is still being reviewed. You will be notified by email once it is confirmed.
                        Once confirmed, come back here to download your receipt.
                      </p>
                    </div>
                  </div>
                )}
                {outcome.kind === 'rejected' && (
                  <div className="bg-destructive/10 border border-destructive/40 rounded-lg p-4">
                    <p className="text-destructive font-semibold font-body mb-1">Payment Not Approved</p>
                    <p className="text-xs text-foreground/80 font-body mb-2">Reason: {outcome.note}</p>
                    <p className="text-xs text-foreground/70 font-body">
                      Please contact us: <a href="mailto:sadcorporation1@gmail.com" className="text-gold hover:underline">sadcorporation1@gmail.com</a> · <a href="tel:+250780266792" className="text-gold hover:underline">+250 780 266 792</a>
                    </p>
                  </div>
                )}
                {outcome.kind === 'not_found' && (
                  <div className="bg-destructive/10 border border-destructive/40 rounded-lg p-4 flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-destructive flex-shrink-0" />
                    <p className="text-sm text-foreground/80 font-body">Code not found. Please check and try again.</p>
                  </div>
                )}
                <button onClick={reset}
                  className="text-sm text-muted-foreground hover:text-gold font-body transition-colors">
                  ← Look up another code
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PublicLayout>
  );
};

export default ReceiptPage;