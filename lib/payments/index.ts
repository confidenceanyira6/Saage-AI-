import { createClient as createServiceClient } from '@supabase/supabase-js';
import { paystackProvider, refundPaystack } from './paystack';
import { flutterwaveProvider, refundFlutterwave } from './flutterwave';
import type { PaymentProvider } from './types';

const PROVIDERS: Record<string, PaymentProvider> = {
  paystack: paystackProvider,
  flutterwave: flutterwaveProvider,
};

// Country → provider mapping lives in platform_settings, not hard-coded,
// so adding a country/provider later is a config change, not a code change
// (spec §13).
export async function getProviderForCountry(countryCode: string): Promise<PaymentProvider> {
  const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await service.from('platform_settings').select('value').eq('key', 'payment_provider_by_country').single();
  const map = data?.value ?? {};
  const name = map[countryCode] ?? map.default ?? 'paystack';
  return PROVIDERS[name];
}

export function getProviderByName(name: string): PaymentProvider {
  const p = PROVIDERS[name];
  if (!p) throw new Error(`Unknown payment provider: ${name}`);
  return p;
}

export async function refund(provider: string, reference: string, providerTransactionId: string | null, amount: number) {
  if (provider === 'paystack') return refundPaystack(reference, amount);
  if (provider === 'flutterwave') {
    if (!providerTransactionId) throw new Error('Missing provider transaction id for Flutterwave refund');
    return refundFlutterwave(providerTransactionId, amount);
  }
  throw new Error(`Unknown payment provider: ${provider}`);
}
