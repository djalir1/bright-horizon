
-- Wipe operational data
TRUNCATE TABLE public.transactions, public.payments, public.scan_logs, public.agent_logs RESTART IDENTITY CASCADE;
DELETE FROM public.users;
DELETE FROM public.codes;

-- Ticket tiers table
CREATE TABLE IF NOT EXISTS public.ticket_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price integer NOT NULL,
  quantity_total integer NOT NULL DEFAULT 0,
  quantity_sold integer NOT NULL DEFAULT 0,
  description text,
  perks jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tiers" ON public.ticket_tiers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tiers" ON public.ticket_tiers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tiers" ON public.ticket_tiers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete tiers" ON public.ticket_tiers FOR DELETE USING (true);

DROP TRIGGER IF EXISTS trg_tiers_updated ON public.ticket_tiers;
CREATE TRIGGER trg_tiers_updated BEFORE UPDATE ON public.ticket_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add tier link to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tier_id uuid REFERENCES public.ticket_tiers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_tier ON public.users(tier_id);

-- Seed default tiers
INSERT INTO public.ticket_tiers (name, price, quantity_total, description, perks, sort_order) VALUES
('Founder Ticket', 18000, 50, 'Limited early-bird ticket — for the first 50 supporters.',
 '["Full event entry and dinner","Name on the Founder Wall at the event","Priority entry — skip the queue","Founder badge on digital ticket","Lock in 7,000 RWF off the public price"]'::jsonb, 1),
('General Admission', 25000, 200, 'Standard ticket — full event experience.',
 '["Full event entry and dinner","Access to all entertainment and dance floor","Photo booth access","Digital ticket via MoMo confirmation"]'::jsonb, 2),
('VIP Table (per seat)', 35000, 40, 'Reserved table for 8 — premium experience.',
 '["Reserved front table","3-course plated dinner","Welcome drink on arrival","Priority red carpet entry","VIP photo zone access","MC table recognition"]'::jsonb, 3);

-- Auto-increment quantity_sold when a payment is approved
CREATE OR REPLACE FUNCTION public.increment_tier_sold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_tier_id uuid;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT tier_id INTO v_tier_id FROM public.users WHERE id = NEW.user_id;
    IF v_tier_id IS NOT NULL THEN
      UPDATE public.ticket_tiers SET quantity_sold = quantity_sold + 1 WHERE id = v_tier_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_tier_sold_increment ON public.payments;
CREATE TRIGGER trg_tier_sold_increment AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.increment_tier_sold();
