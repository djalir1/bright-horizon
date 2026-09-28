import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Upload, CheckCircle, Loader2, Copy, Hash, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/public/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { sortSchoolsOtherLast } from "@/lib/format";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import TierCards, { Tier } from "@/components/public/TierCards";

type MomoMethod = { id: string; label: string; value: string; ussd?: string; name?: string; type: 'code' | 'number'; enabled: boolean };

const PayPage = () => {
  const [step, setStep] = useState(1);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [codeSuffix, setCodeSuffix] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [momoName, setMomoName] = useState("");
  const [txnId, setTxnId] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [selectedMomoId, setSelectedMomoId] = useState<string>("");
  const [proofRequired, setProofRequired] = useState(false);
  const [priorRejected, setPriorRejected] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [momoMethods, setMomoMethods] = useState<MomoMethod[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [agreedRefund, setAgreedRefund] = useState(false);

  useEffect(() => {
    supabase.from('schools').select('*').eq('status', 'active').order('name').then(({ data }) => setSchools(sortSchoolsOtherLast(data || [])));
    supabase.from('ticket_tiers').select('*').eq('is_active', true).order('sort_order').then(({ data }) => {
      setTiers((data || []).map((t: any) => ({ ...t, perks: Array.isArray(t.perks) ? t.perks : [] })) as Tier[]);
    });
    supabase.from('settings').select('*').then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach(r => { map[r.key] = r.value; });
      setSettings(map);
      try {
        const parsed = JSON.parse(map.momo_methods || '[]') as MomoMethod[];
        const enabled = Array.isArray(parsed) ? parsed.filter(m => m.enabled && m.value.trim()) : [];
        // Backward-compat: fall back to legacy momo_name_1/2 fields if no JSON methods
        if (enabled.length === 0) {
          const legacy: MomoMethod[] = [];
          [1, 2].forEach(n => {
            const num = map[`momo_number_${n}`];
            const name = map[`momo_name_${n}`];
            if (num) legacy.push({ id: `legacy-${n}`, label: name || `MoMo ${n}`, value: num, ussd: '', type: 'number', enabled: true });
          });
          setMomoMethods(legacy);
          if (legacy[0]) setSelectedMomoId(legacy[0].id);
        } else {
          setMomoMethods(enabled);
          setSelectedMomoId(enabled[0].id);
        }
      } catch {
        setMomoMethods([]);
      }
    });
  }, []);

  const prefix = selectedSchool?.prefix || 'XXX';

  const copyValue = async (val: string, label: string) => {
    try {
      await navigator.clipboard.writeText(val);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Couldn't copy — long-press to select");
    }
  };

  const fireConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#C9A84C', '#E8D5A3', '#8B6914', '#F5F0E8'],
    });
  };

  const handleFindProfile = async () => {
    const normalizedSuffix = codeSuffix.trim();
    if (!normalizedSuffix) { setError("Please enter your code."); return; }
    if (!/^\d{3,4}$/.test(normalizedSuffix)) { setError("Code number must be 3 or 4 digits."); return; }
    const fullCode = "SG-" + normalizedSuffix;
    setLoading(true);
    setError("");
    toast.loading("Finding profile...");
    try {
      const { data: code } = await supabase
        .from('codes')
        .select('id, code, school_id, used_by_user_id, users:users!fk_codes_used_by(*)')
        .eq('code', fullCode)
        .maybeSingle();
      toast.dismiss();
      const userObj = Array.isArray(code?.users) ? code?.users?.[0] : (code as any)?.users;
      if (!code || !userObj) { setError("Profile not found. Have you registered?"); setLoading(false); return; }
      if (userObj.payment_status === 'paid') {
        setAlreadyPaid(true);
        setError("");
        setLoading(false);
        setTimeout(fireConfetti, 200);
        return;
      }
      // Check if user has any rejected payment — then screenshot is required.
      const { data: rejected } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', userObj.id)
        .eq('status', 'rejected')
        .limit(1);
      const hasRejected = !!(rejected && rejected.length);
      setPriorRejected(hasRejected);
      setProofRequired(hasRejected);
      setProfile(userObj);
      toast.success("Profile found!");
      setStep(2);
    } catch {
      toast.dismiss();
      toast.error("Failed to find profile");
    }
    setLoading(false);
  };

  const handleContinue = () => {
    setError("");
    setStep(3);
  };

  const handleSubmitPayment = async () => {
    if (!momoName.trim()) { setError("Please enter the name on your MoMo account."); return; }
    if (!agreedRefund) { setError("Please agree to the refund policy before submitting."); return; }
    if (proofRequired && !proofFile) {
      setError("A payment screenshot is required because a previous payment was declined.");
      return;
    }
    setLoading(true);
    setError("");
    toast.loading("Submitting payment...");
    try {
      let publicUrl: string | null = null;
      if (proofFile) {
        const path = `${Date.now()}-${proofFile.name}`;
        const { error: uploadErr } = await supabase.storage.from('payments').upload(path, proofFile);
        if (uploadErr) throw uploadErr;
        publicUrl = supabase.storage.from('payments').getPublicUrl(path).data.publicUrl;
      }

      const selected = momoMethods.find(m => m.id === selectedMomoId);
      await supabase.from('payments').insert({
        user_id: profile.id,
        amount: payAmount,
        method: 'momo',
        momo_number_used: selected ? `${selected.label}: ${selected.value}${selected.ussd ? ` (USSD ${selected.ussd})` : ''}` : null,
        momo_name: momoName,
        transaction_id: txnId || null,
        screenshot_url: publicUrl,
      });

      toast.dismiss();
      toast.success("Payment submitted! Awaiting confirmation.");
      setTimeout(fireConfetti, 200);
      setStep(4);
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || "Submission failed");
    }
    setLoading(false);
  };

  const payAmount = profile?.ticket_price || 25000;

  return (
    <PublicLayout>
      <div className="min-h-screen flex items-center justify-center pt-24 pb-16 px-4">
        <div className={`w-full ${step === 1 ? 'max-w-5xl' : 'max-w-md'}`}>
          {step === 1 && tiers.length > 0 && (
            <div className="mb-8">
              <h2 className="font-display text-2xl text-gold-gradient text-center mb-2">Our Ticket Tiers</h2>
              <p className="text-sm text-muted-foreground font-body text-center mb-5">Your tier is locked in at registration — these are shown for reference.</p>
              <TierCards tiers={tiers} selectedId={null} onSelect={() => {}} />
            </div>
          )}
          <div className="max-w-md mx-auto">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="gold-card rounded-xl p-8">
                {alreadyPaid && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="mb-6 rounded-lg border border-green-500/40 bg-green-500/10 p-5 text-center">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                    <p className="font-display text-2xl font-semibold text-green-400 mb-1">You're already fully paid!</p>
                    <p className="text-sm text-green-300/80 font-body mb-4">Head to the ticket page to download your e-ticket.</p>
                    <Link to="/ticket" className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-background rounded-lg font-body font-semibold hover:bg-green-400 transition-colors">
                      Go to My Ticket <ArrowRight size={16} />
                    </Link>
                  </motion.div>
                )}
                <h1 className="font-display text-3xl font-semibold text-gold-gradient mb-2 text-center">Make Payment</h1>
                <p className="text-sm text-muted-foreground font-body text-center mb-8">Enter your registration code to continue</p>
                <div className="space-y-4">
                  <div className="flex">
                    <span className="px-4 py-3 bg-gold/10 text-gold font-mono text-lg rounded-l-lg border border-r-0 border-gold/20 flex items-center min-w-[70px] justify-center">SG-</span>
                    <input type="number" placeholder="e.g. 4821" value={codeSuffix}
                      onChange={(e) => setCodeSuffix(e.target.value.slice(0, 4))}
                      className="flex-1 px-4 py-3 bg-surface-2 border border-gold/20 rounded-r-lg text-foreground font-mono text-lg placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  </div>
                  <p className="text-[11px] text-muted-foreground -mt-2">Just the 4 digits — your school is on file.</p>
                </div>
                {error && <p className="text-sm text-destructive font-body text-center mt-4">{error}</p>}
                <button onClick={handleFindProfile} disabled={loading}
                  className="w-full mt-4 py-3 bg-gold text-background font-body font-semibold rounded-lg hover:bg-gold-light transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Find My Profile</span> <ArrowRight size={16} /></>}
                </button>
              </motion.div>
            )}

            {step === 2 && profile && (
              <motion.div key="s2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="gold-card rounded-xl p-8">
                <button onClick={() => setStep(1)} className="text-muted-foreground hover:text-gold mb-4 flex items-center gap-1 text-sm font-body"><ArrowLeft size={14} /> Not Me</button>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-gold flex items-center justify-center text-background font-display text-xl font-bold">
                    {profile.first_name[0]}{profile.last_name[0]}
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-foreground">{profile.first_name} {profile.last_name}</h3>
                    <p className="text-sm text-muted-foreground font-body">{profile.school_name || profile.department} · {profile.level || profile.gender}</p>
                  </div>
                </div>
                <div className="bg-surface-2 rounded-lg p-4 mb-6 space-y-2 font-body text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Ticket price (all-in)</span><span className="text-foreground">{profile.ticket_price.toLocaleString()} RWF</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-gold capitalize">{profile.payment_status}</span></div>
                </div>
                <div className="bg-gold/5 border border-gold/20 rounded-lg p-4 mb-4 text-center">
                  <p className="text-xs text-muted-foreground font-body uppercase tracking-wide">Amount to pay</p>
                  <p className="text-2xl font-display font-bold text-gold mt-1">{profile.ticket_price.toLocaleString()} RWF</p>
                </div>
                {error && <p className="text-sm text-destructive font-body mb-4">{error}</p>}
                <button onClick={handleContinue} className="w-full py-3 bg-gold text-background font-body font-semibold rounded-lg hover:bg-gold-light transition-all hover:scale-[1.02] flex items-center justify-center gap-2">
                  Continue <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="gold-card rounded-xl p-8">
                <button onClick={() => setStep(2)} className="text-muted-foreground hover:text-gold mb-4 flex items-center gap-1 text-sm font-body"><ArrowLeft size={14} /> Back</button>
                <div className="space-y-3 mb-6">
                  <h3 className="font-display text-lg text-gold mb-1">Pay using one of these options</h3>
                  <p className="text-[11px] text-muted-foreground mb-2">Tap <strong>Copy USSD</strong>, paste it in your phone dialer, and follow the prompts. No transaction fees apply.</p>
                  {momoMethods.length === 0 && (
                    <p className="text-sm text-destructive">No payment methods are configured. Contact the organizing team.</p>
                  )}
                  <div className="space-y-2">
                    {momoMethods.map((m) => {
                      const active = selectedMomoId === m.id;
                      const ussd = m.ussd && m.ussd.trim() ? m.ussd : m.value;
                      return (
                        <div key={m.id}
                          className={`p-3 rounded-lg border transition-all ${active ? 'border-gold bg-gold/10' : 'border-gold/20 bg-surface-2'}`}>
                          <button onClick={() => setSelectedMomoId(m.id)} className="w-full text-left">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`p-1 rounded ${m.type === 'code' ? 'bg-gold/20 text-gold' : 'bg-green-900/30 text-green-400'}`}>
                                {m.type === 'code' ? <Hash size={12} /> : <Phone size={12} />}
                              </span>
                              <p className="text-sm font-semibold text-foreground">{m.label}</p>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.type === 'code' ? 'MoMo Code' : 'Phone Number'}</span>
                              {active && <span className="ml-auto text-[10px] text-gold uppercase tracking-wider">Selected</span>}
                            </div>
                            {m.name && m.name.trim() && (
                              <p className="text-[11px] text-muted-foreground mb-1.5">Registered name: <span className="text-foreground font-semibold">{m.name}</span> — confirm this name shows in your MoMo prompt before approving.</p>
                            )}
                          </button>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <p className="text-[10px] text-muted-foreground uppercase mb-0.5">{m.type === 'code' ? 'Code' : 'Number'}</p>
                                <code className="block px-3 py-1.5 rounded bg-background border border-gold/15 text-foreground font-mono text-sm break-all">{m.value}</code>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); copyValue(m.value, m.type === 'code' ? 'Code' : 'Number'); }}
                                className="self-end px-3 py-1.5 rounded bg-surface hover:bg-gold/10 text-muted-foreground hover:text-gold flex items-center gap-1 text-xs">
                                <Copy size={12} /> Copy
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <p className="text-[10px] text-gold uppercase mb-0.5">USSD — paste in dialer</p>
                                <code className="block px-3 py-1.5 rounded bg-background border border-gold/30 text-gold font-mono text-sm break-all">{ussd}</code>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); copyValue(ussd, 'USSD'); }}
                                className="self-end px-3 py-1.5 rounded bg-gold/15 hover:bg-gold/25 text-gold flex items-center gap-1 text-xs font-semibold">
                                <Copy size={12} /> Copy USSD
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="bg-gold/5 border border-gold/20 rounded-lg p-3 text-center">
                    <p className="text-sm text-muted-foreground">Amount to send:</p>
                    <p className="text-2xl font-display font-bold text-gold">{payAmount.toLocaleString()} RWF</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <input placeholder="Name on MoMo account" value={momoName} onChange={(e) => setMomoName(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60 transition-colors" />
                  <input placeholder="Transaction ID (optional)" value={txnId} onChange={(e) => setTxnId(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60 transition-colors" />
                  <label className="block gold-card rounded-lg p-4 cursor-pointer text-center">
                    <Upload className="w-6 h-6 text-gold mx-auto mb-2" />
                    <p className="text-sm font-body text-muted-foreground">
                      {proofFile
                        ? proofFile.name
                        : proofRequired
                          ? "Upload payment screenshot (required — previous payment was declined)"
                          : "Upload payment screenshot (optional)"}
                    </p>
                    {!proofFile && !proofRequired && (
                      <p className="text-[11px] text-muted-foreground/70 mt-1">
                        Optional if you got the MoMo SMS. Upload only if you didn't, or want to avoid coming back to verify.
                      </p>
                    )}
                    {priorRejected && (
                      <p className="text-[11px] text-destructive/80 mt-1">
                        Your previous payment was declined — a screenshot is now required.
                      </p>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && file.size > 5 * 1024 * 1024) { toast.error("File too large (max 5MB)"); return; }
                      setProofFile(file || null);
                    }} />
                  </label>
                  {error && <p className="text-sm text-destructive font-body">{error}</p>}
                  <label className="flex items-start gap-2 text-xs text-muted-foreground font-body cursor-pointer select-none">
                    <input type="checkbox" checked={agreedRefund} onChange={(e) => setAgreedRefund(e.target.checked)}
                      className="mt-0.5 accent-gold" />
                    <span>
                      I have read and agree to the{" "}
                      <a href="/refund-policy" target="_blank" rel="noopener" className="text-gold hover:underline">refund policy</a>{" "}
                      (tickets are non-refundable unless the event is cancelled).
                    </span>
                  </label>
                  <button onClick={handleSubmitPayment} disabled={loading}
                    className="w-full py-3 bg-gold text-background font-body font-semibold rounded-lg hover:bg-gold-light transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>I've Sent the Money</span> <ArrowRight size={16} /></>}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="gold-card rounded-xl p-8 text-center">
                <CheckCircle className="w-16 h-16 text-gold mx-auto mb-4" />
                <h2 className="font-display text-3xl font-semibold text-gold-gradient mb-2">Payment Submitted!</h2>
                <p className="text-sm text-muted-foreground font-body mb-6">Your e-ticket will be available once the team verifies your payment, usually within 2 hours.</p>
                <div className="text-left bg-surface-2 border border-gold/20 rounded-lg p-4 text-xs text-muted-foreground font-body leading-relaxed">
                  <p className="text-gold font-semibold mb-1">Refund summary</p>
                  <p>Tickets are non-refundable unless the event is cancelled. If cancelled, you are refunded in full minus mobile money fees. <a href="/refund-policy" className="text-gold hover:underline">See full refund policy</a>.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default PayPage;
