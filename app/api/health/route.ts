import { NextResponse } from 'next/server';

// Cheap liveness probe for uptime monitors (UptimeRobot, Better Stack, Vercel checks).
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}
