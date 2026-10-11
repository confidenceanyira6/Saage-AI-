'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (signInError) { setError(signInError.message); return; }
    router.replace('/home');
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 400, margin: '0 auto', padding: 24 }}>
      <div className="logo" style={{ marginTop: 40 }}>S</div>
      <h1 style={{ textAlign: 'center', marginBottom: 4 }}>Welcome back</h1>
      <p className="muted" style={{ textAlign: 'center', marginBottom: 24 }}>Log in to book or manage your appointments</p>
      <form onSubmit={handleSubmit}>
        <input className="input" type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="err">{error}</p>}
        <button className="btn btn-gold" disabled={loading}>{loading ? 'Logging in…' : 'Log in'}</button>
      </form>
      <p className="muted small" style={{ textAlign: 'center', marginTop: 12 }}>New here? <Link href="/register" className="goldtxt">Create an account</Link></p>
    </main>
  );
}
