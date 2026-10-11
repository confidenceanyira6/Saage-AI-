import { createClient } from '@/lib/supabase/client';

// Calls a Supabase edge function and returns { data, error } where error is the
// function's own error code string (e.g. 'KYC_REQUIRED') instead of a generic message.
export async function callFn(name: string, body: any): Promise<{ data: any; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) return { data, error: null };
  try {
    const ctx = (error as any).context;
    if (ctx && typeof ctx.json === 'function') {
      const j = await ctx.json();
      return { data: j, error: j?.error ?? 'REQUEST_FAILED' };
    }
  } catch {}
  return { data: null, error: 'REQUEST_FAILED' };
}
