'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) { setError(signInError.message); return; }
    router.push('/dashboard');
  }

  return (
    <main style={{ maxWidth: 380, margin: '0 auto', padding: 24 }}>
      <h1>Welcome Back</h1>
      <form onSubmit={handleSubmit}>
        <input className="input" type="email" placeholder="Email or Phone" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button className="btn-primary" disabled={loading}>{loading ? 'Logging in…' : 'Login'}</button>
      </form>
    </main>
  );
}
