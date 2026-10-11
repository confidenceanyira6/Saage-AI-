'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { applyTheme, isProviderRole, useMe } from '@/lib/me';
import { countryName } from '@/lib/countries';
import { prettyType, publicUrl, wordCount } from '@/lib/format';
import { Avatar, Header } from '@/components/ui';

export default function ProfilePage() {
  const { me, refresh } = useMe();
  const router = useRouter();
  const p = me?.profile ?? {};
  const pro = isProviderRole(p.role);
  const [name, setName] = useState<string>(p.full_name ?? '');
  const [phone, setPhone] = useState<string>(p.phone ?? '');
  const [bio, setBio] = useState<string>(p.bio ?? '');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(''); setErr('');
    if (wordCount(bio) > 15) { setErr('Bio can be at most 15 words.'); return; }
    setBusy(true);
    const { error } = await createClient().from('profiles').update({ full_name: name.trim(), phone: phone.trim() || null, bio: bio.trim() || null }).eq('id', me!.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setMsg('Saved.');
    refresh();
  }

  async function uploadAvatar(file: File) {
    setErr(''); setMsg('');
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) { setErr('Choose an image under 5 MB.'); return; }
    const supabase = createClient();
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${me!.id}/avatar-${Date.now()}.${ext}`;
    const up = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) { setErr(up.error.message); return; }
    await supabase.from('profiles').update({ avatar_url: publicUrl('avatars', path) }).eq('id', me!.id);
    refresh();
  }

  async function setTheme(t: 'dark' | 'light') {
    applyTheme(t);
    await createClient().from('profiles').update({ theme: t }).eq('id', me!.id);
    refresh();
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.replace('/');
    router.refresh();
  }

  const kyc = p.identity_verification as string;
  const row = (href: string, icon: string, label: string, sub?: string) => (
    <Link href={href} className="card row between"><span>{icon} {label}</span><span className="muted small">{sub ?? '›'}</span></Link>
  );

  return (
    <>
      <Header title="Profile" back={false} />
      <div className="card row">
        <label style={{ cursor: 'pointer' }}>
          <Avatar src={p.avatar_url} name={p.full_name} size={68} />
          <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
        </label>
        <div className="grow">
          <b>{p.full_name || 'Your name'}</b>
          <div className="muted small">{me?.email}</div>
          <div className="muted small">{p.role === 'customer' ? 'Customer' : prettyType(p.role)} &middot; {countryName(p.country_code)}</div>
          <div className="tiny goldtxt">Tap photo to change</div>
        </div>
      </div>

      {pro && (
        <>
          <h2 className="h2">Business</h2>
          {row('/pro/services', '✂️', 'My services')}
          {row('/pro/schedule', '🗓️', 'Availability & days off')}
          {row('/pro/business', '🏪', 'Business profile, location & portfolio')}
          {row('/wallet?tab=out', '💸', 'Earnings & withdrawals')}
        </>
      )}

      <h2 className="h2">Account</h2>
      {row('/wallet', '💳', 'Wallet')}
      {row('/verify', '🪪', 'Identity verification', kyc === 'verified' ? 'Verified ✓' : kyc === 'pending' ? 'Pending' : kyc === 'rejected' ? 'Rejected' : 'Not verified')}
      {row('/ai', '✨', 'Customer care (AI)')}

      <h2 className="h2">Edit details</h2>
      <form className="card" onSubmit={save}>
        <label className="lbl">Full name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        <label className="lbl">Phone</label>
        <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <label className="lbl">Bio ({wordCount(bio)}/15 words)</label>
        <input className="input" value={bio} onChange={(e) => setBio(e.target.value)} />
        {err && <p className="err">{err}</p>}
        {msg && <p className="okmsg">{msg}</p>}
        <button className="btn btn-gold" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </form>

      <h2 className="h2">Appearance</h2>
      <div className="seg">
        <button className={p.theme === 'light' ? '' : 'on'} onClick={() => setTheme('dark')}>Dark</button>
        <button className={p.theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}>Light</button>
      </div>

      <button className="btn btn-bad" style={{ marginTop: 16 }} onClick={signOut}>Log out</button>
    </>
  );
}
