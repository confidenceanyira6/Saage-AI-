# Saage Barber

Barber & hair-stylist booking marketplace. Nigeria-first, built to expand internationally.

## Stack
- Next.js 14 (App Router) — deployed on Vercel
- Supabase (Postgres + Auth) — RLS enabled on every table
- Paystack for payments (Nigeria-first; architecture supports more providers later)

## Status

### Phase 1 — done: auth
Core schema (`profiles`, `providers`, `provider_services`, `bookings`, `wallets`, `wallet_transactions`, `platform_settings`), real Supabase Auth, server-only role assignment.

### Phase 2 — done: booking flow
Provider discovery, booking creation with DB-level double-booking prevention (Postgres exclusion constraint), server-enforced status transitions via `update_booking_status`.

### Phase 3 — done: Paystack payments
- `POST /api/payments/initialize` — customer-only, requires booking status `accepted`, creates a `payments` record and a Paystack transaction, returns the checkout URL
- `POST /api/payments/webhook` — verifies the Paystack HMAC signature, then independently re-verifies the transaction against Paystack's API (never trusts the webhook body alone), is idempotent (checks `payment.status === 'completed'` before reprocessing), moves the booking to `confirmed`, and writes paired wallet-ledger entries (customer debit / provider credit minus platform fee)
- `GET /api/payments/verify?reference=` — lets the frontend poll after redirect in case the webhook hasn't landed yet; shares the same verify-and-record path
- Platform fee read from `platform_settings` (₦30 for NGN), never hard-coded
- Provider earnings land in **pending** balance, not available balance — payout eligibility (spec §15) comes with the completed-booking phase

**Setup needed in Vercel:** add `PAYSTACK_SECRET_KEY` (server-only) and configure the webhook URL (`https://<your-domain>/api/payments/webhook`) in your Paystack dashboard. Also add `NEXT_PUBLIC_APP_URL` for the Paystack callback redirect.

### Not yet built (next phases)
- Booking completion → moving provider pending balance to available/withdrawable, and withdrawal requests
- Refund handling on cancellation
- Identity verification submission/review flow (home bookings currently 403 until this exists)
- Chat, notifications, reviews, VIP subscription purchase flow
- Admin dashboard + APIs
- Cron jobs (VIP expiry, chat retention, reminders)
- Frontend UI (APIs exist; screens from the mockups aren't wired up yet)

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local`
3. In Vercel, set `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_APP_URL` as env vars (service role + Paystack secret must be **server-only**, never in a committed `.env` file)
4. `npm run dev`
