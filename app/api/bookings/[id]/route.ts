import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PATCH /api/bookings/:id  body: { status: 'accepted' | 'rejected' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' }
// All authorization + valid-transition rules live in the update_booking_status
// Postgres function (security definer), so this route can't be bypassed by
// calling Supabase directly from the frontend with a forged status.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Log in required.' } }, { status: 401 });
  }

  const { status } = await req.json();
  const { data, error } = await supabase.rpc('update_booking_status', {
    p_booking_id: params.id,
    p_new_status: status,
  });

  if (error) {
    const code = error.message.includes('FORBIDDEN') ? 'FORBIDDEN'
      : error.message.includes('INVALID_TRANSITION') ? 'INVALID_TRANSITION'
      : error.message.includes('BOOKING_NOT_FOUND') ? 'BOOKING_NOT_FOUND'
      : 'STATUS_UPDATE_FAILED';
    const httpStatus = code === 'FORBIDDEN' ? 403 : code === 'BOOKING_NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ success: false, error: { code, message: error.message } }, { status: httpStatus });
  }

  return NextResponse.json({ success: true, data });
}
