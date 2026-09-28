import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAdminSession } from "@/lib/auth";
import { toast } from "sonner";
import logoImage from "@/assets/senior-gala-logo.png";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) { toast.error("Enter email and password."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      toast.error(error.message || "Invalid credentials.");
      setLoading(false);
      return;
    }
    const session = await fetchAdminSession({ forceRefresh: true, retries: 3 });
    if (!session) {
      toast.error("We couldn't confirm your staff role. Wait a moment, then try again.");
      setLoading(false);
      return;
    }
    toast.success(`Welcome back, ${session.name}!`);
    const dest = session.role === 'door_in' ? '/admin/scan/entry'
      : session.role === 'door_out' ? '/admin/scan/exit'
      : '/admin';
    navigate(dest);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm gold-card rounded-xl p-8">
        <div className="text-center mb-8">
          <img src={logoImage} alt="Senior Gala" className="w-40 h-auto mx-auto mb-3" />
          <h1 className="font-display text-xl text-gold-gradient font-semibold">Senior Gala</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">Staff Login</p>
        </div>
        <div className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60 transition-colors" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60 transition-colors" onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          <button onClick={handleLogin} disabled={loading} className="w-full py-3 bg-gold text-background font-body font-semibold rounded-lg hover:bg-gold-light transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Sign In</span> <ArrowRight size={16} /></>}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
