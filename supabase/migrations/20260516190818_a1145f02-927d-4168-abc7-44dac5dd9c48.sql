
ALTER TABLE public.users DROP COLUMN IF EXISTS student_id_url;
ALTER TABLE public.users DROP COLUMN IF EXISTS verification_status;
ALTER TABLE public.users DROP COLUMN IF EXISTS rejection_reason;

DROP TABLE IF EXISTS public.gallery;

CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_contact_read ON public.contact_messages(read);
CREATE INDEX IF NOT EXISTS idx_codes_school_status ON public.codes(school_id, status);
