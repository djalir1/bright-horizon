import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Download, Loader2, CheckCircle, Clock } from "lucide-react";
import PublicLayout from "@/components/public/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { generateETicket } from "@/lib/pdf";
import { signQrToken } from "@/lib/qrToken";
import QRCode from "qrcode";
import { toast } from "sonner";
import confetti from "canvas-confetti";

const TicketPage = () => {
  const [codeSuffix, setCodeSuffix] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketReady, setTicketReady] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const handleCheck = async () => {
    const suffix = codeSuffix.trim();
    if (!suffix) { setError("Enter your code."); return; }
    if (!/^\d{3,4}$/.test(suffix)) { setError("Code number must be 3 or 4 digits."); return; }
    const fullCode = "SG-" + suffix;
    setLoading(true);
    setError("");
    try {
      const { data: code } = await supabase
        .from('codes')
        .select('id, code, code_type, school_id, used_by_user_id, schools(name), users:users!fk_codes_used_by(*)')
        .eq('code', fullCode)
        .maybeSingle();
      const u = Array.isArray(code?.users) ? code?.users?.[0] : (code as any)?.users;
      if (!code || !u) { setError("Code not found or not registered yet."); setLoading(false); return; }
      const schoolName = u.school_name || (code as any)?.schools?.name || '';
      let tier: any = null;
      if (u.tier_id) {
        const { data: t } = await supabase.from('ticket_tiers').select('name, price').eq('id', u.tier_id).maybeSingle();
        tier = t;
      }
      setProfile({ ...u, code: code.code, code_type: (code as any).code_type, school_name: schoolName, tier });

      const { data: settingsData } = await supabase.from('settings').select('*');
      const map: Record<string, string> = {};
      (settingsData || []).forEach(r => { map[r.key] = r.value; });
      setSettings(map);
      setFound(true);
      // Build signed QR for on-screen display (only meaningful once paid)
      try {
        const token = await signQrToken(code.code, u.id);
        // High-contrast QR (black on white) — scanners read it reliably.
        const dataUrl = await QRCode.toDataURL(token, {
          width: 600, margin: 2, errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#FFFFFF' },
        });
        setQrDataUrl(dataUrl);
      } catch (e) { console.warn('QR build failed', e); }
      if (u.payment_status === 'paid') {
        setTimeout(() => {
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 },
            colors: ['#C9A84C', '#E8D5A3', '#34D399', '#F5F0E8'] });
        }, 250);
      }
    } catch {
      setError("Failed to look up ticket.");
    }
    setLoading(false);
  };

  const handleDownloadTicket = async () => {
    if (profile?.ticket_printed) {
      toast.error("Your ticket has already been issued.");
      return;
    }
    setTicketLoading(true);
    toast.loading("Preparing your ticket...");
    try {
      await new Promise(r => setTimeout(r, 800));
      await generateETicket({
        name: `${profile.first_name} ${profile.last_name}`,
        department: profile.school_name || profile.department,
        code: profile.code,
        userId: profile.id,
        eventName: settings.event_name || 'Senior Gala Night',
        eventDate: settings.event_date || 'TBD',
        venue: settings.venue_confirmed === 'true' ? (settings.venue_name || 'TBA') : 'To Be Announced',
        ticketType: profile.tier?.name,
        tierPrice: profile.tier?.price,
        paidAmount: profile.paid_amount,
        codeType: profile.code_type === 'general' ? 'general' : 'student',
        qrVersion: profile.qr_version || 1,
      });
      // Mark printed (one-time rule)
      const nowIso = new Date().toISOString();
      await supabase.from('users').update({ ticket_printed: true, ticket_printed_at: nowIso }).eq('id', profile.id);
      await supabase.from('ticket_print_logs').insert({
        user_id: profile.id, print_type: 'original', is_admin_reprint: false,
      });
      setProfile({ ...profile, ticket_printed: true, ticket_printed_at: nowIso });
      toast.dismiss();
      toast.success("Ticket downloaded!");
      setTicketReady(true);
    } catch {
      toast.dismiss();
      toast.error("Failed to generate ticket");
    }
    setTicketLoading(false);
  };

  return (
    <PublicLayout>
      <div className="min-h-screen flex items-center justify-center pt-24 pb-16 px-4">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {!found ? (
              <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="gold-card rounded-xl p-8 text-center">
                <h1 className="font-display text-3xl font-semibold text-gold-gradient mb-2">Download Your Ticket</h1>
                <p className="text-sm text-muted-foreground font-body mb-8">
                  Enter your registration code — the system will find you automatically
                </p>
                <div className="space-y-4">
                  <div className="flex">
                    <span className="px-4 py-3 bg-gold/10 text-gold font-mono text-lg rounded-l-lg border border-r-0 border-gold/20 flex items-center min-w-[70px] justify-center">SG-</span>
                    <input type="number" placeholder="e.g. 4821" value={codeSuffix}
                      onChange={(e) => setCodeSuffix(e.target.value.slice(0, 4))}
                      onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                      className="flex-1 px-4 py-3 bg-surface-2 border border-gold/20 rounded-r-lg text-foreground font-mono text-lg placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  </div>
                </div>
                {error && <p className="text-sm text-destructive font-body mt-4">{error}</p>}
                <button onClick={handleCheck} disabled={loading}
                  className="w-full mt-4 py-3 bg-gold text-background font-body font-semibold rounded-lg hover:bg-gold-light transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <><Search size={16} /> Find My Ticket</>}
                </button>
              </motion.div>
            ) : (
              <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="gold-card rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-display text-2xl text-foreground">{profile.first_name} {profile.last_name}</h2>
                      <p className="text-sm text-muted-foreground font-body">{profile.school_name || profile.department} · {profile.code}</p>
                    </div>
                  </div>

                  {settings.tickets_enabled !== 'true' ? (
                    <div className="bg-gold/5 border border-gold/30 rounded-lg p-4">
                      <p className="text-gold font-semibold font-body mb-1">🎟️ Ticket downloads are not available yet</p>
                      <p className="text-xs text-foreground/80 font-body leading-relaxed">
                        We are finalising the event details. You will be notified by email and WhatsApp as soon as tickets are ready.
                      </p>
                      <p className="text-xs text-foreground/80 font-body mt-2">
                        Your code: <span className="font-mono text-gold font-bold">{profile.code}</span> — keep it safe.
                      </p>
                    </div>
                  ) : (profile.ticket_state === 'confirmed' || profile.payment_status === 'paid') ? (
                    <>
                      <div className="bg-green-900/10 border border-green-500/30 rounded-lg p-4 mb-4 flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                        <div>
                          <p className="text-green-400 font-semibold font-body">Payment Confirmed</p>
                          <p className="text-xs text-muted-foreground">Your ticket is ready to download.</p>
                        </div>
                      </div>
                      {profile.ticket_printed ? (
                        <div className="w-full p-4 bg-surface-2 border border-gold/20 rounded-lg text-sm font-body text-foreground/80 leading-relaxed">
                          <p className="text-gold font-semibold mb-1">Your ticket has been issued.</p>
                          <p>If you need a backup, contact the organizers at <a href="mailto:sadcorporation1@gmail.com" className="text-gold hover:underline">sadcorporation1@gmail.com</a> or <a href="tel:+250786324622" className="text-gold hover:underline">+250 786 324 622</a>.</p>
                        </div>
                      ) : (
                        <button onClick={handleDownloadTicket} disabled={ticketLoading}
                          className="w-full py-3 bg-gold text-background font-body font-semibold rounded-lg hover:bg-gold-light transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                          {ticketLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                          {ticketLoading ? "Preparing..." : "Download E-Ticket"}
                        </button>
                      )}
                      {qrDataUrl && (
                        <div className="mt-5 p-4 bg-surface-2 border border-gold/20 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground mb-2 font-body">Show this at the entrance gate</p>
                          <img src={qrDataUrl} alt="Ticket QR code" className="mx-auto rounded bg-white p-2" style={{ width: 260, height: 260, imageRendering: 'pixelated' }} />
                          <p className="text-xs font-mono text-gold mt-2">{profile.code}</p>
                        </div>
                      )}
                      <p className="mt-4 text-[11px] text-muted-foreground font-body leading-relaxed">
                        Tickets are non-refundable unless the event is cancelled. If cancelled, you are refunded in full minus mobile money fees.{' '}
                        <a href="/refund-policy" className="text-gold hover:underline">See full refund policy</a>.
                      </p>
                    </>
                  ) : (profile as any).ticket_state === 'rejected' ? (
                    <div className="bg-destructive/10 border border-destructive/40 rounded-lg p-4">
                      <p className="text-destructive font-semibold font-body mb-1">Payment Rejected</p>
                      <p className="text-xs text-foreground/80 font-body leading-relaxed">
                        Your payment could not be verified and this ticket has been voided. Please contact{" "}
                        <a href="mailto:sadcorporation1@gmail.com" className="text-gold hover:underline">sadcorporation1@gmail.com</a> or{" "}
                        <a href="tel:+250786324622" className="text-gold hover:underline">+250 786 324 622</a> to resolve.
                      </p>
                    </div>
                  ) : (profile as any).ticket_state === 'pending' || profile.payment_status === 'pending' ? (
                    <>
                      <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-5 h-5 text-amber-400" />
                          <p className="text-amber-400 font-semibold font-body">Pending Confirmation</p>
                        </div>
                        <p className="text-xs text-foreground/80 font-body leading-relaxed">
                          Your payment has been received and your ticket has been issued. Our team will verify your payment shortly — you can wait for the confirmation email, or keep this code and QR (it's already saved to your account).
                        </p>
                        <p className="text-xs text-foreground/70 font-body mt-2">
                          For help: <a href="mailto:sadcorporation1@gmail.com" className="text-gold hover:underline">sadcorporation1@gmail.com</a> · <a href="tel:+250786324622" className="text-gold hover:underline">+250 786 324 622</a>
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="bg-gold/5 border border-gold/30 rounded-lg p-4 flex items-start gap-3">
                      <Clock className="w-6 h-6 text-gold flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-gold font-semibold font-body mb-1">Payment Required</p>
                        <p className="text-xs text-muted-foreground font-body mb-3">
                          Your ticket will unlock as soon as your ticket payment is confirmed by the team.
                        </p>
                        <a href="/pay" className="inline-flex items-center gap-2 text-xs px-3 py-1.5 bg-gold text-background rounded-lg hover:bg-gold-light font-semibold">
                          Pay Now
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={() => { setFound(false); setTicketReady(false); }}
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

export default TicketPage;
