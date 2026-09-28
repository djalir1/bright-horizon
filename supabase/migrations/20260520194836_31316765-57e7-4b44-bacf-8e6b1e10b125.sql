-- Ensure settings.key is unique so we can upsert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'settings_key_unique'
  ) THEN
    ALTER TABLE public.settings ADD CONSTRAINT settings_key_unique UNIQUE (key);
  END IF;
END $$;

-- scan_logs: add gate, scanned code, staff identifiers
ALTER TABLE public.scan_logs ADD COLUMN IF NOT EXISTS gate text NOT NULL DEFAULT 'entry';
ALTER TABLE public.scan_logs ADD COLUMN IF NOT EXISTS scanned_code text;
ALTER TABLE public.scan_logs ADD COLUMN IF NOT EXISTS scanned_by_user_id uuid;
ALTER TABLE public.scan_logs ADD COLUMN IF NOT EXISTS scanned_by_email text;
CREATE INDEX IF NOT EXISTS idx_scan_logs_gate ON public.scan_logs(gate);
CREATE INDEX IF NOT EXISTS idx_scan_logs_result ON public.scan_logs(result);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_at ON public.scan_logs(scanned_at DESC);

-- refunds table
CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  original_amount integer NOT NULL,
  momo_fee integer NOT NULL DEFAULT 0,
  refund_amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  refund_method text DEFAULT 'momo',
  refund_phone text,
  reason text DEFAULT 'event_cancelled',
  processed_by_email text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read refunds" ON public.refunds;
DROP POLICY IF EXISTS "Anyone can insert refunds" ON public.refunds;
DROP POLICY IF EXISTS "Anyone can update refunds" ON public.refunds;
DROP POLICY IF EXISTS "Anyone can delete refunds" ON public.refunds;

CREATE POLICY "Anyone can read refunds" ON public.refunds FOR SELECT USING (true);
CREATE POLICY "Anyone can insert refunds" ON public.refunds FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update refunds" ON public.refunds FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete refunds" ON public.refunds FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_refunds_user ON public.refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);

-- Seed settings rows
INSERT INTO public.settings (key, value) VALUES
  ('qr_secret', encode(gen_random_bytes(16), 'hex')),
  ('event_status', 'active')
ON CONFLICT (key) DO NOTHING;