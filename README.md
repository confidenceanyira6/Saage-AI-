# Saage Barber

Barber & hair-stylist booking marketplace. Nigeria-first, built to expand internationally.

## Stack
- Next.js 14 (App Router) — deployed on Vercel
- Supabase (Postgres + Auth) — RLS enabled on every table
- Paystack for payments (Nigeria-first; architecture supports more providers later)

## Status

### Phase 1 — done
- Core schema: `profiles`, `providers`, `provider_services`, `bookings`, `wallets`, `wallet_transactions`, `platform_settings` — all with Row Level Security
- Real Supabase Auth: registration (customer/barber/stylist), login, session middleware
- Role assignment via server-only `/api/set-role` (service-role key, never trusted from frontend)
- Auto-created profile + wallet on signup (DB trigger)

### Phase 2 — done (booking flow backend)
- `GET /api/providers` — discovery with type/rating/home-service/price/service-name filters
- `GET /api/providers/:id` — full profile with services + availability
- `POST /api/bookings` — creates a booking; validates service/provider match, home-service eligibility (VIP provider + verified customer + address required), computes end time from service duration
- `PATCH /api/bookings/:id` — status transitions (pending→accepted/rejected→confirmed→in_progress→completed, or cancelled) enforced server-side by the `update_booking_status` Postgres function — the frontend can never set an arbitrary status
- **Double-booking is prevented at the database level** via a Postgres exclusion constraint (`no_overlapping_bookings`), not just application logic — holds even under race conditions
- Structured error responses everywhere: `{ success: false, error: { code, message } }`

### Not yet built (next phases)
- Paystack integration (initialize/verify/webhook, idempotency) — bookings currently have no payment attached
- Wallet deposit/withdraw backend logic
- Chat, notifications, reviews, VIP subscription purchase flow
- Identity verification submission/review flow (the `identity_verification` field exists but nothing sets it to `verified` yet — home bookings will 403 until that's built)
- Admin dashboard + APIs
- Cron jobs (VIP expiry, chat retention, reminders)
- Frontend UI for browsing/booking (APIs exist; screens from the mockups aren't wired up yet)

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local`
3. In Vercel, set `SUPABASE_SERVICE_ROLE_KEY` and (later) `PAYSTACK_SECRET_KEY` as **server-only** env vars — never in `.env` files committed to git
4. `npm run dev`
