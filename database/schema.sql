-- ============================================================================
-- SENIOR GALA KIGALI 2026 — Full Supabase setup script
-- ============================================================================
-- HOW TO USE
--   1. Create a brand-new Supabase project.
--   2. Open  Dashboard -> SQL Editor -> New query.
--   3. Paste THIS ENTIRE FILE and click "Run". It is idempotent (safe to
--      re-run; uses IF NOT EXISTS / DROP POLICY IF EXISTS everywhere).
--   4. Dashboard -> Storage -> create THREE PUBLIC buckets (exact names):
--        gallery, payments, student-ids
--      (Section 9 below also creates them via SQL if you skip this.)
--   5. Dashboard -> Authentication -> Providers -> Email:
--        - Enable email provider
--        - DISABLE "Confirm email"   (staff created by admins)
--        - DISABLE "Enable sign ups" (only admins create accounts)
--   6. Create the FIRST staff user — see "FIRST USER" section at the very
--      bottom of this file. The first user ever inserted is auto-promoted
--      to `superadmin` by the handle_new_user() trigger.
--
-- RLS POLICY  (RLS is ENABLED on every table)
--   Permissive  (anon + authenticated read/write): schools, ticket_tiers,
--     codes, users, payments, agent_logs, contact_messages, settings, agents.
--     The app enforces authorization in React + edge functions.
--   Locked down:
--     - profiles            owner-only UPDATE; read by any authenticated user
--     - user_roles          only superadmins can INSERT/UPDATE/DELETE
--     - transactions        append-only (SELECT + INSERT only)
--     - scan_logs           append-only (SELECT + INSERT only)
--     - ticket_print_logs   append-only (SELECT + INSERT only)
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1) EXTENSIONS + ROLE ENUM
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('superadmin', 'agent', 'door_in', 'door_out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2) SHARED HELPERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3) AUTH TABLES (profiles + user_roles)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  email       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.app_role NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Trigger: new auth user -> create profile; first ever user becomes superadmin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE has_super boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'superadmin') INTO has_super;
  IF NOT has_super THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'superadmin');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─────────────────────────────────────────────────────────────────────────────
-- 4) DOMAIN TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- 4.1 Schools
CREATE TABLE IF NOT EXISTS public.schools (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  prefix      text NOT NULL UNIQUE,
  status      text NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 4.2 Ticket tiers (Student / VIP table / General etc.)
CREATE TABLE IF NOT EXISTS public.ticket_tiers (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     text NOT NULL,
  description              text,
  price                    integer NOT NULL,
  quantity_total           integer NOT NULL DEFAULT 0,
  quantity_sold            integer NOT NULL DEFAULT 0,
  perks                    jsonb   NOT NULL DEFAULT '[]'::jsonb,
  sort_order               integer NOT NULL DEFAULT 0,
  is_active                boolean NOT NULL DEFAULT true,
  homepage_visible         boolean NOT NULL DEFAULT true,
  homepage_show_sold       boolean NOT NULL DEFAULT true,
  homepage_show_remaining  boolean NOT NULL DEFAULT true,
  homepage_force_soldout   boolean NOT NULL DEFAULT false,
  homepage_label           text,
  is_table_tier            boolean NOT NULL DEFAULT false,
  seats_per_table          integer NOT NULL DEFAULT 1,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- 4.3 Codes
CREATE TABLE IF NOT EXISTS public.codes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text NOT NULL UNIQUE,
  code_type        text NOT NULL DEFAULT 'student',   -- 'student' | 'general'
  status           text NOT NULL DEFAULT 'unused',    -- 'unused' | 'used' | 'disabled'
  school_id        uuid REFERENCES public.schools(id),
  used_by_user_id  uuid,                              -- FK added after users table
  payment_method   text,                              -- 'cash' | 'momo'
  fee_amount       integer NOT NULL DEFAULT 1500,
  created_by       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 4.4 Users (registrations)
CREATE TABLE IF NOT EXISTS public.users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id           uuid REFERENCES public.codes(id) ON DELETE SET NULL,
  tier_id           uuid REFERENCES public.ticket_tiers(id),
  first_name        text NOT NULL,
  last_name         text NOT NULL,
  email             text NOT NULL,
  phone             text NOT NULL,
  school_id         uuid REFERENCES public.schools(id),
  school_name       text,
  department        text NOT NULL,
  level             text,
  section           text,
  gender            text NOT NULL,
  ticket_price      integer NOT NULL DEFAULT 25000,
  paid_amount       integer NOT NULL DEFAULT 0,
  remaining_amount  integer NOT NULL DEFAULT 25000,
  payment_status    text    NOT NULL DEFAULT 'unpaid',
  ticket_printed    boolean NOT NULL DEFAULT false,
  ticket_printed_at timestamptz,
  entered           boolean NOT NULL DEFAULT false,
  entered_at        timestamptz,
  exited            boolean NOT NULL DEFAULT false,
  exited_at         timestamptz,
  registered_at     timestamptz NOT NULL DEFAULT now()
);

-- Reciprocal FK on codes.used_by_user_id (now that users exists)
DO $$ BEGIN
  ALTER TABLE public.codes
    ADD CONSTRAINT fk_codes_used_by FOREIGN KEY (used_by_user_id)
    REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4.5 Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount            integer NOT NULL,
  method            text NOT NULL DEFAULT 'momo',
  momo_number_used  text,
  momo_name         text,
  transaction_id    text,
  screenshot_url    text,
  status            text NOT NULL DEFAULT 'pending',
  rejection_reason  text,
  submitted_at      timestamptz NOT NULL DEFAULT now(),
  reviewed_at       timestamptz,
  reviewed_by       text
);

