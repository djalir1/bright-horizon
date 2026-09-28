import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { MapPin, Ticket, Star, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Tier = {
  id: string;
  name: string;
  price: number;
  sort_order: number;
  homepage_label: string | null;
  is_table_tier: boolean;
  seats_per_table: number;
};

const AboutSection = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [tiers, setTiers] = useState<Tier[]>([]);

  useEffect(() => {
    supabase.from('settings').select('*').then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach(r => { map[r.key] = r.value; });
      setSettings(map);
    });
    supabase.from('ticket_tiers')
      .select('id, name, price, sort_order, homepage_label, is_table_tier, seats_per_table')
      .eq('is_active', true).eq('homepage_visible', true).order('sort_order')
      .then(({ data }) => setTiers((data as any[] || []) as Tier[]));
  }, []);

  const venueConfirmed = settings.venue_confirmed === 'true';
  const priceRange = tiers.length
    ? `${Math.min(...tiers.map(t => t.price)).toLocaleString()} – ${Math.max(...tiers.map(t => t.price)).toLocaleString()}`
    : (settings.ticket_price ? parseInt(settings.ticket_price).toLocaleString() : '25,000');

  const cards = [
    {
      icon: venueConfirmed ? MapPin : Clock,
      title: "Venue",
      description: venueConfirmed ? (settings.venue_name || 'TBA') : "To Be Announced",
    },
    {
      icon: Ticket,
      title: "Ticket",
      description: `From ${priceRange} RWF per ticket · all-in pricing, no extra fees`,
    },
    {
      icon: Star,
      title: "Includes",
      description: "Buffet dinner · Soda, water & juice · Music & DJ · Décor & photography",
    },
  ];

  return (
    <section id="about" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-5xl font-semibold text-gold-gradient mb-4">
            About The Event
          </h2>
          <div className="w-16 h-px bg-gold/30 mx-auto" />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="gold-card rounded-lg p-6 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
                <card.icon className="w-5 h-5 text-gold" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">{card.title}</h3>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">{card.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-foreground/60 font-body max-w-2xl mx-auto leading-relaxed"
        >
          The Senior Gala is an exclusive celebration marking the end of an incredible journey for finalist students
          across all Kigali schools. Organized by S.A.D Corporation. Join us for an unforgettable evening of fine dining,
          entertainment, and memories that will last a lifetime.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-10 max-w-3xl mx-auto gold-card rounded-xl p-6 md:p-7"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-gold/70 text-center mb-3">All-in ticket pricing</p>
          {tiers.length > 0 ? (
            <div className="space-y-2 mb-4">
              <div className="hidden sm:grid grid-cols-[1.6fr_1fr] gap-3 text-[10px] uppercase tracking-wider text-muted-foreground px-3">
                <span>Tier</span>
                <span className="text-right text-gold/80">Total (all-in)</span>
              </div>
              {tiers.map((t) => {
                const label = (t.homepage_label || t.name) + (t.is_table_tier ? ` (table of ${t.seats_per_table})` : '');
                return (
                  <div key={t.id} className="grid grid-cols-2 sm:grid-cols-[1.6fr_1fr] gap-3 items-center bg-surface-2/40 border border-gold/10 rounded-lg px-3 py-2.5">
                    <span className="text-sm text-foreground font-body truncate">{label}</span>
                    <span className="text-right font-display text-lg text-gold-gradient">{t.price.toLocaleString()} RWF</span>
                  </div>
                );
              })}
            </div>
          ) : null}
          <p className="text-xs text-foreground/70 font-body leading-relaxed text-center">
            One single payment unlocks your e-ticket — no extra booking fee.
            Seats are limited and going fast — lock yours in tonight.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;
