
-- 1. New columns on users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS early_reg_paid boolean NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS amount_paid integer NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS amount_remaining integer NOT NULL DEFAULT 0;

-- 2. Ticket state enum + column
DO $$ BEGIN
  CREATE TYPE public.ticket_state AS ENUM ('pending', 'confirmed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ticket_state public.ticket_state NOT NULL DEFAULT 'pending';

-- 3. Update ticket tiers to ALL-IN prices
UPDATE public.ticket_tiers SET price = 19500 WHERE name ILIKE '%founder%';
UPDATE public.ticket_tiers SET price = 26500 WHERE name ILIKE '%general%';
UPDATE public.ticket_tiers SET price = 36500 WHERE name ILIKE '%vip%';

-- 4. Mark already-registered users as early-bird (they paid the 1,500 reg fee via codes)
UPDATE public.users
SET early_reg_paid = true,
    amount_paid = GREATEST(paid_amount, 1500)
WHERE code_id IS NOT NULL;

-- 5. Compute remaining balance against new all-in tier price
UPDATE public.users u
SET amount_remaining = GREATEST(t.price - u.amount_paid, 0)
FROM public.ticket_tiers t
WHERE u.tier_id = t.id
  AND u.early_reg_paid = true;

-- 6. Confirmed state for fully-paid users
UPDATE public.users
SET ticket_state = 'confirmed'
WHERE payment_status = 'paid';

-- 7. Review note on payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS review_note text;

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_users_ticket_state ON public.users(ticket_state);
CREATE INDEX IF NOT EXISTS idx_users_early_reg ON public.users(early_reg_paid);
