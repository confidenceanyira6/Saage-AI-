import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { verifyTransaction } from '@/lib/paystack';

// POST /api/payments/webhook — Paystack calls this directly (no user session).
// Security relies entirely on the HMAC signature, verified below, plus an
// independent server-to-server verify call — the webhook body is never
// trusted on its own.
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature') ?? '';

  const expected = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest('hex');

  if (expected !== signature) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Signature mismatch.' } }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  if (event.event !== 'charge.success') {
    return NextResponse.json({ success: true }); // Ack other event types without action
  }

  const reference = event.data.reference as string;
  const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: payment } = await service.from('payments').select('*').eq('paystack_reference', reference).single();
  if (!payment) {
    return NextResponse.json({ success: false, error: { code: 'PAYMENT_NOT_FOUND', message: 'Unknown reference.' } }, { status: 404 });
  }

  // Idempotency: if this reference was already processed, ack without
  // reprocessing (Paystack may send the same webhook more than once).
  if (payment.status === 'completed') {
    return NextResponse.json({ success: true, data: { alreadyProcessed: true } });
  }

  // Independent verification against Paystack's API — never trust the
  // webhook payload's amount/status alone.
  const verified = await verifyTransaction(reference);
  const expectedKobo = Math.round(Number(payment.amount) * 100);
  if (verified.status !== 'success' || verified.amount !== expectedKobo) {
    await service.from('payments').update({ status: 'failed' }).eq('id', payment.id);
    return NextResponse.json({ success: false, error: { code: 'VERIFICATION_MISMATCH', message: 'Amount or status did not match.' } }, { status: 400 });
  }

  await service.from('payments').update({ status: 'completed', verified_at: new Date().toISOString() }).eq('id', payment.id);

  // Booking moves to confirmed only after verified payment (spec section 12/30).
  await service.from('bookings').update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', payment.booking_id).eq('status', 'accepted');

  // Ledger entries: customer's payment out, provider's payout in as PENDING
  // balance (not available until the booking is completed — see spec
  // section 15). A cron/completion hook moves pending→available later.
  await service.from('wallet_transactions').insert([
    {
      user_id: payment.customer_id,
      amount: payment.amount,
      currency_code: payment.currency_code,
      type: 'booking_payment',
      status: 'completed',
      reference: `${reference}_debit`,
      metadata: { booking_id: payment.booking_id },
    },
    {
      user_id: payment.provider_id,
      amount: payment.provider_payout,
      currency_code: payment.currency_code,
      type: 'booking_payment',
      status: 'completed',
      reference: `${reference}_credit`,
      metadata: { booking_id: payment.booking_id, platform_fee: payment.platform_fee },
    },
  ]);

  await service.rpc('increment_wallet_pending', { p_user_id: payment.provider_id, p_amount: payment.provider_payout });

  return NextResponse.json({ success: true });
}
