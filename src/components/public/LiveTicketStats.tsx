import { useEffect, useState, useRef } from "react";
import { motion, useInView, animate } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

type Tier = {
  id: string;
  name: string;
  quantity_total: number;
  quantity_sold: number;
  is_active: boolean;
  sort_order: number;
  homepage_visible: boolean;
  homepage_show_sold: boolean;
  homepage_show_remaining: boolean;
  homepage_force_soldout: boolean;
  homepage_label: string | null;
  is_table_tier: boolean;
  seats_per_table: number;
};

const CountUp = ({ to }: { to: number }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.8,
      ease: "easeOut",
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, to]);
  return <span ref={ref}>{val.toLocaleString()}</span>;
};

const LiveTicketStats = () => {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [show, setShow] = useState(true);
  const [forceSoldOut, setForceSoldOut] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data: tierData }, { data: settingsData }] = await Promise.all([
        supabase.from("ticket_tiers").select("*").eq("is_active", true).eq("homepage_visible", true).order("sort_order"),
        supabase.from("settings").select("key, value").in("key", ["homepage_show_counter", "homepage_force_soldout", "homepage_sold_offset"]),
      ]);
      if (!mounted) return;
      setTiers((tierData as any[] || []) as Tier[]);
      const map: Record<string, string> = {};
      (settingsData || []).forEach((r: any) => { map[r.key] = r.value; });
      setShow(map.homepage_show_counter !== "false");
      setForceSoldOut(map.homepage_force_soldout === "true");
      setOffset(parseInt(map.homepage_sold_offset || "0", 10) || 0);
      setLoaded(true);
    })();
    return () => { mounted = false; };
  }, []);

  if (!loaded || !show || tiers.length === 0) return null;

  const totalSold = tiers.reduce((s, t) => s + t.quantity_sold, 0) + offset;
  const totalCapacity = tiers.reduce((s, t) => s + t.quantity_total, 0);
  const allSoldOut = forceSoldOut || tiers.every((t) => t.homepage_force_soldout || t.quantity_sold >= t.quantity_total);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay: 0.2 }}
      className="w-full max-w-3xl mx-auto mt-8"
    >
      <div className="rounded-2xl border border-gold/20 bg-surface-2/40 backdrop-blur p-5 md:p-6">
        {allSoldOut ? (
          <div className="text-center py-2">
            <motion.p
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="font-display text-3xl md:text-4xl font-bold text-destructive uppercase tracking-[0.3em]"
            >
              Sold Out
            </motion.p>
            <p className="text-xs text-muted-foreground font-body mt-2 tracking-widest uppercase">
              All {totalCapacity.toLocaleString()} tickets have been claimed
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <p className="text-[11px] md:text-xs font-body uppercase tracking-[0.3em] text-gold-light/70 mb-2">
                Tickets sold so far
              </p>
              <p className="font-display text-5xl md:text-6xl font-semibold text-gold-gradient leading-none">
                <CountUp to={totalSold} />
              </p>
              <p className="text-xs font-body text-muted-foreground mt-2">
                out of <span className="text-gold">{totalCapacity.toLocaleString()}</span> available
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {tiers.map((t) => {
                const rawLeft = Math.max(0, t.quantity_total - t.quantity_sold);
                const tierSoldOut = t.homepage_force_soldout || rawLeft === 0;
                const unit = t.is_table_tier ? Math.max(1, t.seats_per_table) : 1;
                const left = Math.floor(rawLeft / unit);
                const sold = Math.floor(t.quantity_sold / unit);
                const total = Math.floor(t.quantity_total / unit);
                const unitLabel = t.is_table_tier ? (left === 1 ? "table" : "tables") : "left";
                const lowStock = !tierSoldOut && rawLeft > 0 && rawLeft < t.quantity_total * 0.2;
                const displayName = t.homepage_label || t.name;
                return (
                  <motion.div
                    key={t.id}
                    animate={lowStock ? { boxShadow: ["0 0 0 0 hsl(var(--gold)/0)", "0 0 18px 2px hsl(var(--gold)/0.45)", "0 0 0 0 hsl(var(--gold)/0)"] } : undefined}
                    transition={lowStock ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : undefined}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-body
                      ${tierSoldOut
                        ? "border-destructive/40 bg-destructive/5"
                        : lowStock
                          ? "border-gold/40 bg-gold/5"
                          : "border-gold/15 bg-surface"}`}
                  >
                    <span className="text-foreground/90 truncate">{displayName}</span>
                    {tierSoldOut ? (
                      <span className="text-destructive font-semibold uppercase tracking-wider text-[10px]">Sold Out</span>
                    ) : (t.homepage_show_sold || t.homepage_show_remaining) ? (
                      <span className={`font-mono ${lowStock ? "text-gold" : "text-muted-foreground"}`}>
                        {t.homepage_show_sold && t.homepage_show_remaining
                          ? `${sold}/${total}${t.is_table_tier ? ` ${unitLabel}` : ""}`
                          : t.homepage_show_sold
                            ? `${sold} sold${t.is_table_tier ? ` ${unitLabel}` : ""}`
                            : `${left} ${unitLabel}`}
                      </span>
                    ) : null}
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default LiveTicketStats;