'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { COUNTRIES } from '@/lib/countries';

type Role = 'customer' | 'male_barber' | 'female_stylist';

// Role and country travel in the sign-up metadata; the handle_new_user DB trigger
// validates them and creates the profile + wallet. A user can only ever become a
// customer, barber or stylist this way - admin can never be self-assigned.
export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('NG');
  const [role, setRole] = useState<Role>('customer');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const c = COUNTRIES.find((x) => x.code === country) ?? COUNTRIES[0];
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), role, country_code: c.code, currency_code: c.cur },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    setLoading(false);
    if (signUpError) { setError(signUpError.message); return; }
    if (data.session) { router.replace('/home'); router.refresh(); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <main className="center" style={{ maxWidth: 400, margin: '0 auto' }}>
        <div style={{ fontSize: 48 }}>📬</div>
        <h2>Check your email</h2>
        <p className="muted">We sent a confirmation link to {email}. Confirm it, then log in.</p>
        <Link href="/login" style={{ width: '100%' }}><button className="btn btn-gold">Go to log in</button></Link>
      </main>
    );
  }

  const roles: { v: Role; label: string }[] = [
    { v: 'customer', label: 'Customer' },
    { v: 'male_barber', label: 'Barber' },
    { v: 'female_stylist', label: 'Hairstylist' },
  ];

  return (
    <main style={{ maxWidth: 400, margin: '0 auto', padding: 24 }}>
      <h1 style={{ margin: '24px 0 4px' }}>Create account</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Join Saage to book or offer hair services</p>
      <div className="seg">
        {roles.map((r) => (
          <button key={r.v} type="button" className={role === r.v ? 'on' : ''} onClick={() => setRole(r.v)}>{r.label}</button>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <input className="input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <input className="input" type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password (min 8 characters)" minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <label className="lbl">Country</label>
        <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.cur})</option>)}
        </select>
        {error && <p className="err">{error}</p>}
        <button className="btn btn-gold" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="muted small" style={{ textAlign: 'center', marginTop: 12 }}>Already have an account? <Link href="/login" className="goldtxt">Log in</Link></p>
    </main>
  );
}
