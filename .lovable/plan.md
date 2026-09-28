
# New Payment Workflow — Senior Gala 2026

The migration is already applied (tiers updated to 19,500 / 26,500 / 36,500; `ticket_state`, `early_reg_paid`, `amount_paid`, `amount_remaining`, `review_note` columns added; existing registered users marked early-bird). This plan covers the application changes.

## 1. Public registration + payment flow (merged into one path)

**File: `src/pages/Register.tsx` → becomes a tier-first buy flow**
- Step 1: pick tier (Founder / General / VIP) — uses existing `TierCards`, all-in prices come from DB.
- Step 2: buyer details form (first/last name, gender, phone, email, school dropdown or "General Public", level/section).
- Step 3: MoMo payment proof (amount = tier price; screenshot upload, transaction ref, payer name, payer phone).
- Step 4: On submit (single server action):
  1. Insert `users` row with `tier_id`, `ticket_price`, `payment_status='pending'`, `ticket_state='pending'`.
  2. Auto-generate a `codes` row (school prefix if a school is picked, otherwise `GP-` for General Public) and link it.
  3. Insert `payments` row (`status='pending'`, method `momo`, screenshot URL, ref, payer info).
  4. Redirect to `/ticket/:code` showing the confirmation message verbatim from the brief, QR rendered, "PENDING CONFIRMATION" banner.
  5. Fire-and-forget call to `send-ticket-issued` edge function (email with QR + pending message).

**Remove the old "enter code first" gate** from the public landing — the code entry box stays available only as a "Already have a code? View your ticket" link.

## 2. Early-bird path (people who paid 1,500 under old system)

- Keep `/register/code` route where an existing code holder enters their `SG-XXXX` code.
- Page shows: name, tier, "You've paid 1,500 RWF. Remaining: X RWF."
- They submit MoMo proof for the remaining balance → creates a `payments` row tied to their existing user. Same pending → confirm/reject flow. Existing code stays valid.

## 3. Admin payments review (`src/pages/admin/AdminPayments.tsx`)

- Columns: name, tier, amount, MoMo ref, payer name/phone, screenshot, status, submitted at.
- Status filter (pending / confirmed / rejected) + running pending count badge.
- **Confirm** action → sets `payments.status='approved'`, `users.payment_status='paid'`, `users.ticket_state='confirmed'`, increments tier `quantity_sold`, calls `send-ticket-confirmed` edge function.
- **Reject** action → opens modal for reason → sets `payments.status='rejected'`, `payments.review_note=reason`, `users.ticket_state='rejected'`, marks the code as voided (`codes.status='voided'`), calls `send-ticket-rejected` edge function with reason.
- Keep existing cash payment recording for backwards compatibility, but reframed.

## 4. Admin manual code generation (exception path)

**File: `src/pages/admin/AdminCodes.tsx`**
- Keep the existing generator but require the admin to pick: payment method (`cash` / `comp`), tier, code type (`student` requires school, or `general`).
- A manual code is created already-paid and `ticket_state='confirmed'` (cash counted at desk, comp = free).
- Removes the bulk "give 500 codes to an agent" use case — now one-at-a-time, logged with `created_by`.

## 5. Door scanner (`src/pages/admin/AdminScanEntry.tsx`)

Three-state result based on `users.ticket_state`:
- `confirmed` → green ADMIT
- `pending` → amber "PENDING — verify payment at desk" with override-admit button
- `rejected` → red DO NOT ADMIT

Exit scanner unchanged.

## 6. Emails (transactional)

Three new edge functions under `supabase/functions/`:
- `send-ticket-issued` — fires on payment submission. Subject "Your Senior Gala ticket — pending confirmation". Includes code, QR (data-uri), pending message, contact info.
- `send-ticket-confirmed` — fires on admin confirm. Subject "Your Senior Gala ticket is confirmed".
- `send-ticket-rejected` — fires on admin reject. Subject "Action needed on your Senior Gala payment". Includes reason and resubmission instructions.

Uses Lovable Emails infrastructure. Requires email domain setup — I'll surface the setup dialog if not yet configured (see Step 8 of execution).

## 7. Pricing display

- Update `LiveTicketStats`, `HeroSection`, `Pay.tsx` price chips to reflect the new all-in prices coming from `ticket_tiers` (already DB-driven; just verify no hard-coded 18,000/25,000/35,000 / "+1,500" strings remain).
- Remove the "+1,500 registration fee" copy anywhere it appears in the public site.

## 8. `/backend/db.txt`

Rewrite to reflect the new schema (`users.ticket_state`, `early_reg_paid`, `amount_paid`, `amount_remaining`; `payments.review_note`; updated tier prices; new flow description).

## Execution order

1. Update `Register.tsx` to the new unified buy flow.
2. Update `AdminPayments.tsx` for confirm/reject + status badge + pending count.
3. Update `AdminScanEntry.tsx` to three-state result.
4. Update `AdminCodes.tsx` to exception-only generator.
5. Update `Ticket.tsx` to render the pending/confirmed/rejected banner + exact message.
6. Strip "+1,500 reg fee" copy from `HeroSection`, `Pay.tsx`, `LiveTicketStats`, `Footer`, etc.
7. Rewrite `/backend/db.txt`.
8. If email domain isn't configured yet, surface the email setup dialog and pause — once configured, scaffold transactional emails and add the three sender helpers.

## Note on the email domain

I'll check the current email domain status when I get to Step 8. If it isn't set up, I'll show you the setup dialog before scaffolding the three transactional templates.
