'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMe } from '@/lib/me';
import { openConversation } from '@/lib/chat';
import { money, prettyType, publicUrl } from '@/lib/format';
import { Avatar } from '@/components/ui';
import { Icon } from '@/components/icons';

export default function FeedPost({
  post, prov, liked, onToggle,
}: { post: any; prov: any; liked: boolean; onToggle: (providerId: string) => void }) {
  const router = useRouter();
  const { me } = useMe();
  const [busy, setBusy] = useState(false);
  const name = prov.business_name || prov.full_name || prettyType(prov.provider_type);
  const place = [prov.city, prov.state].filter(Boolean).join(', ');

  async function message() {
    if (!me || busy) return;
    setBusy(true);
    try {
      const cid = await openConversation(createClient(), me.id, prov.id);
      router.push(`/messages/${cid}`);
    } catch { setBusy(false); }
  }

  async function share() {
    const url = `${window.location.origin}/barber/${prov.id}`;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else await navigator.clipboard.writeText(url);
    } catch {}
  }

  return (
    <article className="post">
      <div className="post-h">
        <Link href={`/barber/${prov.id}`} className="ring sm">
          <span className="in"><Avatar src={prov.avatar_url} name={name} size={30} /></span>
        </Link>
        <Link href={`/barber/${prov.id}`} className="who">
          <b>{name}{prov.is_vip && <span className="vtick">✓</span>}</b>
          <span>{place || prettyType(prov.provider_type)}</span>
        </Link>
        <Link href={`/barber/${prov.id}`} className="icon-btn" aria-label="Open profile"><Icon name="dots" size={20} /></Link>
      </div>

      <img className="post-img" src={publicUrl('portfolio', post.image_path)} alt={post.caption ?? ''} loading="lazy" />

      <div className="post-a">
        <button onClick={() => onToggle(prov.id)} className={liked ? 'liked' : ''} aria-label="Favourite">
          <Icon name="heart" size={26} filled={liked} />
        </button>
        <button onClick={message} aria-label="Message"><Icon name="comment" size={25} /></button>
        <button onClick={share} aria-label="Share"><Icon name="send" size={25} /></button>
        <span className="sp" />
        <Link href={`/book/${prov.id}`} aria-label="Book"><Icon name="bookmark" size={25} /></Link>
      </div>

      <div className="post-m">
        <div><b>★ {Number(prov.rating_avg || 0).toFixed(1)}</b> ({prov.rating_count ?? 0} reviews){prov.min_price != null ? <> · from <b>{money(prov.min_price, prov.currency_code)}</b></> : null}</div>
        {post.caption && <div className="cap"><b>{name}</b> {post.caption}</div>}
        <Link href={`/barber/${prov.id}`} className="more">View profile &amp; services</Link>
      </div>

      <Link href={`/book/${prov.id}`} className="post-book"><button className="btn btn-gold" style={{ marginBottom: 0 }}>Book now</button></Link>
    </article>
  );
}
