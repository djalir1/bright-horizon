ALTER TABLE public.codes
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS fee_amount integer NOT NULL DEFAULT 1500;

CREATE INDEX IF NOT EXISTS idx_codes_created_by ON public.codes(created_by);
CREATE INDEX IF NOT EXISTS idx_codes_payment_method ON public.codes(payment_method);
