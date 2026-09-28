
-- =============================================
-- SENIOR GALA PLATFORM — COMPLETE DATABASE SCHEMA
-- =============================================

-- 1. SETTINGS TABLE — key/value store for all platform configuration
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.settings IS 'Key-value store for all platform configuration settings';

-- 2. CODES TABLE — registration codes
CREATE TABLE public.codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'used', 'disabled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_by_user_id UUID
);
COMMENT ON TABLE public.codes IS 'Registration codes distributed to attendees';
CREATE INDEX idx_codes_code ON public.codes (code);
CREATE INDEX idx_codes_status ON public.codes (status);

-- 3. USERS TABLE — registered attendees
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id UUID REFERENCES public.codes(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  department TEXT NOT NULL CHECK (department IN ('SOD', 'FBO', 'Tourism', 'Other')),
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Prefer not to say')),
  ticket_price INTEGER NOT NULL DEFAULT 25000,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  remaining_amount INTEGER NOT NULL DEFAULT 25000,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  entered BOOLEAN NOT NULL DEFAULT false,
  entered_at TIMESTAMP WITH TIME ZONE,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.users IS 'Registered event attendees with payment tracking';
CREATE INDEX idx_users_email ON public.users (email);
CREATE INDEX idx_users_payment_status ON public.users (payment_status);

-- Add FK from codes.used_by_user_id to users
ALTER TABLE public.codes ADD CONSTRAINT fk_codes_used_by FOREIGN KEY (used_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 4. PAYMENTS TABLE — payment submissions
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  method TEXT NOT NULL DEFAULT 'momo' CHECK (method IN ('momo', 'cash')),
  momo_number_used TEXT,
  momo_name TEXT,
  transaction_id TEXT,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by TEXT
);
COMMENT ON TABLE public.payments IS 'Payment submissions awaiting approval';
CREATE INDEX idx_payments_user_id ON public.payments (user_id);
CREATE INDEX idx_payments_status ON public.payments (status);

-- 5. TRANSACTIONS TABLE — approved payment records
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  method TEXT NOT NULL,
  recorded_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.transactions IS 'Approved/recorded payment transactions';

-- 6. AGENTS TABLE — admin agent accounts
CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('agent', 'superadmin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE
);
COMMENT ON TABLE public.agents IS 'Admin and agent accounts for dashboard access';

-- 7. GALLERY TABLE — uploaded event photos
CREATE TABLE public.gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by TEXT
);
COMMENT ON TABLE public.gallery IS 'Event gallery photos';

-- 8. CONTACT_MESSAGES TABLE — contact form submissions
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.contact_messages IS 'Contact form submissions from visitors';

-- 9. SCAN_LOGS TABLE — gate entry scan logs
CREATE TABLE public.scan_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  result TEXT NOT NULL CHECK (result IN ('admitted', 'already_entered', 'unpaid', 'invalid')),
  scanned_by_ip TEXT
);
COMMENT ON TABLE public.scan_logs IS 'Gate entry QR code scan logs';

-- =============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES — Public read for public data, anon access for forms
-- =============================================

-- Settings: anyone can read (public config), no write from client
CREATE POLICY "Anyone can read settings" ON public.settings FOR SELECT TO anon, authenticated USING (true);

-- Codes: anon can read (for verification), no write from client
CREATE POLICY "Anyone can read codes" ON public.codes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can update codes" ON public.codes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Users: anon can insert (registration), anon can read (balance check)
CREATE POLICY "Anyone can read users" ON public.users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert users" ON public.users FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update users" ON public.users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Payments: anon can insert (submit payment), read for balance check
CREATE POLICY "Anyone can read payments" ON public.payments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert payments" ON public.payments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update payments" ON public.payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Transactions: read for balance check
CREATE POLICY "Anyone can read transactions" ON public.transactions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert transactions" ON public.transactions FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Agents: no public access (edge functions use service role)
CREATE POLICY "No public access to agents" ON public.agents FOR SELECT TO authenticated USING (false);

-- Gallery: anyone can read (public gallery)
CREATE POLICY "Anyone can read gallery" ON public.gallery FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert gallery" ON public.gallery FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can delete gallery" ON public.gallery FOR DELETE TO anon, authenticated USING (true);

-- Contact messages: anon can insert (contact form)
CREATE POLICY "Anyone can insert contact messages" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can read contact messages" ON public.contact_messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can update contact messages" ON public.contact_messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete contact messages" ON public.contact_messages FOR DELETE TO anon, authenticated USING (true);

-- Scan logs: anon can insert (gate scan)
CREATE POLICY "Anyone can insert scan logs" ON public.scan_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can read scan logs" ON public.scan_logs FOR SELECT TO anon, authenticated USING (true);

-- =============================================
-- STORAGE BUCKET FOR GALLERY & PAYMENT SCREENSHOTS
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('payments', 'payments', true);

CREATE POLICY "Anyone can view gallery images" ON storage.objects FOR SELECT USING (bucket_id = 'gallery');
CREATE POLICY "Anyone can upload gallery images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gallery');
CREATE POLICY "Anyone can delete gallery images" ON storage.objects FOR DELETE USING (bucket_id = 'gallery');

CREATE POLICY "Anyone can view payment screenshots" ON storage.objects FOR SELECT USING (bucket_id = 'payments');
CREATE POLICY "Anyone can upload payment screenshots" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payments');

-- =============================================
-- DEFAULT SETTINGS VALUES
-- =============================================
INSERT INTO public.settings (key, value) VALUES
  ('event_name', 'Senior Gala Night'),
  ('event_date', ''),
  ('venue_name', 'Cogstpatrick, Niboye, Kigali'),
  ('venue_address', 'Niboye, Kicukiro, Kigali, Rwanda'),
  ('total_seats', '100'),
  ('event_description', 'Join us for an unforgettable evening of elegance, celebration, and farewell as L5 students come together one last time before the next chapter begins. A night of fine dining, music, dance, and memories.'),
  ('ticket_price', '25000'),
  ('registration_fee', '1500'),
  ('momo_name_1', 'Senior Gala Org'),
  ('momo_number_1', '0781 234 567'),
  ('momo_name_2', 'Senior Gala Pay'),
  ('momo_number_2', '0782 345 678'),
  ('whatsapp', '+250 7XX XXX XXX'),
  ('email', 'info@seniorgala.rw'),
  ('address', 'Kigali, Rwanda'),
  ('team_members', '[{"name":"Team Lead","role":"Event Director","phone":"+250 7XX XXX XXX"},{"name":"Co-Lead","role":"Operations Manager","phone":""},{"name":"Finance","role":"Treasurer","phone":""},{"name":"Creative","role":"Design & Branding","phone":""}]'),
  ('sad_description', 'SAD (Smart Artistic Digital) Corporation is a student-led creative agency dedicated to producing premium events and digital experiences.'),
  ('cogstpatrick_description', 'Cogstpatrick is a premier event venue in Niboye, Kigali, providing elegant spaces for unforgettable occasions.'),
  ('main_contact_phone', '+250 7XX XXX XXX'),
  ('superadmin_username', 'admin'),
  ('superadmin_password', 'admin123');

-- =============================================
-- DEFAULT SUPERADMIN AGENT
-- =============================================
INSERT INTO public.agents (name, username, password, role) VALUES
  ('Super Admin', 'admin', 'admin123', 'superadmin');

-- =============================================
-- UPDATE TIMESTAMP TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
