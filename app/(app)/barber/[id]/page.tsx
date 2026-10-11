'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMe } from '@/lib/me';
import { openConversation } from '@/lib/chat';
import { money, prettyType, publicUrl, fmtDay } from '@/lib/format';
import { Avatar, Header, Loading, Stars } from '@/components/ui';

export default function BarberProfilePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { me } = useMe();
  const [d, setD] = useState<any>(null);
  const [fav, setFav] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [prov, prof, svcs, port, revs, favs] = await Promise.all([
        supabase.from('providers').select('*').eq('id', id).maybeSingle(),
        supabase.rpc('public_profiles', { p_ids: [id] }),
        supabase.from('provider_services').select('*').eq('provider_id', id).eq('is_active', true).order('price'),
        supabase.from('portfolio_items').select('*').eq('provider_id', id).order('sort_order').limit(12),
        supabase.from('reviews').select('*').eq('provider_id', id).order('created_at', { ascending: false }).limit(10),
        supabase.from('favorite_providers').select('provider_id').eq('provider_id', id),
      ]);
      if (!prov.data) { setD(false); return; }
      const reviews = revs.data ?? [];
      const names: Record<string, any> = {};
      if (reviews.length) {
        const ids = Array.from(new Set(reviews.map((r: any) => r.customer_id))) as string[];
        const { data } = await supabase.rpc('public_profiles', { p_ids: ids });
        (data ?? []).forEach((x: any) => { names[x.id] = x; });
      }
      setFav((favs.data ?? []).length > 0);
      setD({ prov: prov.data, prof: (prof.data ?? [])[0] ?? {}, svcs: svcs.data ?? [], port: port.data ?? [], reviews, names });
    })();
  }, [id]);

  async function toggleFav() {
    const supabase = createClient();
    if (fav) await supabase.from('favorite_providers').delete().eq('provider_id', id).eq('user_id', me!.id);
    else await supabase.from('favorite_providers').insert({ user_id: me!.id, provider_id: id });
    setFav(!fav);
  }

  async function message() {
    setErr('');
    try {
      const cid = await openConversation(createClient(), me!.id, id);
      router.push(`/messages/${cid}`);
    } catch (e: any) { setErr(e?.message ?? 'Could not open chat.'); }
  }

  if (d === null) return <><Header title="Profile" /><Loading /></>;
  if (d === false) return <><Header title="Profile" /><p className="muted">This profile is not available.</p></>;

  const { prov, prof, svcs, port, reviews, names } = d;
  const name = prov.business_name || prof.full_name || prettyType(prov.provider_type);
  const mine = me?.id === id;

  return (
    <>
      <Header title="" right={!mine ? <button className="icon-btn" onClick={toggleFav} aria-label="Favourite">{fav ? '❤️' : '🤍'}</button> : undefined} />
      <div className="row" style={{ marginBottom: 12 }}>
        <Avatar src={prof.avatar_url} name={name} size={72} />
        <div className="grow">
          <h2>{name}</h2>
          <Stars value={prov.rating_avg} count={prov.rating_count} />
          <div className="muted small">{[prov.city, prov.state].filter(Boolean).join(', ') || 'Location not set'}</div>
        </div>
      </div>
      <div>
        <span className="tag">{prettyType(prov.provider_type)}</span>
        {prov.is_vip && <span className="tag gold">Premium</span>}
        {prov.home_service_enabled && <span className="tag">Home service</span>}
      </div>
      {prov.bio && <p style={{ margin: '12px 0' }}>{prov.bio}</p>}

      {!mine && (
        <div className="grid2" style={{ margin: '14px 0' }}>
          <Link href={`/book/${id}`}><button className="btn btn-gold" style={{ marginBottom: 0 }} disabled={svcs.length === 0}>Book now</button></Link>
          <button className="btn" style={{ marginBottom: 0 }} onClick={message}>💬 Message</button>
        </div>
      )}
      {err && <p className="err">{err}</p>}

      <h2 className="h2">Services</h2>
      {svcs.length === 0 ? <p className="muted">No services listed yet.</p> : svcs.map((s: any) => (
        <div key={s.id} className="card row between">
          <div className="grow">
            <b>{s.name}</b>
            <div className="muted small">{s.duration_minutes} mins{s.category ? ` · ${s.category}` : ''}</div>
            {s.description && <div className="muted small">{s.description}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <b className="goldtxt">{money(s.price, s.currency_code)}</b>
            {!mine && <div><Link href={`/book/${id}?service=${s.id}`} className="small">Book &rarr;</Link></div>}
          </div>
        </div>
      ))}

      {port.length > 0 && (
        <>
          <h2 className="h2">Portfolio</h2>
          <div className="thumbs">{port.map((x: any) => <img key={x.id} src={publicUrl('portfolio', x.image_path)} alt={x.caption ?? ''} />)}</div>
        </>
      )}

      <h2 className="h2">Reviews ({prov.rating_count})</h2>
      {reviews.length === 0 ? <p className="muted">No reviews yet.</p> : reviews.map((r: any) => (
        <div key={r.id} className="card">
          <div className="row between"><b>{names[r.customer_id]?.full_name?.split(' ')[0] ?? 'Customer'}</b><Stars value={r.rating} /></div>
          {r.comment && <p style={{ marginTop: 6 }}>{r.comment}</p>}
          <div className="muted tiny" style={{ marginTop: 4 }}>{fmtDay(r.created_at)}</div>
        </div>
      ))}
    </>
  );
}
