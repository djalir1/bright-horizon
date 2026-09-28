ALTER TABLE public.ticket_tiers
  ADD COLUMN IF NOT EXISTS homepage_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS homepage_show_sold boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS homepage_show_remaining boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS homepage_force_soldout boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS homepage_label text,
  ADD COLUMN IF NOT EXISTS is_table_tier boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seats_per_table integer NOT NULL DEFAULT 1;