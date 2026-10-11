'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMe } from '@/lib/me';
import { COUNTRIES, MEN_CATEGORIES, WOMEN_CATEGORIES, countryName } from '@/lib/countries';
import { Header, Loading, Empty } from '@/components/ui';
import ProviderCard from '@/components/ProviderCard';

type Sort = 'all' | 'top' | 'nearest' | 'price';

export default function BarbersPage() {
  const { me, refresh } = useMe();
  const p = me?.profile;
  const [type, setType] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [sort, setSort] = useState<Sort>('all');
  const [rows, setRows] = useState<any[] | null>(null);
  const [ready, setReady] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [loc, setLoc] = useState({ country: '', state: '', city: '' });
  const [geoErr, setGeoErr] = useState('');

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setType(sp.get('type'));
    setQ(sp.get('q') ?? '');
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const supabase = createClient();
      const useGps = p?.pref_lat != null && p?.pref_lng != null;
      const args: any = { p_query: q.trim() || cat || null, p_min_rating: sort === 'top' ? 4.5 : null, p_limit: 50 };
      if (useGps) { args.p_lat = p.pref_lat; args.p_lng = p.pref_lng; args.p_radius_km = 40; }
      else { args.p_country = p?.pref_country ?? null; args.p_state = p?.pref_state ?? null; args.p_city = p?.pref_city ?? null; }
      const { data } = await supabase.rpc('search_providers', args);
      if (!cancelled) setRows(data ?? []);
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [ready, q, cat, sort, p?.pref_lat, p?.pref_lng, p?.pref_country, p?.pref_state, p?.pref_city]);

  const list = useMemo(() => {
    let r = (rows ?? []).filter((x: any) => !type || x.provider_type === type);
    if (sort === 'nearest') r = [...r].sort((a: any, b: any) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));
    if (sort === 'price') r = [...r].sort((a: any, b: any) => Number(a.min_price ?? 1e12) - Number(b.min_price ?? 1e12));
    return r;
  }, [rows, type, sort]);

  const cats = type === 'female_stylist' ? WOMEN_CATEGORIES : type === 'male_barber' ? MEN_CATEGORIES : [];
  const title = type === 'female_stylist' ? 'Hairstylists' : type === 'male_barber' ? 'Barbers' : 'Find barbers';
  const locLabel = p?.pref_lat != null ? 'Near me' : [p?.pref_city, p?.pref_state, countryName(p?.pref_country)].filter(Boolean).join(', ') || 'Everywhere';

  async function savePrefs(patch: any) {
    const supabase = createClient();
    await supabase.from('profiles').update(patch).eq('id', me!.id);
    await refresh();
    setLocOpen(false);
  }

  function useGps() {
    setGeoErr('');
    if (!navigator.geolocation) { setGeoErr('Location is not available on this device.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => savePrefs({ pref_lat: pos.coords.latitude, pref_lng: pos.coords.longitude, pref_city: null, pref_state: null, pref_country: null }),
      () => setGeoErr('Could not get your location. Allow location access and try again.'),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  return (
    <>
      <Header title={title} />
      <input className="input" placeholder="Search barbers, styles or services…" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="row between" style={{ marginBottom: 10 }}>
        <span className="small">📍 {locLabel}</span>
        <button className="chip" onClick={() => { setLoc({ country: p?.pref_country ?? '', state: p?.pref_state ?? '', city: p?.pref_city ?? '' }); setLocOpen(!locOpen); }}>Change</button>
      </div>

      {locOpen && (
        <div className="card">
          <label className="lbl">Country</label>
          <select className="input" value={loc.country} onChange={(e) => setLoc({ ...loc, country: e.target.value })}>
            <option value="">Anywhere</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
          <input className="input" placeholder="State / region (optional)" value={loc.state} onChange={(e) => setLoc({ ...loc, state: e.target.value })} />
          <input className="input" placeholder="Town or city (optional)" value={loc.city} onChange={(e) => setLoc({ ...loc, city: e.target.value })} />
          <button className="btn btn-gold" onClick={() => savePrefs({ pref_country: loc.country || null, pref_state: loc.state.trim() || null, pref_city: loc.city.trim() || null, pref_lat: null, pref_lng: null })}>Search here</button>
          <button className="btn" onClick={useGps}>📍 Use my current location</button>
          <button className="btn btn-ghost" onClick={() => savePrefs({ pref_country: null, pref_state: null, pref_city: null, pref_lat: null, pref_lng: null })}>Search everywhere</button>
          {geoErr && <p className="err">{geoErr}</p>}
        </div>
      )}

      {cats.length > 0 && (
        <div className="chips">
          {cats.map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(cat === c ? '' : c)}>{c}</button>)}
        </div>
      )}

      <div className="chips">
        {([['all', 'All'], ['top', 'Top rated'], ['nearest', 'Nearest'], ['price', 'Price']] as [Sort, string][]).map(([k, label]) => (
          <button key={k} className={`chip ${sort === k ? 'on' : ''}`} onClick={() => setSort(k)}>{label}</button>
        ))}
      </div>

      {rows === null ? <Loading /> : list.length === 0 ? (
        <>
          <Empty text="No matches here yet. Try a different search or location." />
          {locLabel !== 'Everywhere' && <button className="btn" onClick={() => savePrefs({ pref_country: null, pref_state: null, pref_city: null, pref_lat: null, pref_lng: null })}>Search everywhere</button>}
        </>
      ) : list.map((x: any) => <ProviderCard key={x.id} p={x} />)}
    </>
  );
}
