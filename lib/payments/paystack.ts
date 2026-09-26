import type { PaymentProvider, InitializeOpts, InitializeResult, VerifyResult } from './types';

// Paystack works in the smallest currency unit (kobo for NGN).
export const paystackProvider: PaymentProvider = {
  name: 'paystack',
  async initialize(opts: InitializeOpts): Promise<InitializeResult> {
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: opts.email,
        amount: Math.round(opts.amount * 100),
        reference: opts.reference,
        callback_url: opts.callbackUrl,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.status) throw new Error(json.message || 'Paystack initialization failed');
    return { checkoutUrl: json.data.authorization_url, reference: opts.reference };
  },
  async verify(reference: string): Promise<VerifyResult> {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    const json = await res.json();
    if (!res.ok || !json.status) throw new Error(json.message || 'Paystack verification failed');
    return {
      success: json.data.status === 'success',
      amount: json.data.amount / 100,
      currency: json.data.currency,
      reference,
    };
  },
};

// Paystack refunds work directly off the transaction reference — no
// numeric transaction id needed (unlike Flutterwave).
export async function refundPaystack(reference: string, amount: number) {
  const res = await fetch('https://api.paystack.co/refund', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: reference, amount: Math.round(amount * 100) }),
  });
  const json = await res.json();
  if (!res.ok || !json.status) throw new Error(json.message || 'Paystack refund failed');
  return json.data;
}
