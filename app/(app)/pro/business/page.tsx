'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMe } from '@/lib/me';
import { callFn } from '@/lib/fn';
import { COUNTRIES } from '@/lib/countries';
import { niceError, publicUrl, wordCount } from '@/lib/format';
import { Header } from '@/components/ui';

export default function ProBusinessPage() {
  const { me, refresh } = useMe();
  const uid = me?.id as string;
  const prov = me?.provider ?? {};
  const [f, setF] = useState({
    business_name: prov.business_name ?? '', bio: prov.bio ?? '', country: prov.country_code ?? me?.profile?.country_code ?? 'NG',
    state: prov.state ?? '', city: prov.city ?? '', radius: String(prov.service_radius_km ?? 10), travel: String(prov.travel_fee ?? 0),
    address: '',
  });
  const [home, setHome] = useState<boolean>(!!prov.home_service_enabled);
  const [port, setPort] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const loadPort = useCallback(async () => {
    const { data } = await createClient().from('portfolio_items').select('*').eq('provider_id', uid).order('created_at', { ascending: false });
    setPort(data ?? []);
  }, [uid]);
  useEffect(() => { loadPort(); }, [loadPort]);

  function flash(m: string, e = '') { setMsg(m); setErr(e); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    flash('');
    if (wordCount(f.bio) > 15) { flash('', 'Bio can be at most 15 words.'); return; }
    setBusy(true);
    const { error } = await createClient().from('providers').update({
      business_name: f.business_name.trim() || null, bio: f.bio.trim() || null, country_code: f.country,
      state: f.state.trim() || null, city: f.city.trim() || null,
      service_radius_km: parseInt(f.radius, 10) || 10, travel_fee: Number(f.travel) || 0,
    }).eq('id', uid);
    setBusy(false);
    if (error) { flash('', error.message); return; }
    flash('Saved.');
    refresh();
  }

  function pinShop() {
    flash('');
    if (!navigator.geolocation) { flash('', 'Location is not available on this device.'); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { error } = await createClient().rpc('set_my_location', {
        p_lat: pos.coords.latitude, p_lng: pos.coords.longitude, p_address: f.address.trim() || null,
        p_country: f.country, p_state: f.state.trim() || null, p_city: f.city.trim() || null,
      });
      if (error) flash('', niceError(error.message)); else { flash('Shop pinned. Customers near you can now find you.'); refresh(); }
    }, () => flash('', 'Could not get your location. Stand at your shop, allow location access and try again.'), { timeout: 12000 });
  }

  async function toggleHome() {
    flash('');
    const next = !home;
    const { error } = await createClient().from('providers').update({ home_service_enabled: next }).eq('id', uid);
    if (error) { flash('', 'Home service needs an active Premium subscription and a verified ID.'); return; }
    setHome(next);
    refresh();
  }

  async function goPremium() {
    flash(''); setBusy(true);
    const { data, error } = await callFn('payments-init', { purpose: 'vip_subscription', months: 1 });
    setBusy(false);
    if (error || !data?.url) { flash('', niceError(error)); return; }
    window.location.href = data.url;
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    flash('');
    const supabase = createClient();
    for (const file of Array.from(files).slice(0, 6)) {
      if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) { flash('', 'Images only, up to 5 MB each.'); continue; }
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const up = await supabase.storage.from('portfolio').upload(path, file, { contentType: file.type });
      if (up.error) { flash('', up.error.message); continue; }
      await supabase.from('portfolio_items').insert({ provider_id: uid, image_path: path });
    }
    loadPort();
  }

  async function delPhoto(p: any) {
    const supabase = createClient();
    await supabase.from('portfolio_items').delete().eq('id', p.id);
    if (!/^https?:/.test(p.image_path)) await supabase.storage.from('portfolio').remove([p.image_path]);
    loadPort();
  }

  return (
    <>
      <Header title="Business profile" />
      <form className="card" onSubmit={save}>
        <label className="lbl">Business name</label>
        <input className="input" value={f.business_name} onChange={(e) => setF({ ...f, business_name: e.target.value })} placeholder="FreshCuts Studio" />
        <label className="lbl">Bio ({wordCount(f.bio)}/15 words)</label>
        <input className="input" value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />
        <label className="lbl">Country</label>
        <select className="input" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
        <div className="grid2">
          <input className="input" placeholder="State" value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} />
          <input className="input" placeholder="Town / city" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
        </div>
        <input className="input" placeholder="Shop street address (shown after booking)" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        <div className="grid2">
          <div><label className="lbl">Service radius (km)</label><input className="input" type="number" value={f.radius} onChange={(e) => setF({ ...f, radius: e.target.value })} /></div>
          <div><label className="lbl">Travel fee</label><input className="input" type="number" value={f.travel} onChange={(e) => setF({ ...f, travel: e.target.value })} /></div>
        </div>
        {err && <p className="err">{err}</p>}
        {msg && <p className="okmsg">{msg}</p>}
        <button className="btn btn-gold" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn" onClick={pinShop}>📍 Pin my shop on the map (use GPS)</button>
      </form>

      <h2 className="h2">Home service &amp; Premium</h2>
      <div className="card">
        <p className="small muted" style={{ marginBottom: 10 }}>{prov.is_vip ? '⭐ Premium is active.' : 'Premium lets you offer home service and ranks you higher in search.'}</p>
        {!prov.is_vip && <button className="btn btn-gold" disabled={busy} onClick={goPremium}>Go Premium</button>}
        <button className="btn" onClick={toggleHome}>{home ? 'Turn OFF home service' : 'Turn ON home service'}</button>
      </div>

      <h2 className="h2">Portfolio</h2>
      <div className="card">
        <label className="btn btn-gold" style={{ cursor: 'pointer' }}>+ Add photos<input type="file" accept="image/*" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} /></label>
        <div className="thumbs">
          {port.map((p) => (
            <div key={p.id} style={{ position: 'relative' }}>
              <img src={publicUrl('portfolio', p.image_path)} alt="" />
              <button className="icon-btn" style={{ position: 'absolute', top: 4, right: 4, width: 26, height: 26 }} onClick={() => delPhoto(p)} aria-label="Delete photo">✕</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
