import { Check } from "lucide-react";
import soldOutStamp from "@/assets/sold-out.png";

export type Tier = {
  id: string;
  name: string;
  price: number;
  quantity_total: number;
  quantity_sold: number;
  description: string | null;
  perks: string[];
  sort_order: number;
  is_active: boolean;
};

export const isSoldOut = (t: Tier) => t.quantity_sold >= t.quantity_total;
export const spotsLeft = (t: Tier) => Math.max(0, t.quantity_total - t.quantity_sold);

interface Props {
  tiers: Tier[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const TierCards = ({ tiers, selectedId, onSelect }: Props) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {tiers.map((t) => {
        const soldOut = isSoldOut(t);
        const left = spotsLeft(t);
        const showLow = !soldOut && left < t.quantity_total * 0.3;
        const selected = selectedId === t.id;
        return (
          <button
            key={t.id}
            type="button"
            disabled={soldOut}
            onClick={() => !soldOut && onSelect(t.id)}
            className={`relative text-left rounded-xl p-5 transition-all border bg-surface-2 overflow-hidden
              ${soldOut
                ? "opacity-50 cursor-not-allowed border-gold/10"
                : selected
                  ? "border-gold border-2 shadow-[0_0_30px_-8px_hsl(var(--gold)/0.5)]"
                  : "border-gold/20 hover:border-gold/50"}
            `}
          >
            {soldOut && (
              <img
                src={soldOutStamp}
                alt="Sold out"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 max-w-[180px] rotate-[-12deg] pointer-events-none z-10 drop-shadow-lg"
              />
            )}
            <h3 className="font-display text-xl text-gold mb-1">{t.name}</h3>
            <p className="font-display text-3xl font-bold text-gold mb-1">{t.price.toLocaleString()} <span className="text-sm font-body font-normal text-muted-foreground">RWF</span></p>
            {showLow && (
              <p className="text-xs text-gold/90 font-body mb-2">Only {left} spots left</p>
            )}
            {soldOut && (
              <p className="text-xs text-destructive font-body mb-2 uppercase tracking-wider font-semibold">Sold out</p>
            )}
            {t.description && (
              <p className="text-xs text-muted-foreground font-body mb-3 leading-relaxed">{t.description}</p>
            )}
            <ul className="space-y-1.5 mb-4">
              {t.perks.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/80 font-body">
                  <Check size={12} className="text-gold mt-0.5 flex-shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <div className={`w-full py-2 text-center rounded-lg text-sm font-body font-semibold transition-colors
              ${soldOut
                ? "bg-surface text-muted-foreground"
                : selected
                  ? "bg-gold text-background"
                  : "bg-gold/10 text-gold"}`}
            >
              {soldOut ? "Sold Out" : selected ? "Selected" : "Select"}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default TierCards;