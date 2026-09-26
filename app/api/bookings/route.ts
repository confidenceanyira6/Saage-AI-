import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/bookings — bookings where the current user is the customer or the provider (RLS-enforced)
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Log in required.' } }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*, provider_services(name, duration_minutes), providers(business_name)')
    .order('scheduled_start', { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'BOOKINGS_FETCH_FAILED', message: error.message } }, { status: 500 });
  }
  return NextResponse.json({ success: true, data });
}

// POST /api/bookings — create a booking. Availability/double-booking is
// enforced by the `no_overlapping_bookings` DB exclusion constraint, not
// just app logic, so a race condition can never create two overlapping
// bookings for the same provider.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Log in required.' } }, { status: 401 });
  }

  const body = await req.json();
  const { providerId, serviceId, locationType, serviceAddress, scheduledStart } = body;

  if (!providerId || !serviceId || !locationType || !scheduledStart) {
    return NextResponse.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'providerId, serviceId, locationType and scheduledStart are required.' } }, { status: 400 });
  }
  if (!['salon', 'home'].includes(locationType)) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_LOCATION_TYPE', message: 'locationType must be salon or home.' } }, { status: 400 });
  }

  const { data: service, error: serviceError } = await supabase
    .from('provider_services')
    .select('id, provider_id, price, currency_code, duration_minutes, is_active')
    .eq('id', serviceId)
    .single();
  if (serviceError || !service || !service.is_active || service.provider_id !== providerId) {
    return NextResponse.json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'This service is not available from this provider.' } }, { status: 400 });
  }

  if (locationType === 'home') {
    const { data: provider } = await supabase
      .from('providers')
      .select('home_service_enabled, is_vip')
      .eq('id', providerId)
      .single();
    if (!provider?.home_service_enabled) {
      return NextResponse.json({ success: false, error: { code: 'HOME_SERVICE_UNAVAILABLE', message: 'This provider does not offer home service.' } }, { status: 400 });
    }
    if (!serviceAddress) {
      return NextResponse.json({ success: false, error: { code: 'ADDRESS_REQUIRED', message: 'A service address is required for home bookings.' } }, { status: 400 });
    }
    const { data: profile } = await supabase.from('profiles').select('identity_verification').eq('id', user.id).single();
    if (profile?.identity_verification !== 'verified') {
      return NextResponse.json({ success: false, error: { code: 'VERIFICATION_REQUIRED', message: 'Identity verification is required for home-service bookings.' } }, { status: 403 });
    }
  }

  const start = new Date(scheduledStart);
  const end = new Date(start.getTime() + service.duration_minutes * 60000);

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      customer_id: user.id,
      provider_id: providerId,
      service_id: serviceId,
      location_type: locationType,
      service_address: locationType === 'home' ? serviceAddress : null,
      scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(),
      price: service.price,
      currency_code: service.currency_code,
    })
    .select()
    .single();

  if (bookingError) {
    // Postgres exclusion-constraint violation surfaces as code 23P01
    if ((bookingError as any).code === '23P01') {
      return NextResponse.json({ success: false, error: { code: 'BOOKING_UNAVAILABLE', message: 'The selected time is no longer available.' } }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: { code: 'BOOKING_CREATE_FAILED', message: bookingError.message } }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: booking }, { status: 201 });
}
