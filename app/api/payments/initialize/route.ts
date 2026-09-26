import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { initializeTransaction } from '@/lib/paystack';
import { randomUUID } from 'crypto';

// POST /api/payments/initialize  body: { bookingId }
// Only the customer on an accepted booking can start payment. The actual
// charge is confirmed later by the webhook — this route never marks
// anything as paid itself.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Log in required.' } }, { status: 401 });
  }

  const { bookingId } = await req.json();
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, customer_id, provider_id, status, price, currency_code')
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ success: false, error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' } }, { status: 404 });
  }
  if (booking.customer_id !== user.id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your booking.' } }, { status: 403 });
  }
  if (booking.status !== 'accepted') {
    return NextResponse.json({ success: false, error: { code: 'INVALID_BOOKING_STATE', message: 'Booking must be accepted by the provider before payment.' } }, { status: 400 });
  }
  if (booking.currency_code !== 'NGN') {
    return NextResponse.json({ success: false, error: { code: 'UNSUPPORTED_CURRENCY', message: 'Only NGN/Paystack is supported currently.' } }, { status: 400 });
  }

  const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: feeSetting } = await service.from('platform_settings').select('value').eq('key', 'platform_fee_ngn').single();
  const platformFee = feeSetting?.value?.amount ?? 30;
  const providerPayout = Number(booking.price) - platformFee;

  const reference = `saage_${randomUUID()}`;

  const { error: insertError } = await service.from('payments').insert({
    booking_id: booking.id,
    customer_id: booking.customer_id,
    provider_id: booking.provider_id,
    amount: booking.price,
    currency_code: booking.currency_code,
    platform_fee: platformFee,
    provider_payout: providerPayout,
    paystack_reference: reference,
    status: 'pending',
  });
  if (insertError) {
    return NextResponse.json({ success: false, error: { code: 'PAYMENT_RECORD_FAILED', message: insertError.message } }, { status: 500 });
  }

  try {
    const tx = await initializeTransaction({
      email: user.email!,
      amountKobo: Math.round(Number(booking.price) * 100),
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/bookings/${booking.id}`,
    });
    return NextResponse.json({ success: true, data: { authorizationUrl: tx.authorization_url, reference } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { code: 'PAYSTACK_INIT_FAILED', message: e.message } }, { status: 502 });
  }
}
