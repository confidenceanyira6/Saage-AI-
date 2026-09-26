import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/providers?type=male_barber&minPrice=1000&maxPrice=10000&minRating=4&home=true&q=fade
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const supabase = createClient();

  let query = supabase
    .from('providers')
    .select(`
      id, provider_type, business_name, bio, salon_address, home_service_enabled,
      is_vip, rating_avg, rating_count, is_active,
      profiles!inner ( full_name, avatar_url ),
      provider_services ( id, name, price, currency_code, duration_minutes, is_active )
    `)
    .eq('is_active', true);

  const type = searchParams.get('type');
  if (type) query = query.eq('provider_type', type);

  const minRating = searchParams.get('minRating');
  if (minRating) query = query.gte('rating_avg', Number(minRating));

  const home = searchParams.get('home');
  if (home === 'true') query = query.eq('home_service_enabled', true);

  const { data, error } = await query.limit(50);
  if (error) {
    return NextResponse.json({ success: false, error: { code: 'PROVIDERS_FETCH_FAILED', message: error.message } }, { status: 500 });
  }

  // Price/rating-text filters applied in JS since they touch a joined table
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const q = searchParams.get('q')?.toLowerCase();

  let results = data ?? [];
  if (minPrice || maxPrice || q) {
    results = results.filter((p: any) => {
      const activeServices = (p.provider_services ?? []).filter((s: any) => s.is_active);
      if (q && !activeServices.some((s: any) => s.name.toLowerCase().includes(q))) return false;
      if (minPrice && !activeServices.some((s: any) => s.price >= Number(minPrice))) return false;
      if (maxPrice && !activeServices.some((s: any) => s.price <= Number(maxPrice))) return false;
      return true;
    });
  }

  return NextResponse.json({ success: true, data: results });
}
