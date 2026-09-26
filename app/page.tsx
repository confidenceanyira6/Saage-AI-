import Link from 'next/link';

export default function SplashPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 24, textAlign: 'center' }}>
      <h1 style={{ fontSize: 32, marginBottom: 4 }}>Saage <span style={{ color: 'var(--orange)' }}>Barber</span></h1>
      <p style={{ opacity: 0.7, marginBottom: 32 }}>Look Good. Feel Good. Book Easy.</p>
      <div style={{ width: '100%', maxWidth: 320 }}>
        <Link href="/register"><button className="btn-primary" style={{ marginBottom: 12 }}>Get Started</button></Link>
        <Link href="/login"><button className="btn-primary" style={{ background: 'transparent', color: 'var(--text)', border: '1px solid #ccc' }}>Log In</button></Link>
      </div>
    </main>
  );
}
