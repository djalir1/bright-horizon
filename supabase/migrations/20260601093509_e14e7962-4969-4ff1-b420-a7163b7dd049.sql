INSERT INTO public.settings (key, value) VALUES
  ('receipts_enabled',   'false'),
  ('tickets_enabled',    'false'),
  ('momo_number',        ''),
  ('momo_account_name',  '')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS momo_name text;

CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_at
  ON public.scan_logs(scanned_at DESC);