'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMe } from '@/lib/me';
import { prettyType } from '@/lib/format';
import { Avatar, Loading, Empty } from '@/components/ui';
import { Icon } from '@/components/icons';
import ProviderCard from '@/components/ProviderCard';
import FeedPost from '@/components/FeedPost';

export default function HomePage() {
  const { me } = useMe();
  const router = useRouter();
  const p = me?.profile;
  const [list, setList] = useState<any[] | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [unread, setUnread] = useState(0);
  const [q, setQ] = useState('');

  useEffect(() => {
    const supabase = createClient();
    let dead = false;
    (async () => {
      const hasLoc = !!(p?.pref_country || p?.pref_state || p?.pref_city);
      let { data } = await supabase.rpc('search_providers', {
        p_limit: 12, p_country: p?.pref_country ?? null, p_state: p?.pref_state ?? null, p_city: p?.pref_city ?? null,
      });
      if (!data?.length && hasLoc) ({ data } = await supabase.rpc('search_providers', { p_limit: 12 }));
      const provs: any[] = data ?? [];
      if (dead) return;
      setList(provs);

      const ids = provs.map((x) => x.id);
      if (ids.length) {
        let r: any = await supabase.from('portfolio_items').select('*').in('provider_id', ids).order('created_at', { ascending: false }).limit(30);
        if (r.error) r = await supabase.from('portfolio_items').select('*').in('provider_id', ids).limit(30);
        if (!dead) setPosts(r.data ?? []);
      }
      const f = await supabase.from('favorite_providers').select('provider_id');
      if (!dead) setFavs(new Set((f.data ?? []).map((x: any) => x.provider_id)));
    })();
    return () => { dead = true; };
  }, [p?.pref_country, p?.pref_state, p?.pref_city]);

  useEffect(() => {
    if (!me) return;
    const supabase = createClient();
    (async () => {
      const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false);
      setUnread(count ?? 0);
    })();
  }, [me]);

  async function toggleFav(providerId: string) {
    if (!me) return;
    const supabase = createClient();
    const on = favs.has(providerId);
    const next = new Set(favs);
    if (on) next.delete(providerId); else next.add(providerId);
    setFavs(next);
    if (on) await supabase.from('favorite_providers').delete().eq('provider_id', providerId).eq('user_id', me.id);
    else await supabase.from('favorite_providers').insert({ user_id: me.id, provider_id: providerId });
  }

  const byId: Record<string, any> = {};
  (list ?? []).forEach((x) => { byId[x.id] = x; });
  const feed = posts.filter((x) => byId[x.provider_id]);
  const nameOf = (x: any) => x.business_name || x.full_name || prettyType(x.provider_type);

  return (
    <div className="bleed">
      <div className="ig-top">
        <Link href="/barbers" className="icon-btn" aria-label="Find a barber"><Icon name="plus" size={26} /></Link>
        <span className="ig-logo">Saage Barber</span>
        <Link href="/notifications" className="icon-btn" aria-label="Notifications">
          <Icon name="heart" size={26} />
          {unread > 0 && <span className="dot" style={{ top: 4, left: '55%' }}>{unread > 9 ? '9+' : unread}</span>}
        </Link>
      </div>

      <div className="stories">
        <Link href="/profile" className="story">
          <div className="mystory">
            <Avatar src={p?.avatar_url} name={p?.full_name} size={72} />
            <span className="plus">+</span>
          </div>
          <div className="nm">Your story</div>
        </Link>
        {(list ?? []).map((x) => (
          <Link key={x.id} href={`/barber/${x.id}`} className="story">
            <span className="ring"><span className="in"><Avatar src={x.avatar_url} name={nameOf(x)} size={62} /></span></span>
            <div className="nm">{nameOf(x)}</div>
          </Link>
        ))}
      </div>

      <form className="ig-search" onSubmit={(e) => { e.preventDefault(); router.push(`/barbers?q=${encodeURIComponent(q)}`); }}>
        <input className="input" placeholder="Search barbers, styles or services…" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>

      <div className="ig-sub">
        <Link href="/barbers?type=male_barber" className="chip">✂️ Men&apos;s Barber</Link>
        <Link href="/barbers?type=female_stylist" className="chip">💇‍♀️ Hairstylist</Link>
        <Link href="/ai" className="chip">✨ Care</Link>
      </div>

      {list === null ? <Loading /> : list.length === 0 ? (
        <Empty text="No barbers here yet. Check back soon!" />
      ) : feed.length > 0 ? (
        feed.map((x) => <FeedPost key={x.id} post={x} prov={byId[x.provider_id]} liked={favs.has(x.provider_id)} onToggle={toggleFav} />)
      ) : (
        <>
          <h2 className="h2" style={{ padding: '0 12px' }}>Barbers near you</h2>
          {list.map((x) => <ProviderCard key={x.id} p={x} />)}
        </>
      )}
    </div>
  );
}
