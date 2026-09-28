
-- Create schools table
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  prefix text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.schools IS 'Schools registered for Senior Gala';
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read schools" ON public.schools FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert schools" ON public.schools FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update schools" ON public.schools FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete schools" ON public.schools FOR DELETE TO anon, authenticated USING (true);

-- Add school_id to codes table
ALTER TABLE public.codes ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

-- Add new columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS school_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS level text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS section text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS student_id_url text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending_verification';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Add published column to gallery
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_codes_school_id ON public.codes(school_id);
CREATE INDEX IF NOT EXISTS idx_users_school_id ON public.users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON public.users(verification_status);

-- Insert default schools
INSERT INTO public.schools (name, prefix) VALUES
  ('ESPAREC', 'ESP'),
  ('GS Kacyiru', 'GSK'),
  ('IPRC Kigali', 'IPR'),
  ('ES Remera', 'ESR'),
  ('Apela', 'APL'),
  ('FAWE Girls', 'FAW'),
  ('Riviera High School', 'RIV'),
  ('Other', 'OTH')
ON CONFLICT (prefix) DO NOTHING;

-- Insert new settings keys
INSERT INTO public.settings (key, value) VALUES
  ('show_seats_counter', 'true'),
  ('seats_refresh_interval', 'page_load'),
  ('total_seats', '100')
ON CONFLICT (key) DO NOTHING;

-- Create student-ids storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('student-ids', 'student-ids', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for student-ids bucket
CREATE POLICY "Anyone can upload student ids" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'student-ids');
CREATE POLICY "Anyone can read student ids" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'student-ids');
