import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: provider, error } = await supabase
    .from('providers')
    .select(`
      id, provider_type, business_name, bio, salon_address, home_service_enabled,
      is_vip, rating_avg, rating_count,
      profiles!inner ( full_name, avatar_url ),
      provider_services ( id, name, description, price, currency_code, duration_minutes, category, is_active ),
      provider_availability ( day_of_week, start_time, end_time )
    `)
    .eq('id', params.id)
    .single();

  if (error || !provider) {
    return NextResponse.json({ success: false, error: { code: 'PROVIDER_NOT_FOUND', message: 'Provider not found.' } }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: provider });
}
