import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { verifyTransaction } from '@/lib/paystack';

// GET /api/payments/verify?reference=xyz
// Lets the frontend poll after a Paystack redirect, in case the webhook
// hasn't landed yet. Does the same idempotent verify-and-record logic as
// the webhook so either path can safely complete the payment first.
export async function GET(req: Request) {
  const reference = new URL(req.url).searchParams.get('reference');
  if (!reference) {
    return NextResponse.json({ success: false, error: { code: 'MISSING_REFERENCE', message: 'reference is required.' } }, { status: 400 });
  }

  const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: payment } = await service.from('payments').select('*').eq('paystack_reference', reference).single();
  if (!payment) {
    return NextResponse.json({ success: false, error: { code: 'PAYMENT_NOT_FOUND', message: 'Unknown reference.' } }, { status: 404 });
  }

  if (payment.status === 'completed') {
    return NextResponse.json({ success: true, data: { status: 'completed' } });
  }

  const verified = await verifyTransaction(reference);
  return NextResponse.json({ success: true, data: { status: verified.status === 'success' ? 'pending_webhook' : verified.status } });
}
