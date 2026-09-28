-- Add QR versioning so reprints invalidate older QRs.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS qr_version integer NOT NULL DEFAULT 1;

-- Helpful index for scan lookups
CREATE INDEX IF NOT EXISTS idx_users_qr_version ON public.users(qr_version);
