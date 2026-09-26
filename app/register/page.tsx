'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Real Supabase auth: password hashing, session tokens, and email
// confirmation are all handled server-side by Supabase Auth — nothing
// mocked here.
export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'customer' | 'male_barber' | 'female_stylist'>('customer');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Profile row is auto-created by the on_auth_user_created DB trigger.
    // Role assignment happens server-side to prevent a user from granting
    // themselves admin/provider status from the frontend.
    if (data.user && role !== 'customer') {
      await fetch('/api/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.user.id, role }),
      });
    }

    setLoading(false);
    router.push('/login');
  }

  return (
    <main style={{ maxWidth: 380, margin: '0 auto', padding: 24 }}>
      <h1>Create Account</h1>
      <form onSubmit={handleSubmit}>
        <input className="input" placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)} required />
        <input className="input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password (min 8 chars)" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required />
        <div style={{ marginBottom: 12 }}>
          <label><input type="radio" checked={role === 'customer'} onChange={() => setRole('customer')} /> Customer</label><br />
          <label><input type="radio" checked={role === 'male_barber'} onChange={() => setRole('male_barber')} /> Male Barber</label><br />
          <label><input type="radio" checked={role === 'female_stylist'} onChange={() => setRole('female_stylist')} /> Female Hair Stylist</label>
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button className="btn-primary" disabled={loading}>{loading ? 'Creating…' : 'Create Account'}</button>
      </form>
    </main>
  );
}
