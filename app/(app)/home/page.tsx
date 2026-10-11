'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMe } from '@/lib/me';
import { Loading, Empty } from '@/components/ui';
import ProviderCard from '@/components/ProviderCard';

export default function HomePage() {
  const { me } = useMe();
  const router = useRouter();
  const p = me?.profile;
  const [list, setList] = useState<any[] | null>(null);
  const [q, setQ] = useState('');
  const first = (p?.full_name ?? '').split(' ')[0];

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const hasLoc = !!(p?.pref_country || p?.pref_state || p?.pref_city);
      let { data } = await supabase.rpc('search_providers', {
        p_limit: 6, p_country: p?.pref_country ?? null, p_state: p?.pref_state ?? null, p_city: p?.pref_city ?? null,
      });
      if (!data?.length && hasLoc) ({ data } = await supabase.rpc('search_providers', { p_limit: 6 }));
      setList(data ?? []);
    })();
  }, [p?.pref_country, p?.pref_state, p?.pref_city]);

  return (
    <>
      <div style={{ padding: '18px 0 6px' }}>
        <h1 style={{ fontSize: 24 }}>Hi{first ? `, ${first}` : ''} 👋</h1>
        <p className="muted">What are you looking for?</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); router.push(`/barbers?q=${encodeURIComponent(q)}`); }}>
        <input className="input" placeholder="Search barbers, styles or services…" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>

      <Link href="/barbers?type=male_barber" className="hero">
        <div className="big">✂️</div>
        <b style={{ fontSize: 18 }}>Men&apos;s Barber</b>
        <p className="muted small">Haircuts, fades, beard &amp; grooming</p>
      </Link>
      <Link href="/barbers?type=female_stylist" className="hero">
        <div className="big">💇‍♀️</div>
        <b style={{ fontSize: 18 }}>Women&apos;s Hairstylist</b>
        <p className="muted small">Braids, weaves, styling &amp; more</p>
      </Link>

      <div className="row between">
        <h2 className="h2">Top rated for you</h2>
        <Link href="/barbers" className="goldtxt small">See all</Link>
      </div>
      {list === null ? <Loading /> : list.length === 0 ? <Empty text="No barbers here yet. Check back soon!" /> : list.map((x) => <ProviderCard key={x.id} p={x} />)}

      <Link href="/ai"><button className="btn btn-ghost">✨ Chat with Saage customer care</button></Link>
    </>
  );
}
