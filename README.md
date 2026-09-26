# Saage Barber

Barber & hair-stylist booking marketplace. Nigeria-first, built to expand internationally.

## Stack
- Next.js 14 (App Router) — deployed on Vercel
- Supabase (Postgres + Auth) — RLS enabled on every table
- Paystack for payments (Nigeria-first; architecture supports more providers later)

## Status: Phase 1 of the full spec
Done:
- Core schema: `profiles`, `providers`, `provider_services`, `bookings`, `wallets`, `wallet_transactions`, `platform_settings` — all with Row Level Security
- Real Supabase Auth: registration (customer/barber/stylist), login, session middleware
- Role assignment happens server-side (`/api/set-role`) via the service-role key — never trusted from the frontend
- Auto-created profile + wallet on signup (DB trigger)

Not yet built (planned next phases):
- Booking flow (availability checks, double-booking prevention, status transitions)
- Paystack integration (initialize/verify/webhook, idempotency)
- Wallet deposit/withdraw backend logic
- Chat, notifications, reviews, VIP subscriptions
- Admin dashboard + APIs
- Cron jobs (VIP expiry, chat retention, reminders)

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local`
3. In Vercel, set `SUPABASE_SERVICE_ROLE_KEY` and (later) `PAYSTACK_SECRET_KEY` as **server-only** env vars — never in `.env` files committed to git
4. `npm run dev`
