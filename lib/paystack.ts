const PAYSTACK_BASE = 'https://api.paystack.co';

function authHeader() {
  return { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' };
}

export async function initializeTransaction(opts: { email: string; amountKobo: number; reference: string; callbackUrl: string }) {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({
      email: opts.email,
      amount: opts.amountKobo,
      reference: opts.reference,
      callback_url: opts.callbackUrl,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.status) throw new Error(json.message || 'Paystack initialization failed');
  return json.data as { authorization_url: string; access_code: string; reference: string };
}

export async function verifyTransaction(reference: string) {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: authHeader(),
  });
  const json = await res.json();
  if (!res.ok || !json.status) throw new Error(json.message || 'Paystack verification failed');
  return json.data as { status: string; amount: number; reference: string };
}
