# Saage Barber

Barber & hair-stylist booking marketplace. Nigeria-first, built to expand internationally.

## Stack
- Next.js 14 (App Router) — deployed on Vercel
- Supabase (Postgres + Auth) — RLS enabled on every table, security-hardened (locked-down function grants, pinned search_path)
- Paystack for payments (Nigeria-first; architecture supports more providers later)

## Database — all spec tables now exist (§25)
`profiles`, `providers`, `provider_services`, `provider_availability`, `bookings`, `payments`, `refunds`, `wallets`, `wallet_transactions`, `withdrawals`, `subscriptions`, `identity_verifications`, `storage_usage`, `notifications`, `conversations`, `messages`, `reviews`, `platform_settings`, `audit_logs`. Every table has RLS.

Key backend logic already wired **at the database level**, not just in API routes:
- **Double-booking prevention**: Postgres exclusion constraint on `bookings`, holds even under race conditions
- **Booking status transitions**: `update_booking_status()` — only the correct party, only valid prior states, moves provider payout from pending→available balance on completion, fires notifications
- **VIP gating**: a provider can't set `home_service_enabled = true` without an active row in `subscriptions` (DB trigger enforces this — can't be bypassed from the frontend)
- **Withdrawals**: `request_withdrawal()` atomically checks `available_balance`, deducts it, and creates the request — a user can never withdraw more than they actually have
- **Reviews**: one per booking (unique constraint), only insertable if that booking is `completed` and belongs to the reviewer; a trigger keeps `providers.rating_avg`/`rating_count` in sync
- **Chat**: `conversations`/`messages` with participant-only RLS (retention/auto-delete cron not yet scheduled)
- **Notifications**: auto-created by triggers on booking status changes, payment completion, and verification review — not something the frontend has to remember to call

## API routes (Phase 1–3)
- Auth: Supabase Auth (register/login/logout/session) + `POST /api/set-role` (server-only role assignment)
- `GET /api/providers`, `GET /api/providers/:id` — discovery
- `POST /api/bookings`, `GET /api/bookings`, `PATCH /api/bookings/:id`
- `POST /api/payments/initialize`, `POST /api/payments/webhook`, `GET /api/payments/verify`

## Not yet built
- API routes for the Phase 4 schema: VIP subscription purchase, identity-verification submission/admin review, withdrawal request endpoint (the DB function exists; no route calls it yet), chat send/read endpoints, review submission endpoint
- Refund *processing* (the `refunds` table + policies exist; nothing yet calls Paystack's refund API or inserts a refund row — that has to happen from an API route, not the database, since it requires an external HTTP call)
- Admin dashboard + APIs
- Cron jobs (VIP expiry, chat 14-day retention, booking reminders)
- Frontend UI (APIs/schema exist; screens from the mockups aren't wired up yet)

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local`
3. In Vercel, set `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_APP_URL` as env vars (service role + Paystack secret must be **server-only**, never in a committed `.env` file)
4. In Paystack, point the webhook URL at `https://<your-domain>/api/payments/webhook`
5. `npm run dev`