-- 4.6 Transactions (append-only)
CREATE TABLE IF NOT EXISTS public.transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  payment_id   uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  amount       integer NOT NULL,
  method       text NOT NULL,
  recorded_by  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 4.7 Scan logs (append-only)
CREATE TABLE IF NOT EXISTS public.scan_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  result         text NOT NULL,
  scanned_by_ip  text,
  scanned_at     timestamptz NOT NULL DEFAULT now()
);

-- 4.8 Agent / admin audit log
CREATE TABLE IF NOT EXISTS public.agent_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name   text NOT NULL,
  agent_role   text NOT NULL,
  action       text NOT NULL,
  target_type  text,
  target_id    text,
  details      text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 4.9 Ticket print logs (append-only)
CREATE TABLE IF NOT EXISTS public.ticket_print_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL,
  print_type        text NOT NULL DEFAULT 'original',
  is_admin_reprint  boolean NOT NULL DEFAULT false,
  printed_by_email  text,
  reason            text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 4.10 Contact messages
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL,
  message     text NOT NULL,
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 4.11 Global settings (key/value)
CREATE TABLE IF NOT EXISTS public.settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,
  value       text NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 4.12 Legacy agents table (kept for compatibility; not used by UI)
CREATE TABLE IF NOT EXISTS public.agents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  username    text NOT NULL UNIQUE,
  password    text NOT NULL,
  role        text NOT NULL DEFAULT 'agent',
  status      text NOT NULL DEFAULT 'active',
  last_login  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5) INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_codes_code             ON public.codes(code);
CREATE INDEX IF NOT EXISTS idx_codes_status           ON public.codes(status);
CREATE INDEX IF NOT EXISTS idx_codes_school_id        ON public.codes(school_id);
CREATE INDEX IF NOT EXISTS idx_codes_school_status    ON public.codes(school_id, status);
CREATE INDEX IF NOT EXISTS idx_codes_created_by       ON public.codes(created_by);
CREATE INDEX IF NOT EXISTS idx_codes_payment_method   ON public.codes(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_user_id       ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status        ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_users_email            ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_school_id        ON public.users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_payment_status   ON public.users(payment_status);
CREATE INDEX IF NOT EXISTS idx_contact_read           ON public.contact_messages(read);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id     ON public.user_roles(user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 6) APP TRIGGER — increment tier sold count when a payment is approved
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_tier_sold()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tier_id uuid;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT tier_id INTO v_tier_id FROM public.users WHERE id = NEW.user_id;
    IF v_tier_id IS NOT NULL THEN
      UPDATE public.ticket_tiers
         SET quantity_sold = quantity_sold + 1
       WHERE id = v_tier_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_increment_tier_sold ON public.payments;
CREATE TRIGGER trg_increment_tier_sold
  AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.increment_tier_sold();


-- ─────────────────────────────────────────────────────────────────────────────
-- 7) ROW LEVEL SECURITY — enable on every table
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_tiers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_print_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents            ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8) POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- 8.1 profiles — owner-only updates
DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;
CREATE POLICY "Profiles readable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 8.2 user_roles — superadmins only
DROP POLICY IF EXISTS "Roles readable by authenticated" ON public.user_roles;
CREATE POLICY "Roles readable by authenticated" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Superadmins manage roles" ON public.user_roles;
CREATE POLICY "Superadmins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- 8.3 Permissive read/write for operational tables (app enforces auth)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'schools','ticket_tiers','codes','users','payments','agent_logs',
    'contact_messages','settings','agents'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can read %1$s" ON public.%1$I',   t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can insert %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can update %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can delete %1$s" ON public.%1$I', t);

    EXECUTE format('CREATE POLICY "Anyone can read %1$s"   ON public.%1$I FOR SELECT  TO anon, authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "Anyone can insert %1$s" ON public.%1$I FOR INSERT  TO anon, authenticated WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "Anyone can update %1$s" ON public.%1$I FOR UPDATE  TO anon, authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "Anyone can delete %1$s" ON public.%1$I FOR DELETE  TO anon, authenticated USING (true)', t);
  END LOOP;
