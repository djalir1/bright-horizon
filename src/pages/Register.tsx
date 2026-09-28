import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, ArrowRight, ArrowLeft, Loader2, Upload, Copy, Hash, Phone, Clock } from "lucide-react";
import PublicLayout from "@/components/public/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { sortSchoolsOtherLast, generateUniversalCode } from "@/lib/format";
import { signQrToken } from "@/lib/qrToken";
import QRCode from "qrcode";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import TierCards, { Tier, isSoldOut } from "@/components/public/TierCards";

const levels = ["S4", "S5", "S6", "Year 1", "Year 2", "Year 3", "L4", "L5", "Terminale", "Other"];
const genders = ["Male", "Female", "Prefer not to say"];

type MomoMethod = { id: string; label: string; value: string; ussd?: string; name?: string; type: 'code' | 'number'; enabled: boolean };

const HowToPay: React.FC<{ amount: number }> = ({ amount }) => {
  const [s, setS] = useState<{ num: string; name: string } | null>(null);
  useEffect(() => {
    supabase.from('settings').select('key, value').in('key', ['momo_number', 'momo_account_name']).then(({ data }) => {
      const m: Record<string, string> = {};
      (data || []).forEach(r => { m[r.key] = r.value; });
      setS({ num: m.momo_number || '', name: m.momo_account_name || '' });
    });
  }, []);
  if (!s) return null;
  if (!s.num && !s.name) {
    return (
      <div className="bg-gold/5 border border-gold/30 rounded-lg p-4 mb-4 text-sm font-body text-foreground/80">
        Payment details coming soon — contact us at <a href="mailto:sadcorporation1@gmail.com" className="text-gold hover:underline">sadcorporation1@gmail.com</a>
      </div>
    );
  }
  return (
    <div className="bg-gold/10 border-2 border-gold/40 rounded-lg p-4 mb-4 font-body">
      <p className="text-xs uppercase tracking-wider text-gold font-semibold mb-2">How to pay</p>
      <p className="text-sm text-foreground mb-2">Send <span className="font-bold text-gold">{amount.toLocaleString()} RWF</span> via MTN MoMo to:</p>
      {s.num && <p className="text-sm text-foreground/90">📱 Number: <span className="font-mono text-gold font-bold">{s.num}</span></p>}
      {s.name && <p className="text-sm text-foreground/90">👤 Account name: <span className="text-foreground font-semibold">{s.name}</span></p>}
      <p className="text-xs text-muted-foreground mt-2">Then fill in your payment details below and submit.</p>
    </div>
  );
};

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [otherSchoolName, setOtherSchoolName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", level: "", section: "", gender: "" });
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [momoMethods, setMomoMethods] = useState<MomoMethod[]>([]);
  const [selectedMomoId, setSelectedMomoId] = useState<string>("");
  const [momoName, setMomoName] = useState("");
  const [txnId, setTxnId] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [issued, setIssued] = useState<{ code: string; qrDataUrl: string; firstName: string } | null>(null);
  const [codeSaved, setCodeSaved] = useState(false);
  const codeBoxRef = useRef<HTMLDivElement | null>(null);

  // When the user lands on step 4 (code issued), scroll the code into view
  useEffect(() => {
    if (step === 4 && issued) {
      // Jump to top immediately so the user never lingers at the old button position,
      // then smoothly bring the code box into view once the step-4 card has mounted.
      window.scrollTo({ top: 0, behavior: 'auto' });
      const t1 = setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }, 50);
      const t2 = setTimeout(() => {
        codeBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [step, issued]);

  // Warn the user before leaving while their code is still on screen unsaved
  useEffect(() => {
    if (step !== 4 || !issued || codeSaved) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [step, issued, codeSaved]);

  useEffect(() => {
    supabase.from('schools').select('*').eq('status', 'active').order('name').then(({ data }) => setSchools(sortSchoolsOtherLast(data || [])));
    supabase.from('settings').select('*').then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach(r => { map[r.key] = r.value; });
      try {
        const parsed = JSON.parse(map.momo_methods || '[]') as MomoMethod[];
        const enabled = Array.isArray(parsed) ? parsed.filter(m => m.enabled && m.value.trim()) : [];
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
      } catch { /* ignore */ }
    });
    supabase.from('ticket_tiers').select('*').eq('is_active', true).order('sort_order').then(({ data }) => {
      const list = (data || []).map((t: any) => ({ ...t, perks: Array.isArray(t.perks) ? t.perks : [] })) as Tier[];
      setTiers(list);
      const firstAvailable = list.find(t => !isSoldOut(t));
      if (firstAvailable) setSelectedTierId(firstAvailable.id);
    });
  }, []);

  const isOther = selectedSchool?.prefix === 'OTH';
  const isGeneral = selectedSchool && selectedSchool.id === null;
  const selectedTier = tiers.find(t => t.id === selectedTierId);
  const stepDots = [1, 2, 3, 4];

  const copyValue = async (val: string, label: string) => {
    try { await navigator.clipboard.writeText(val); toast.success(`${label} copied`); }
    catch { toast.error("Couldn't copy"); }
  };

  const fireConfetti = () => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 },
      colors: ['#C9A84C', '#E8D5A3', '#8B6914', '#F5F0E8'] });
  };

  const handlePickTier = () => {
    setError("");
    if (!selectedTierId) { setError("Please select a ticket tier."); return; }
    const tier = tiers.find(t => t.id === selectedTierId);
    if (!tier || isSoldOut(tier)) { setError("This tier is sold out."); return; }
    setStep(2);
  };

  const handleDetailsNext = () => {
    setError("");
    const { firstName, lastName, email, phone, gender, level } = form;
    if (!selectedSchool) { setError("Please select your school or General Public."); return; }
    if (isOther && !otherSchoolName.trim()) { setError("Please enter your school name."); return; }
    const missing: string[] = [];
    if (!firstName.trim()) missing.push("First name");
    if (!lastName.trim()) missing.push("Last name");
    if (!email.trim()) missing.push("Email");
    if (!phone.trim()) missing.push("Phone");
    if (!isGeneral && !level) missing.push("Level/Year");
    if (!gender) missing.push("Gender");
    if (missing.length) { setError(`Please fill: ${missing.join(", ")}.`); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError("Please enter a valid email address."); return; }
    if (!agreedTerms) { setError("You must accept the Terms & Conditions to continue."); return; }
    setStep(3);
  };

  const handleSubmitPayment = async () => {
    setError("");
    if (!selectedTier) { setError("Tier missing."); return; }
    // All proof fields are optional individually, but at least ONE must be provided.
    if (!momoName.trim() && !txnId.trim() && !proofFile) {
      setError("Please provide at least one: payer name, transaction reference, or screenshot.");
      return;
    }

    const { data: liveTier } = await supabase.from('ticket_tiers').select('quantity_total, quantity_sold').eq('id', selectedTier.id).maybeSingle();
    if (liveTier && liveTier.quantity_sold >= liveTier.quantity_total) {
      setError("Sorry, this tier just sold out. Please pick another tier.");
      setStep(1);
      return;
    }

    setLoading(true);
    toast.loading("Submitting your payment...");
    try {
      const { data: existingData } = await supabase.from('codes').select('code').like('code', 'SG-%');
      const existing = (existingData || []).map(c => c.code);
      const newCode = generateUniversalCode(existing, 4);

      const schoolName = isOther ? otherSchoolName.trim() : selectedSchool.name;

      const { data: codeRow, error: codeErr } = await supabase.from('codes').insert({
        code: newCode,
        status: 'used',
        school_id: selectedSchool.id || null,
        code_type: isGeneral ? 'general' : 'student',
        payment_method: 'momo',
        created_by: 'self-service',
        fee_amount: 0,
      }).select().single();
      if (codeErr) throw codeErr;

      const { data: user, error: userErr } = await supabase.from('users').insert({
        code_id: codeRow.id,
        first_name: form.firstName, last_name: form.lastName,
        email: form.email, phone: form.phone,
        school_id: selectedSchool.id || null,
        school_name: schoolName,
        level: form.level || null, section: form.section || null,
        gender: form.gender,
        department: schoolName,
        tier_id: selectedTier.id,
        ticket_price: selectedTier.price,
        paid_amount: 0,
        remaining_amount: selectedTier.price,
        payment_status: 'unpaid',
        ticket_state: 'pending',
      } as any).select().single();
      if (userErr) throw userErr;

      await supabase.from('codes').update({ used_by_user_id: user.id }).eq('id', codeRow.id);

      let publicUrl: string | null = null;
      if (proofFile) {
        const path = `${Date.now()}-${proofFile.name}`;
        const { error: upErr } = await supabase.storage.from('payments').upload(path, proofFile);
        if (upErr) throw upErr;
        publicUrl = supabase.storage.from('payments').getPublicUrl(path).data.publicUrl;
      }

      const selectedMomo = momoMethods.find(m => m.id === selectedMomoId);
      await supabase.from('payments').insert({
        user_id: user.id,
        amount: selectedTier.price,
        method: 'momo',
        momo_name: momoName.trim() || null,
        momo_number_used: selectedMomo ? `${selectedMomo.label}: ${selectedMomo.value}` : null,
        transaction_id: txnId.trim() || null,
        screenshot_url: publicUrl,
        status: 'pending',
      });

      const token = await signQrToken(newCode, user.id);
      const qrDataUrl = await QRCode.toDataURL(token, {
        width: 600, margin: 2, errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#FFFFFF' },
      });

      supabase.functions.invoke('send-ticket-issued', {
        body: { userId: user.id, recipientEmail: form.email, code: newCode },
      }).catch(() => { /* email infra optional */ });

      toast.dismiss();
      toast.success("Ticket issued — pending confirmation!");
      setTimeout(fireConfetti, 200);
      setIssued({ code: newCode, qrDataUrl, firstName: form.firstName });
      setStep(4);
    } catch (e: any) {
      toast.dismiss();
      const msg = e?.message || e?.error_description || "Submission failed";
      setError(msg);
      toast.error(msg);
      console.error("Register submit failed:", e);
    }
    setLoading(false);
  };

  return (
    <PublicLayout>
      <div className="min-h-screen flex items-center justify-center pt-24 pb-16 px-4">
        <div className={`w-full ${step === 1 ? 'max-w-5xl' : 'max-w-md'}`}>
          <div className="flex justify-center gap-2 mb-6">
            {stepDots.map(s => (
              <div key={s} className={`w-2.5 h-2.5 rounded-full transition-all ${s <= step ? 'bg-gold' : 'bg-gold/20'}`} />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="text-center mb-6">
                  <h1 className="font-display text-3xl font-semibold text-gold-gradient mb-2">Pick Your Ticket</h1>
                  <p className="text-sm text-muted-foreground font-body">All-in prices — booking is included.</p>
                </div>
                {tiers.length === 0 ? (
                  <p className="text-center text-muted-foreground">Loading tiers…</p>
                ) : (
                  <TierCards tiers={tiers} selectedId={selectedTierId} onSelect={setSelectedTierId} />
                )}
                {error && <p className="text-sm text-destructive font-body text-center mt-4">{error}</p>}
                <div className="max-w-md mx-auto mt-6">
                  <button onClick={handlePickTier} disabled={!selectedTierId}
                    className="w-full py-3 bg-gold text-background font-body font-semibold rounded-lg hover:bg-gold-light transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50">
                    Continue <ArrowRight size={16} />
                  </button>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Already have a code?{" "}
                    <Link to="/pay" className="text-gold hover:underline">View your ticket / pay balance</Link>.
                  </p>
                </div>
              </motion.div>
            )}

            {step === 2 && selectedTier && (
              <motion.div key="step2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="gold-card rounded-xl p-8">
                <button onClick={() => setStep(1)} className="text-muted-foreground hover:text-gold mb-4 flex items-center gap-1 text-sm font-body"><ArrowLeft size={14} /> Back</button>
                <h2 className="font-display text-2xl font-semibold text-gold-gradient mb-1">Your Details</h2>
                <div className="bg-gold/5 border border-gold/20 rounded-lg p-3 mb-5 text-xs font-body flex items-center justify-between">
                  <span><span className="text-muted-foreground">Tier </span><span className="text-foreground font-semibold">{selectedTier.name}</span></span>
                  <span className="text-gold font-semibold">{selectedTier.price.toLocaleString()} RWF</span>
                </div>
                <div className="mb-4">
                  <label className="text-sm text-muted-foreground mb-1.5 block font-body">School</label>
                  <select
                    value={selectedSchool?.id === null ? '__general__' : (selectedSchool?.id || '')}
                    onChange={(e) => {
                      if (e.target.value === '__general__') setSelectedSchool({ id: null, name: 'General Public', prefix: 'GP' });
                      else setSelectedSchool(schools.find(s => s.id === e.target.value) || null);
                    }}
                    className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground font-body focus:outline-none focus:border-gold/60">
                    <option value="">Select your school</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    <option value="__general__">General Public (not a student)</option>
                  </select>
                </div>
                {isOther && (
                  <div className="mb-4">
                    <input type="text" placeholder="Type your school name exactly" value={otherSchoolName}
                      onChange={(e) => setOtherSchoolName(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60" />
                  </div>
                )}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60" />
                    <input placeholder="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60" />
                  </div>
                  <input type="email" placeholder="Email Address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60" />
                  <input type="tel" placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60" />
                  {!isGeneral && (
                    <>
                      <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground font-body focus:outline-none focus:border-gold/60">
                        <option value="">Select Level/Year</option>
                        {levels.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <input placeholder="Section/Program (optional)" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60" />
                    </>
                  )}
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground font-body focus:outline-none focus:border-gold/60">
                    <option value="">Select Gender</option>
                    {genders.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <label className="flex items-start gap-3 p-3 bg-surface-2/60 border border-gold/15 rounded-lg cursor-pointer hover:border-gold/30 transition-colors">
                    <input type="checkbox" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 accent-gold cursor-pointer flex-shrink-0" />
                    <span className="text-xs text-foreground/70 font-body leading-relaxed">
                      I confirm the information above is correct and I accept the{" "}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light underline">Terms &amp; Conditions</a>.
                      Tickets are non-refundable unless the event is cancelled.
                    </span>
                  </label>
                  {error && <p className="text-sm text-destructive font-body">{error}</p>}
                  <button onClick={handleDetailsNext} disabled={loading || !agreedTerms}
                    className="w-full py-3 bg-gold text-background font-body font-semibold rounded-lg hover:bg-gold-light transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50">
                    <span>Continue to Payment</span> <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && selectedTier && (
              <motion.div key="step3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="gold-card rounded-xl p-8">
                <button onClick={() => setStep(2)} className="text-muted-foreground hover:text-gold mb-4 flex items-center gap-1 text-sm font-body"><ArrowLeft size={14} /> Back</button>
                <h2 className="font-display text-2xl font-semibold text-gold-gradient mb-1">Pay & Submit Proof</h2>
                <div className="bg-gold/5 border border-gold/20 rounded-lg p-4 my-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total to send</p>
                  <p className="text-3xl font-display font-bold text-gold-gradient mt-1">{selectedTier.price.toLocaleString()} RWF</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{selectedTier.name} — booking included</p>
                </div>
                <HowToPay amount={selectedTier.price} />
                {momoMethods.length === 0 && (
                  <p className="text-sm text-destructive mb-3">No MoMo methods are configured. Please contact the team.</p>
                )}
                <div className="space-y-2 mb-4">
                  {momoMethods.map((m) => {
                    const active = selectedMomoId === m.id;
                    const ussd = m.ussd && m.ussd.trim() ? m.ussd : m.value;
                    return (
                      <div key={m.id} className={`p-3 rounded-lg border transition-all ${active ? 'border-gold bg-gold/10' : 'border-gold/20 bg-surface-2'}`}>
                        <button onClick={() => setSelectedMomoId(m.id)} className="w-full text-left">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`p-1 rounded ${m.type === 'code' ? 'bg-gold/20 text-gold' : 'bg-green-900/30 text-green-400'}`}>
                              {m.type === 'code' ? <Hash size={12} /> : <Phone size={12} />}
                            </span>
                            <p className="text-sm font-semibold text-foreground">{m.label}</p>
                            {active && <span className="ml-auto text-[10px] text-gold uppercase tracking-wider">Selected</span>}
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-3 py-1.5 rounded bg-background border border-gold/30 text-gold font-mono text-sm break-all">{ussd}</code>
                          <button onClick={(e) => { e.stopPropagation(); copyValue(ussd, 'USSD'); }}
                            className="px-3 py-1.5 rounded bg-gold/15 hover:bg-gold/25 text-gold flex items-center gap-1 text-xs font-semibold">
                            <Copy size={12} /> Copy
                          </button>
                        </div>
                        {m.name && m.name.trim() && (
                          <p className="mt-1.5 text-[11px] text-muted-foreground font-body">
                            Account holder: <span className="text-foreground/90 font-semibold">{m.name}</span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-3">
                  <p className="text-[11px] text-muted-foreground font-body leading-relaxed bg-gold/5 border border-gold/15 rounded p-2.5">
                    Provide whatever proof you have — transaction reference, screenshot, or both. The team will verify and confirm.
                  </p>
                  <div>
                    <label className="text-xs text-muted-foreground font-body block mb-1.5">Name on your MoMo account <span className="text-[10px]">(optional but helps us match your payment)</span></label>
                    <input placeholder="e.g. UWASE Jeanne" value={momoName} onChange={(e) => setMomoName(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60" />
                  </div>
                  <input placeholder="MoMo transaction reference (optional)" value={txnId} onChange={(e) => setTxnId(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60" />
                  <label className="block gold-card rounded-lg p-4 cursor-pointer text-center">
                    <Upload className="w-6 h-6 text-gold mx-auto mb-2" />
                    <p className="text-sm font-body text-muted-foreground">{proofFile ? proofFile.name : "Upload payment screenshot (optional)"}</p>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && file.size > 5 * 1024 * 1024) { toast.error("File too large (max 5MB)"); return; }
                      setProofFile(file || null);
                    }} />
                  </label>
                  {error && <p className="text-sm text-destructive font-body">{error}</p>}
                  <button onClick={handleSubmitPayment} disabled={loading}
                    className="w-full py-3 bg-gold text-background font-body font-semibold rounded-lg hover:bg-gold-light transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>I've Sent the Money — Issue My Ticket</span> <ArrowRight size={16} /></>}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 4 && issued && (
              <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="gold-card rounded-xl p-8 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
                  <CheckCircle className="w-16 h-16 text-gold mx-auto mb-4" />
                </motion.div>
                <h2 className="font-display text-3xl font-semibold text-gold-gradient mb-2">Thank you, {issued.firstName}!</h2>
                <p className="text-sm text-muted-foreground font-body mb-5">Your payment has been received and your ticket has been issued.</p>
                <div ref={codeBoxRef} className="bg-surface-2 border border-gold/30 rounded-lg p-4 mb-4 text-left space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Your code</p>
                  <p className="font-mono text-3xl text-gold-gradient font-bold tracking-wider text-center">{issued.code}</p>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(issued.code).catch(() => {});
                      setCodeSaved(true);
                      toast.success("Code copied — saved for this session");
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 mt-2 bg-gold/10 hover:bg-gold/20 text-gold text-xs font-body font-semibold rounded-lg border border-gold/30 transition-all"
                  >
                    <Copy size={14} /> {codeSaved ? "Code copied" : "Copy & save my code"}
                  </button>
                </div>
                <div className="bg-surface-2/70 border border-gold/15 rounded-lg p-3 mb-4 text-left">
                  <p className="text-[11px] uppercase tracking-wider text-gold font-semibold mb-1.5">What happens next</p>
                  <ol className="text-xs text-foreground/80 font-body list-decimal pl-4 space-y-1">
                    <li>The team verifies your payment (usually within a few hours).</li>
                    <li>You receive a confirmation email and your QR unlocks on the Ticket page.</li>
                    <li>You can then download your e-ticket and your receipt.</li>
                  </ol>
                </div>
                <div className="bg-gold/5 border border-gold/20 rounded-lg p-3 mb-4 text-left">
                  <p className="text-xs text-foreground/80 font-body leading-relaxed">
                    📄 <span className="font-semibold text-gold">Want a receipt?</span> Once your payment is confirmed, visit{' '}
                    <Link to="/receipt" className="text-gold hover:underline">/receipt</Link>{' '}
                    and enter your code to download your payment confirmation.
                  </p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-4 text-left mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-amber-400" />
                    <p className="font-semibold text-amber-400 font-body uppercase tracking-wide text-xs">Pending Confirmation</p>
                  </div>
                  <p className="text-xs text-foreground/80 font-body leading-relaxed">Our team will verify your payment shortly. You can either:</p>
                  <ul className="text-xs text-foreground/80 font-body list-disc pl-4 mt-1 space-y-0.5">
                    <li>Wait for the confirmation email (usually within a few hours), or</li>
                    <li>Keep this code and QR — it is already saved to your account.</li>
                  </ul>
                  <p className="text-xs text-foreground/70 font-body mt-2 leading-relaxed">
                    If there is any issue with your payment, we will contact you using the phone or email you provided.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground font-body mb-5">
                  Need help? <a href="mailto:sadcorporation1@gmail.com" className="text-gold hover:underline">sadcorporation1@gmail.com</a> · <a href="tel:+250786324622" className="text-gold hover:underline">+250 786 324 622</a>
                </p>
                <Link to="/ticket"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gold text-background font-body font-semibold rounded-lg hover:bg-gold-light transition-all">
                  Check My Ticket Status <ArrowRight size={16} />
                </Link>
                <p className="text-[11px] text-muted-foreground font-body mt-2">
                  (Your e-ticket unlocks here as soon as payment is confirmed.)
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PublicLayout>
  );
};

export default RegisterPage;