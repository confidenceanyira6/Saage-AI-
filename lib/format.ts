export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

export function publicUrl(bucket: string, path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

export function money(n: number | string | null | undefined, cur = 'NGN'): string {
  const v = Number(n ?? 0);
  try {
    return new Intl.NumberFormat(cur === 'NGN' ? 'en-NG' : 'en', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 0,
      maximumFractionDigits: Number.isInteger(v) ? 0 : 2,
    }).format(v);
  } catch {
    return `${cur} ${v}`;
  }
}

export function fmtWhen(iso: string, tz?: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz,
  });
}

export function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmt12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ap}`;
}

export const prettyType = (t?: string | null) => (t === 'female_stylist' ? 'Hairstylist' : 'Barber');
export const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

const STATUS: Record<string, { label: string; tone: 'ok' | 'warn' | 'bad' | 'info' }> = {
  pending: { label: 'Awaiting barber', tone: 'warn' },
  accepted: { label: 'Accepted - pay to secure', tone: 'info' },
  rejected: { label: 'Declined', tone: 'bad' },
  confirmed: { label: 'Confirmed', tone: 'ok' },
  in_progress: { label: 'In progress', tone: 'info' },
  completed: { label: 'Completed', tone: 'ok' },
  cancelled: { label: 'Cancelled', tone: 'bad' },
  refunded: { label: 'Refunded', tone: 'warn' },
  disputed: { label: 'Disputed', tone: 'bad' },
};

export function statusInfo(status: string, provider = false) {
  if (provider && status === 'accepted') return { label: 'Awaiting payment', tone: 'info' as const };
  if (provider && status === 'pending') return { label: 'New request', tone: 'warn' as const };
  return STATUS[status] ?? { label: status, tone: 'info' as const };
}

const ERR: Record<string, string> = {
  FORBIDDEN: 'You are not allowed to do that.',
  INVALID_TRANSITION: 'That is not possible at this stage.',
  INVALID_STATE: 'That is not possible at this stage.',
  NOT_PAID: 'The customer has not paid yet.',
  ALREADY_PAID: 'This booking is already paid.',
  INSUFFICIENT: 'Not enough balance. Add money to your wallet first.',
  DISPUTED: 'This booking is under dispute.',
  BOOKING_NOT_FOUND: 'Booking not found.',
  KYC_REQUIRED: 'Identity verification is required first.',
  PAYMENT_PROVIDER_NOT_CONFIGURED: 'Card payments are not switched on yet.',
  PAYMENT_PROVIDER_ERROR: 'The payment provider had a problem. Please try again.',
  AI_NOT_CONFIGURED: 'Customer care AI is not switched on yet.',
  AI_UNAVAILABLE: 'Customer care AI is busy. Please try again shortly.',
  RATE_LIMITED: 'Slow down a little and try again in a minute.',
  INVALID_AMOUNT: 'Enter a valid amount.',
  TRANSFER_REJECTED: 'The bank rejected the transfer.',
  KYC_PROVIDER_NOT_CONFIGURED: 'ID verification is not switched on yet.',
  TOO_MANY_ATTEMPTS: 'Too many attempts today. Try again tomorrow.',
  INVALID_NIN_FORMAT: 'NIN must be 11 digits.',
  VIP: 'Home service needs an active Premium subscription.',
  UNAUTHENTICATED: 'Please log in again.',
};

export function niceError(m?: string | null): string {
  const s = m ?? '';
  for (const k of Object.keys(ERR)) if (s.includes(k)) return ERR[k];
  return s || 'Something went wrong. Please try again.';
}
