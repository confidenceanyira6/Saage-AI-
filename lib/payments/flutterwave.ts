import type { PaymentProvider, InitializeOpts, InitializeResult, VerifyResult } from './types';

// Flutterwave works in major currency units (naira, not kobo).
export const flutterwaveProvider: PaymentProvider = {
  name: 'flutterwave',
  async initialize(opts: InitializeOpts): Promise<InitializeResult> {
    const res = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx_ref: opts.reference,
        amount: opts.amount,
        currency: opts.currency,
        redirect_url: opts.callbackUrl,
        customer: { email: opts.email },
      }),
    });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Flutterwave initialization failed');
    return { checkoutUrl: json.data.link, reference: opts.reference };
  },
  async verify(reference: string): Promise<VerifyResult> {
    const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
    });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Flutterwave verification failed');
    return {
      success: json.data.status === 'successful',
      amount: json.data.amount,
      currency: json.data.currency,
      reference,
      providerTransactionId: String(json.data.id),
    };
  },
};

export async function refundFlutterwave(providerTransactionId: string, amount: number) {
  const res = await fetch(`https://api.flutterwave.com/v3/transactions/${providerTransactionId}/refund`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  });
  const json = await res.json();
  if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Flutterwave refund failed');
  return json.data;
}
