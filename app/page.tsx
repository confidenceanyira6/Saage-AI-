import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function SplashPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/home');

  return (
    <main className="center" style={{ maxWidth: 420, margin: '0 auto' }}>
      <div className="logo">S</div>
      <h1 style={{ fontSize: 34, fontWeight: 800 }}>Saage</h1>
      <p className="muted">Hair &amp; Beauty Marketplace</p>
      <p style={{ margin: '18px 0 28px' }}>Book top barbers &amp; hairstylists near you.<br />Fast. Easy. Secure.</p>
      <div style={{ width: '100%' }}>
        <Link href="/register"><button className="btn btn-gold">Get Started</button></Link>
        <Link href="/login"><button className="btn btn-ghost">Log In</button></Link>
      </div>
    </main>
  );
}
