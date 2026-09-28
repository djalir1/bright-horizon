import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ScanResult = {
  status: 'admit' | 'already_entered' | 'unpaid' | 'invalid';
  name?: string;
  school?: string;
  level?: string;
  enteredAt?: string;
  remaining?: number;
};

const bgColors: Record<string, string> = {
  admit: 'bg-[#2D6A4F]',
  already_entered: 'bg-[#C0392B]',
  unpaid: 'bg-[#F59E0B]',
  invalid: 'bg-[#374151]',
};

const labels: Record<string, string> = {
  admit: 'ADMIT',
  already_entered: 'ALREADY ENTERED',
  unpaid: 'PAYMENT INCOMPLETE',
  invalid: 'CODE NOT FOUND',
};

const ScanPage = () => {
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [codeSuffix, setCodeSuffix] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  useEffect(() => {
    supabase.from('schools').select('*').eq('status', 'active').order('name').then(({ data }) => setSchools(data || []));
  }, []);

  const prefix = selectedSchool?.prefix || 'XXX';

  const handleScan = async () => {
    if (!codeSuffix.trim()) { toast.error("Enter code"); return; }
    const fullCode = "SG-" + codeSuffix.trim();
    setLoading(true);
    try {
      const { data: code } = await supabase.from('codes').select('*, users(*)').eq('code', fullCode).maybeSingle();

      if (!code || !code.users) {
        await supabase.from('scan_logs').insert({ result: 'invalid' });
        setResult({ status: 'invalid' });
        setLoading(false);
        return;
      }

      const user = code.users;

      if (user.payment_status !== 'paid') {
        await supabase.from('scan_logs').insert({ user_id: user.id, result: 'unpaid' });
        setResult({ status: 'unpaid', name: `${user.first_name} ${user.last_name}`, school: user.school_name, remaining: user.remaining_amount });
        setLoading(false);
        return;
      }

      if (user.entered) {
        await supabase.from('scan_logs').insert({ user_id: user.id, result: 'already_entered' });
        setResult({ status: 'already_entered', name: `${user.first_name} ${user.last_name}`, school: user.school_name, enteredAt: user.entered_at });
        setLoading(false);
        return;
      }

      // Admit
      await supabase.from('users').update({ entered: true, entered_at: new Date().toISOString() }).eq('id', user.id);
      await supabase.from('scan_logs').insert({ user_id: user.id, result: 'admitted' });
      setResult({ status: 'admit', name: `${user.first_name} ${user.last_name}`, school: user.school_name, level: user.level });
    } catch {
      toast.error("Scan failed");
    }
    setLoading(false);
  };

  const reset = () => {
    setResult(null);
    setCodeSuffix("");
  };

  return (
    <div className="min-h-screen bg-background font-body flex flex-col">
      <div className="p-4 border-b border-gold/10">
        <h1 className="font-display text-2xl text-gold text-center">Gate Entry Scanner</h1>
      </div>

      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-sm space-y-4">
              <div className="flex">
                <span className="px-4 py-3 bg-gold/10 text-gold font-mono text-lg rounded-l-lg border border-r-0 border-gold/20 flex items-center min-w-[70px] justify-center">SG-</span>
                <input type="number" placeholder="4821" value={codeSuffix}
                  onChange={(e) => setCodeSuffix(e.target.value.slice(0, 4))}
                  className="flex-1 px-4 py-3 bg-surface-2 border border-gold/20 rounded-r-lg text-foreground font-mono text-xl placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60" />
              </div>
              <button onClick={handleScan} disabled={loading}
                className="w-full py-4 bg-gold text-background font-semibold text-lg rounded-lg hover:bg-gold-light flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 size={20} className="animate-spin" /> : <><Search size={20} /> Check Entry</>}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className={`flex-1 flex flex-col items-center justify-center p-8 ${bgColors[result.status]}`}>
            <h2 className="font-display text-5xl md:text-7xl font-bold text-white mb-4 text-center">{labels[result.status]}</h2>
            {result.name && <p className="text-2xl text-white/90 font-body mb-2">{result.name}</p>}
            {result.school && <p className="text-lg text-white/70">{result.school}{result.level ? ` · ${result.level}` : ''}</p>}
            {result.status === 'already_entered' && result.enteredAt && (
              <p className="text-white/60 mt-2">First scanned at {new Date(result.enteredAt).toLocaleTimeString()}</p>
            )}
            {result.status === 'unpaid' && result.remaining && (
              <p className="text-white/70 mt-2">Remaining: {result.remaining.toLocaleString()} RWF</p>
            )}
            {result.status === 'admit' && (
              <p className="text-white/80 text-xl mt-4">Welcome to Senior Gala Night! 🎉</p>
            )}
            <button onClick={reset} className="mt-8 px-8 py-3 bg-white/20 text-white font-semibold rounded-lg hover:bg-white/30 flex items-center gap-2">
              <RotateCcw size={18} /> Scan Another
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScanPage;
