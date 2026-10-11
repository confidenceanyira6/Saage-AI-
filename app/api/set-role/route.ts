import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Ensures the SIGNED-IN user has a providers row matching the role on their profile.
// The role itself is set by the handle_new_user DB trigger from sign-up metadata
// (barber / stylist / customer only). This route no longer accepts a userId or role
// from the client, so nobody can promote or demote another account.
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Log in required.' } }, { status: 401 });
  }
  const { data: profile } = await supabase.from('profiles').select('role, country_code').eq('id', user.id).maybeSingle();
  if (!profile || !['male_barber', 'female_stylist'].includes(profile.role)) {
    return NextResponse.json({ success: false, error: { code: 'NOT_A_PROVIDER', message: 'This account is not a barber or stylist.' } }, { status: 400 });
  }
  const { data: existing } = await supabase.from('providers').select('id').eq('id', user.id).maybeSingle();
  if (!existing) {
    const { error } = await supabase.from('providers').insert({ id: user.id, provider_type: profile.role, country_code: profile.country_code });
    if (error) {
      return NextResponse.json({ success: false, error: { code: 'PROVIDER_CREATE_FAILED', message: error.message } }, { status: 500 });
    }
  }
  return NextResponse.json({ success: true });
}