END $$;

-- 8.4 Append-only ledgers
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['transactions','scan_logs','ticket_print_logs'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can read %1$s"   ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can insert %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Anyone can read %1$s"   ON public.%1$I FOR SELECT TO anon, authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "Anyone can insert %1$s" ON public.%1$I FOR INSERT TO anon, authenticated WITH CHECK (true)', t);
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9) STORAGE BUCKETS  (also create via dashboard in step 4)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES
  ('gallery',     'gallery',     true),
  ('payments',    'payments',    true),
  ('student-ids', 'student-ids', true)
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10) SEED DATA — prices, tiers, schools, settings
--     (Registrations / payments / codes are NOT seeded.)
-- ─────────────────────────────────────────────────────────────────────────────

-- 10.1 Settings
INSERT INTO public.settings (key, value) VALUES
  ('event_name',              'Senior Gala Kigali 2026'),
  ('event_date',              '2026-08-15T18:00:00+02:00'),
  ('event_description',       'The celebration evening for S6 (REB) and L5 (TVET) finalists.'),
  ('venue_name',              ''),
  ('venue_address',           ''),
  ('venue_confirmed',         'false'),
  ('ticket_price',            '25000'),
  ('registration_fee',        '1500'),
  ('total_seats',             '1000'),
  ('show_seats_counter',      'true'),
  ('seats_refresh_interval',  'page_load'),
  ('homepage_show_counter',   'true'),
  ('homepage_force_soldout',  'false'),
  ('homepage_sold_offset',    '0'),
  ('contact_whatsapp',        ''),
  ('contact_email',           ''),
  ('contact_address',         ''),
  ('main_contact_phone',      ''),
  ('sad_description',         'S.A.D Corporation - organizers of Senior Gala Kigali.'),
  ('team_members',            '[]'),
  ('momo_methods',            '[]')
ON CONFLICT (key) DO NOTHING;

-- 10.2 Default schools (general public + catch-all "Other")
INSERT INTO public.schools (name, prefix) VALUES
  ('General Public', 'SG'),
  ('Other',          'OTH')
ON CONFLICT (prefix) DO NOTHING;

-- 10.3 Ticket tiers — adjust prices/quantities to your real plan
INSERT INTO public.ticket_tiers
  (name, description, price, quantity_total, sort_order, is_table_tier, seats_per_table, homepage_label)
VALUES
  ('Student Standard', 'Single seat for S6 / L5 finalists',     25000, 600, 10, false, 1, 'Student'),
  ('Student Premium',  'Premium placement for finalists',        35000, 200, 20, false, 1, 'Student Premium'),
  ('General Public',   'Open to family, alumni and friends',     30000, 150, 30, false, 1, 'General'),
  ('VIP Table (8)',    'Reserved table seating eight guests',   320000,  10, 40, true,  8, 'VIP Table')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- FIRST USER  —  HOW TO CREATE YOUR FIRST SUPERADMIN
-- ============================================================================
-- The handle_new_user() trigger above auto-grants 'superadmin' to the FIRST
-- user inserted into auth.users. Subsequent users get no role until granted.
--
-- Recommended (UI):
--   1. Dashboard -> Authentication -> Users -> "Add user" -> "Create new user".
--   2. Enter email + strong password, toggle "Auto Confirm User" ON, click Create.
--   3. Sign in at  /sg26-staff/login  with that email + password.
--   4. From  /admin/agents  invite more staff and assign roles
--      (agent / door_in / door_out / superadmin).
--
-- Grant a role to an existing auth user via SQL:
--   INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'superadmin'::public.app_role
--     FROM auth.users WHERE email = 'you@example.com'
--   ON CONFLICT (user_id, role) DO NOTHING;
--
-- Revoke a role:
--   DELETE FROM public.user_roles
--    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'you@example.com')
--      AND role = 'agent';
-- ============================================================================
