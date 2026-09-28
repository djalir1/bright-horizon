import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, CreditCard, QrCode, Star, Music, Mic2, Utensils, Camera, Crown } from "lucide-react";
import PublicLayout from "@/components/public/PublicLayout";
import { supabase } from "@/integrations/supabase/client";

const AboutPage = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [teamMembers, setTeamMembers] = useState<{ name: string; role: string; phone: string }[]>([]);

  useEffect(() => {
    supabase.from('settings').select('*').then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach(r => { map[r.key] = r.value; });
      setSettings(map);
      try { setTeamMembers(JSON.parse(map.team_members || '[]')); } catch { setTeamMembers([]); }
    });
  }, []);

  const stats = [
    { value: settings.ticket_price ? parseInt(settings.ticket_price).toLocaleString() + ' RWF' : '25,000 RWF', label: 'Ticket Price' },
    { value: 'Kigali-Wide', label: 'Open to All Schools' },
    { value: 'Late August 2026', label: 'Target Date' },
  ];

  const features = [
    { icon: Shield, title: "Code-Based Access", desc: "Each guest receives a unique registration code" },
    { icon: CreditCard, title: "Secure Payments", desc: "Manual MoMo confirmation by our team" },
    { icon: QrCode, title: "Digital E-Tickets", desc: "QR-coded tickets, scanned at the door" },
  ];

  const experience = [
    { icon: Star, title: "Red Carpet Arrival", desc: "Every guest walks in like a star — photography, welcome drinks, and a grand entrance moment." },
    { icon: Music, title: "Professional DJ", desc: "An experienced Kigali DJ playing Afrobeats, Amapiano, Rwandan hits, and international tracks all night." },
    { icon: Mic2, title: "Live Performers", desc: "Live performances from Rwandan artists — surprise acts, cultural moments, and headline sets." },
    { icon: Utensils, title: "Food & Snacks", desc: "Buffet dinner, premium snack stations, samosas, finger foods, and refreshments throughout the night." },
    { icon: Camera, title: "Photo Booth", desc: "A dedicated photo booth with props, backdrops, and instant photo prints to take home." },
    { icon: Crown, title: "Awards & Crowning", desc: "Gala King and Queen crowning, class superlatives, and recognition awards under the spotlight." },
  ];

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative sparkle-bg min-h-[40vh] flex items-center justify-center pt-20 pb-12">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background z-0" />
        <div className="relative z-10 text-center px-4">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-gold-gradient mb-4">
            About Senior Gala Night
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-foreground/70 font-body max-w-lg mx-auto">
            The story, the team, and the vision behind Kigali's biggest student celebration.
          </motion.p>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 pb-20 space-y-16">
        {/* Section 1 — The Event */}
        <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-display text-3xl text-gold-gradient mb-6">What Is Senior Gala Night?</h2>
          <div className="space-y-4 text-foreground/80 font-body leading-relaxed">
            <p>Senior Gala Night is an independent, student-organized celebration for all finalist students across Kigali — from TVET Level 5 schools and REB S6 schools. It is a night of freedom, music, good food, and memories made with your peers before everyone goes their separate ways.</p>
            <p>Unlike school-organized ceremonies, Senior Gala Night is fully student-driven — organized by S.A.D Corporation (Smart, Artistic, Digital). Every detail, from the venue to the music to the ticket system, is handled by students, for students.</p>
            <p>The event is open to all senior students and youth in Kigali. Every attendee registers through our platform with a unique code and receives a digital e-ticket to enter.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            {stats.map((stat, i) => (
              <div key={i} className="gold-card rounded-lg p-5 text-center">
                <p className="font-display text-2xl text-gold font-semibold">{stat.value}</p>
                <p className="text-sm text-muted-foreground font-body mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Section 2 — The Organizer */}
        <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-display text-3xl text-gold-gradient mb-6">Who Is Behind This?</h2>
          <div className="max-w-xl">
            <div className="gold-card rounded-xl p-6">
              <div className="w-14 h-14 rounded-full bg-gold flex items-center justify-center text-background font-display text-xl font-bold mb-4">S.A.D</div>
              <h3 className="font-display text-xl text-foreground mb-3">S.A.D Corporation</h3>
              <p className="text-sm text-foreground/70 font-body leading-relaxed">
                {settings.sad_description || "S.A.D Corporation (Smart, Artistic, Digital) is a student-founded creative and technology company based in Kigali. S.A.D builds digital products, organizes events, and creates experiences that represent the new generation of Rwandan youth."}
              </p>
            </div>
          </div>
        </motion.section>

        {/* Section 3 — The Team */}
        {teamMembers.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-display text-3xl text-gold-gradient mb-2">Meet The Team</h2>
            <p className="text-muted-foreground font-body mb-8">The people making this happen</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamMembers.map((member, i) => (
                <div key={i} className="gold-card rounded-lg p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gold flex items-center justify-center text-background font-display text-lg font-bold flex-shrink-0">
                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-foreground font-body font-semibold">{member.name}</p>
                    <p className="text-sm text-muted-foreground font-body">{member.role}</p>
                    {member.phone && <p className="text-xs text-gold/70 font-mono mt-0.5">{member.phone}</p>}
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Section 4 — The Platform */}
        <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-display text-3xl text-gold-gradient mb-4">How We Built This</h2>
          <p className="text-foreground/80 font-body leading-relaxed mb-8">
            The registration, payment, and ticketing system you are using was designed and built entirely by the S.A.D Corporation technology team. From code-based registration to digital e-tickets with QR codes, every part of this platform was made in-house.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div key={i} className="gold-card rounded-lg p-5 text-center">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-3">
                  <f.icon className="w-5 h-5 text-gold" />
                </div>
                <p className="font-body font-semibold text-foreground mb-1">{f.title}</p>
                <p className="text-xs text-muted-foreground font-body">{f.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Section 5 — Experience */}
        <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-display text-3xl text-gold-gradient mb-2">The Senior Gala Experience</h2>
          <p className="text-muted-foreground font-body mb-8">What to expect on the night</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {experience.map((x, i) => (
              <div key={i} className="gold-card rounded-lg p-5 border-l-2 border-gold">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center mb-3">
                  <x.icon className="w-5 h-5 text-gold" />
                </div>
                <p className="font-display text-lg text-gold mb-1">{x.title}</p>
                <p className="text-sm text-foreground/70 font-body leading-relaxed">{x.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </PublicLayout>
  );
};

export default AboutPage;
