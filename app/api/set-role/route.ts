import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// Server-only endpoint: assigns provider role + creates the providers row.
// Uses the service-role key (never exposed to the browser) so role
// elevation can never be forged from frontend state, per spec section 26.
export async function POST(req: Request) {
  const { userId, role } = await req.json();
  if (!userId || !['male_barber', 'female_stylist'].includes(role)) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_ROLE', message: 'Invalid role.' } }, { status: 400 });
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);
  if (profileError) {
    return NextResponse.json({ success: false, error: { code: 'PROFILE_UPDATE_FAILED', message: profileError.message } }, { status: 500 });
  }

  const providerType = role === 'male_barber' ? 'male_barber' : 'female_stylist';
  const { error: providerError } = await supabase
    .from('providers')
    .insert({ id: userId, provider_type: providerType });
  if (providerError) {
    return NextResponse.json({ success: false, error: { code: 'PROVIDER_CREATE_FAILED', message: providerError.message } }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
