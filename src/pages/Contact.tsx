import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Send, Loader2, ChevronDown } from "lucide-react";
import PublicLayout from "@/components/public/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const subjects = ["General Inquiry", "Registration Help", "Payment Issue", "School Partnership", "Other"];

const faqs = [
  {
    q: "How do I register?",
    a: "Go to the Register page, pick your tier, fill in your details, and submit your MoMo payment proof. Your ticket is issued instantly and confirmed once we verify the payment."
  },
  {
    q: "What does the ticket include?",
    a: "Buffet dinner, sodas, water and juice, DJ and music, décor and photography areas. Alcohol is not included in the ticket — available for personal purchase."
  },
  {
    q: "How do I pay for my ticket?",
    a: "Prices are all-in (no separate fee). Select your tier on the Register page and pay via MoMo. Upload your screenshot at the end."
  },
  {
    q: "When will I receive my e-ticket?",
    a: "Your e-ticket is generated instantly after you submit payment proof. It becomes a confirmed ADMIT ticket once our team verifies the payment."
  },
  {
    q: "What ID do I need at the gate?",
    a: "Your digital e-ticket (on your phone or printed) plus your student ID card for a quick check at the door."
  },
];

const ContactPage = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    supabase.from('settings').select('*').then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach(r => { map[r.key] = r.value; });
      setSettings(map);
    });
  }, []);

  const contacts = [
    { icon: Phone, label: "WhatsApp", value: settings.contact_whatsapp || "+250 7XX XXX XXX", sub: "Message us directly", href: `https://wa.me/${(settings.contact_whatsapp || '').replace(/\D/g, '')}` },
    { icon: Mail, label: "Email", value: settings.contact_email || "sadcorporation1@gmail.com", sub: "We reply within 24 hours", href: `mailto:${settings.contact_email || ''}` },
    { icon: MapPin, label: "Location", value: settings.contact_address || "Kigali, Rwanda", sub: "Kigali, Rwanda", href: undefined },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { toast.error("Name, email, and message are required."); return; }
    if (form.message.length < 20) { toast.error("Message must be at least 20 characters."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from('contact_messages').insert({
        name: form.name, email: form.email,
        message: form.subject ? `[${form.subject}] ${form.message}` : form.message,
      });
      if (error) throw error;
      toast.success("Message sent!");
      setSubmitted(true);
    } catch {
      toast.error("Failed to send message.");
    }
    setLoading(false);
  };

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative sparkle-bg min-h-[35vh] flex items-center justify-center pt-20 pb-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background z-0" />
        <div className="relative z-10 text-center px-4">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl md:text-5xl font-semibold text-gold-gradient mb-3">
            Get In Touch
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="text-foreground/70 font-body max-w-md mx-auto">
            Have a question? Want to register your school? We're here to help.
          </motion.p>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 pb-20 space-y-12">
        {/* Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {contacts.map((item, i) => (
            <motion.a key={item.label} href={item.href} target={item.href?.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="gold-card rounded-lg p-6 text-center block hover:border-gold/50 transition-all">
              <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-5 h-5 text-gold" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">{item.label}</h3>
              <p className="text-sm text-gold font-body">{item.value}</p>
              <p className="text-xs text-muted-foreground font-body mt-1">{item.sub}</p>
            </motion.a>
          ))}
        </div>

        {/* Contact Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="gold-card rounded-xl p-8 max-w-xl mx-auto">
          <h2 className="font-display text-2xl text-gold-gradient mb-6 text-center">Send Us a Message</h2>
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-green-900/20 border border-green-500/30 flex items-center justify-center mx-auto mb-3">
                <Send className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-green-400 font-body font-semibold">Message sent!</p>
              <p className="text-sm text-muted-foreground font-body mt-1">We'll get back to you at {form.email} soon.</p>
              <button onClick={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                className="text-sm text-gold hover:text-gold-light mt-4 font-body">Send another message</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60 transition-colors" />
              <input type="email" placeholder="Email Address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60 transition-colors" />
              <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground font-body focus:outline-none focus:border-gold/60 transition-colors">
                <option value="">Select a subject (optional)</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <textarea placeholder="Your message (min 20 characters)" rows={4} value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-4 py-3 bg-surface-2 border border-gold/20 rounded-lg text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/60 transition-colors resize-none" />
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-gold text-background font-body font-semibold rounded-lg hover:bg-gold-light transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send Message
              </button>
            </form>
          )}
        </motion.div>

        {/* FAQ */}
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-display text-3xl text-gold-gradient mb-6 text-center">Frequently Asked Questions</h2>
          <div className="max-w-xl mx-auto space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="gold-card rounded-lg overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gold/5 transition-colors">
                  <span className="font-body font-semibold text-foreground text-sm">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-gold transition-transform flex-shrink-0 ml-2 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-foreground/70 font-body leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </PublicLayout>
  );
};

export default ContactPage;
