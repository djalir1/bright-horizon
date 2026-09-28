
-- Fix RLS: Add missing INSERT policy for codes
CREATE POLICY "Anyone can insert codes" ON public.codes FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Fix RLS: Add missing DELETE policy for codes
CREATE POLICY "Anyone can delete codes" ON public.codes FOR DELETE TO anon, authenticated USING (true);

-- Fix RLS: Add INSERT policy for agents
CREATE POLICY "Anyone can insert agents" ON public.agents FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Fix RLS: Add UPDATE policy for agents
CREATE POLICY "Anyone can update agents" ON public.agents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Fix RLS: Add DELETE policy for agents
CREATE POLICY "Anyone can delete agents" ON public.agents FOR DELETE TO anon, authenticated USING (true);

-- Fix RLS: Update SELECT policy on agents to allow reads
DROP POLICY IF EXISTS "No public access to agents" ON public.agents;
CREATE POLICY "Anyone can read agents" ON public.agents FOR SELECT TO anon, authenticated USING (true);

-- Fix RLS: Add INSERT policy for settings
CREATE POLICY "Anyone can insert settings" ON public.settings FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Fix RLS: Add UPDATE policy for settings
CREATE POLICY "Anyone can update settings" ON public.settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Fix RLS: Add DELETE policy for settings
CREATE POLICY "Anyone can delete settings" ON public.settings FOR DELETE TO anon, authenticated USING (true);

-- Fix RLS: Add UPDATE policy for gallery
CREATE POLICY "Anyone can update gallery" ON public.gallery FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Fix RLS: Add DELETE policy for users
CREATE POLICY "Anyone can delete users" ON public.users FOR DELETE TO anon, authenticated USING (true);

-- Fix RLS: Add DELETE policy for payments
CREATE POLICY "Anyone can delete payments" ON public.payments FOR DELETE TO anon, authenticated USING (true);
