import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Tier = {
  id: string;
  name: string;
  price: number;
  quantity_total: number;
  quantity_sold: number;
  description: string | null;
  perks: string[];
  sort_order: number;
  is_active: boolean;
  homepage_visible: boolean;
  homepage_show_sold: boolean;
  homepage_show_remaining: boolean;
  homepage_force_soldout: boolean;
  homepage_label: string | null;
  is_table_tier: boolean;
  seats_per_table: number;
};

const blankTier = (): Partial<Tier> => ({
  name: "New Tier",
  price: 25000,
  quantity_total: 50,
  quantity_sold: 0,
  description: "",
  perks: [],
  sort_order: 99,
  is_active: true,
  homepage_visible: true,
  homepage_show_sold: true,
  homepage_show_remaining: true,
  homepage_force_soldout: false,
  homepage_label: null,
  is_table_tier: false,
  seats_per_table: 1,
});

const TicketTiersAdmin = () => {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('ticket_tiers').select('*').order('sort_order');
    setTiers((data || []).map((t: any) => ({ ...t, perks: Array.isArray(t.perks) ? t.perks : [] })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const updateLocal = (id: string, patch: Partial<Tier>) =>
    setTiers(tiers.map(t => t.id === id ? { ...t, ...patch } : t));

  const save = async (t: Tier) => {
    setSaving(t.id);
    const { error } = await supabase.from('ticket_tiers').update({
      name: t.name, price: t.price, quantity_total: t.quantity_total,
      description: t.description, perks: t.perks, sort_order: t.sort_order, is_active: t.is_active,
      homepage_visible: t.homepage_visible,
      homepage_show_sold: t.homepage_show_sold,
      homepage_show_remaining: t.homepage_show_remaining,
      homepage_force_soldout: t.homepage_force_soldout,
      homepage_label: t.homepage_label,
      is_table_tier: t.is_table_tier,
      seats_per_table: t.seats_per_table,
    }).eq('id', t.id);
    setSaving(null);
    if (error) toast.error("Save failed"); else toast.success(`${t.name} saved`);
  };

  const remove = async (t: Tier) => {
    if (!confirm(`Delete tier "${t.name}"?`)) return;
    const { error } = await supabase.from('ticket_tiers').delete().eq('id', t.id);
    if (error) toast.error("Delete failed"); else { toast.success("Tier deleted"); load(); }
  };

  const add = async () => {
    const { error } = await supabase.from('ticket_tiers').insert(blankTier() as any);
    if (error) toast.error("Failed to add"); else { toast.success("Tier added"); load(); }
  };

  const updatePerk = (tierId: string, idx: number, value: string) => {
    const t = tiers.find(x => x.id === tierId); if (!t) return;
    const perks = [...t.perks]; perks[idx] = value;
    updateLocal(tierId, { perks });
  };
  const addPerk = (tierId: string) => {
    const t = tiers.find(x => x.id === tierId); if (!t) return;
    updateLocal(tierId, { perks: [...t.perks, ""] });
  };
  const removePerk = (tierId: string, idx: number) => {
    const t = tiers.find(x => x.id === tierId); if (!t) return;
    updateLocal(tierId, { perks: t.perks.filter((_, i) => i !== idx) });
  };

  if (loading) return <p className="text-muted-foreground text-sm">Loading tiers...</p>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Manage ticket tiers. Sold count updates automatically when payments are approved.</p>
      {tiers.map(t => {
        const left = Math.max(0, t.quantity_total - t.quantity_sold);
        const soldOut = t.quantity_sold >= t.quantity_total;
        const revenue = t.quantity_sold * t.price;
        return (
          <div key={t.id} className="bg-surface-2 border border-gold/15 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <input value={t.name} onChange={(e) => updateLocal(t.id, { name: e.target.value })}
                className="flex-1 min-w-[200px] px-3 py-2 bg-background border border-gold/20 rounded text-foreground font-display text-lg focus:outline-none focus:border-gold/60" />
              {soldOut && <span className="text-xs px-2 py-1 rounded bg-destructive/15 text-destructive font-semibold uppercase">Sold Out</span>}
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" checked={t.is_active} onChange={(e) => updateLocal(t.id, { is_active: e.target.checked })} className="accent-gold w-4 h-4" /> Active
              </label>
              <button onClick={() => remove(t)} className="p-2 text-destructive hover:bg-destructive/10 rounded"><Trash2 size={14} /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <label className="block">
                <span className="text-muted-foreground">Price (RWF)</span>
                <input type="number" value={t.price} onChange={(e) => updateLocal(t.id, { price: parseInt(e.target.value) || 0 })}
                  className="w-full mt-1 px-2 py-1.5 bg-background border border-gold/20 rounded text-foreground focus:outline-none focus:border-gold/60" />
              </label>
              <label className="block">
                <span className="text-muted-foreground">Quantity total</span>
                <input type="number" value={t.quantity_total} onChange={(e) => updateLocal(t.id, { quantity_total: parseInt(e.target.value) || 0 })}
                  className="w-full mt-1 px-2 py-1.5 bg-background border border-gold/20 rounded text-foreground focus:outline-none focus:border-gold/60" />
              </label>
              <label className="block">
                <span className="text-muted-foreground">Sort order</span>
                <input type="number" value={t.sort_order} onChange={(e) => updateLocal(t.id, { sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full mt-1 px-2 py-1.5 bg-background border border-gold/20 rounded text-foreground focus:outline-none focus:border-gold/60" />
              </label>
              <div className="block">
                <span className="text-muted-foreground">Sold / Remaining</span>
                <p className="mt-1 px-2 py-1.5 bg-background border border-gold/10 rounded text-gold font-mono">{t.quantity_sold} / {left}</p>
              </div>
            </div>
            <textarea value={t.description || ''} onChange={(e) => updateLocal(t.id, { description: e.target.value })} rows={2}
              placeholder="Description"
              className="w-full px-3 py-2 bg-background border border-gold/20 rounded text-foreground text-sm focus:outline-none focus:border-gold/60 resize-none" />
            <div className="border-t border-gold/10 pt-3">
              <p className="text-[11px] uppercase tracking-widest text-gold/70 font-body mb-2">Homepage display</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs mb-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={t.homepage_visible} onChange={(e) => updateLocal(t.id, { homepage_visible: e.target.checked })} className="accent-gold w-4 h-4" /> Visible on homepage
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={t.homepage_show_sold} onChange={(e) => updateLocal(t.id, { homepage_show_sold: e.target.checked })} className="accent-gold w-4 h-4" /> Show sold count
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={t.homepage_show_remaining} onChange={(e) => updateLocal(t.id, { homepage_show_remaining: e.target.checked })} className="accent-gold w-4 h-4" /> Show remaining
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={t.homepage_force_soldout} onChange={(e) => updateLocal(t.id, { homepage_force_soldout: e.target.checked })} className="accent-gold w-4 h-4" /> Force SOLD OUT
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={t.is_table_tier} onChange={(e) => updateLocal(t.id, { is_table_tier: e.target.checked })} className="accent-gold w-4 h-4" /> Sold as tables
                </label>
                {t.is_table_tier && (
                  <label className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Seats/table</span>
                    <input type="number" min={1} value={t.seats_per_table} onChange={(e) => updateLocal(t.id, { seats_per_table: parseInt(e.target.value) || 1 })}
                      className="w-16 px-2 py-1 bg-background border border-gold/20 rounded text-foreground focus:outline-none focus:border-gold/60" />
                  </label>
                )}
              </div>
              <label className="block text-xs">
                <span className="text-muted-foreground">Custom homepage label (optional)</span>
                <input value={t.homepage_label || ''} onChange={(e) => updateLocal(t.id, { homepage_label: e.target.value || null })}
                  placeholder="e.g. Only a few tables left"
                  className="w-full mt-1 px-2 py-1.5 bg-background border border-gold/20 rounded text-foreground focus:outline-none focus:border-gold/60" />
              </label>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Perks</p>
              <div className="space-y-1.5">
                {t.perks.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={p} onChange={(e) => updatePerk(t.id, i, e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-background border border-gold/20 rounded text-foreground text-sm focus:outline-none focus:border-gold/60" />
                    <button onClick={() => removePerk(t.id, i)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded"><Trash2 size={12} /></button>
                  </div>
                ))}
                <button onClick={() => addPerk(t.id)} className="text-xs text-gold hover:text-gold-light flex items-center gap-1"><Plus size={12} /> Add perk</button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Revenue: <span className="text-gold font-semibold">{revenue.toLocaleString()} RWF</span></p>
              <button onClick={() => save(t)} disabled={saving === t.id}
                className="px-3 py-1.5 bg-gold text-background text-sm rounded font-semibold hover:bg-gold-light flex items-center gap-1.5 disabled:opacity-50">
                {saving === t.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
              </button>
            </div>
          </div>
        );
      })}
      <button onClick={add} className="text-sm px-3 py-2 rounded bg-gold/10 text-gold hover:bg-gold/20 flex items-center gap-1">
        <Plus size={14} /> Add Tier
      </button>
    </div>
  );
};

export default TicketTiersAdmin;