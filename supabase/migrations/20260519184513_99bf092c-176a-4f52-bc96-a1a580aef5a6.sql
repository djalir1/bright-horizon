
-- Code type (student vs general)
ALTER TABLE public.codes ADD COLUMN IF NOT EXISTS code_type text NOT NULL DEFAULT 'student';
ALTER TABLE public.codes ADD CONSTRAINT codes_code_type_check CHECK (code_type IN ('student','general'));
CREATE INDEX IF NOT EXISTS idx_codes_type ON public.codes(code_type);

-- Ticket printing tracking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ticket_printed boolean NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ticket_printed_at timestamptz;

-- Print logs
CREATE TABLE IF NOT EXISTS public.ticket_print_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  print_type text NOT NULL DEFAULT 'original',
  reason text,
  printed_by_email text,
  is_admin_reprint boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ticket_print_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read print logs" ON public.ticket_print_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert print logs" ON public.ticket_print_logs FOR INSERT WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_print_logs_user ON public.ticket_print_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_print_logs_created ON public.ticket_print_logs(created_at DESC);
