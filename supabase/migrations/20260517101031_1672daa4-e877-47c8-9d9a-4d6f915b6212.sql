ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS exited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exited_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_users_entered ON public.users(entered);
CREATE INDEX IF NOT EXISTS idx_users_exited ON public.users(exited);
CREATE INDEX IF NOT EXISTS idx_codes_code ON public.codes(code);