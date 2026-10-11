'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMe } from '@/lib/me';
import { MEN_CATEGORIES, WOMEN_CATEGORIES } from '@/lib/countries';
import { money } from '@/lib/format';
import { Empty, Header, Loading } from '@/components/ui';

export default function ProServicesPage() {
  const { me } = useMe();
  const uid = me?.id as string;
  const cur: string = me?.profile?.currency_code ?? 'NGN';
  const cats = me?.profile?.role === 'female_stylist' ? WOMEN_CATEGORIES : MEN_CATEGORIES;
  const [rows, setRows] = useState<any[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // service id, 'new', or null
  const [f, setF] = useState({ name: '', description: '', price: '', duration: '60', category: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await createClient().from('provider_services').select('*').eq('provider_id', uid).order('created_at');
    setRows(data ?? []);
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  function edit(s?: any) {
    setErr('');
    setEditing(s ? s.id : 'new');
    setF(s ? { name: s.name, description: s.description ?? '', price: String(s.price), duration: String(s.duration_minutes), category: s.category ?? '' } : { name: '', description: '', price: '', duration: '60', category: '' });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const price = Number(f.price), dur = parseInt(f.duration, 10);
    if (!(price > 0)) { setErr('Enter a price.'); return; }
    if (!(dur >= 5 && dur <= 720)) { setErr('Duration must be between 5 and 720 minutes.'); return; }
    setBusy(true);
    const body = { name: f.name.trim(), description: f.description.trim() || null, price, duration_minutes: dur, category: f.category.trim() || null };
    const supabase = createClient();
    const r = editing === 'new'
      ? await supabase.from('provider_services').insert({ ...body, provider_id: uid, currency_code: cur })
      : await supabase.from('provider_services').update(body).eq('id', editing!);
    setBusy(false);
    if (r.error) { setErr(r.error.message); return; }
    setEditing(null);
    load();
  }

  async function toggle(s: any) {
    await createClient().from('provider_services').update({ is_active: !s.is_active }).eq('id', s.id);
    load();
  }

  async function remove(s: any) {
    if (!confirm(`Delete "${s.name}"?`)) return;
    const { error } = await createClient().from('provider_services').delete().eq('id', s.id);
    if (error) { await toggle({ ...s, is_active: true }); alert('This service has bookings, so it was hidden instead of deleted.'); return; }
    load();
  }

  return (
    <>
      <Header title="My services" right={editing === null ? <button className="chip on" onClick={() => edit()}>+ Add</button> : undefined} />

      {editing !== null && (
        <form className="card" onSubmit={save}>
          <input className="input" placeholder="Service name (e.g. Skin fade)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          <label className="lbl">Category</label>
          <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            <option value="">None</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="grid2">
            <div><label className="lbl">Price ({cur})</label><input className="input" type="number" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} required /></div>
            <div><label className="lbl">Minutes</label><input className="input" type="number" inputMode="numeric" value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} required /></div>
          </div>
          <input className="input" placeholder="Short description (optional)" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          {err && <p className="err">{err}</p>}
          <button className="btn btn-gold" disabled={busy}>{busy ? 'Saving…' : 'Save service'}</button>
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
        </form>
      )}

      {rows === null ? <Loading /> : rows.length === 0 && editing === null ? <Empty text="Add your first service so customers can book you." /> : rows.map((s) => (
        <div key={s.id} className="card" style={{ opacity: s.is_active ? 1 : 0.55 }}>
          <div className="row between"><b>{s.name}</b><b className="goldtxt">{money(s.price, s.currency_code)}</b></div>
          <div className="muted small">{s.duration_minutes} mins{s.category ? ` · ${s.category}` : ''}{!s.is_active ? ' · Hidden' : ''}</div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="chip" onClick={() => edit(s)}>Edit</button>
            <button className="chip" onClick={() => toggle(s)}>{s.is_active ? 'Hide' : 'Show'}</button>
            <button className="chip" style={{ color: 'var(--bad)' }} onClick={() => remove(s)}>Delete</button>
          </div>
        </div>
      ))}
    </>
  );
}
