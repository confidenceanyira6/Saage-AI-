'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMe } from '@/lib/me';
import { fmtWhen } from '@/lib/format';
import { Avatar, Empty, Header, Loading } from '@/components/ui';

export default function MessagesPage() {
  const { me } = useMe();
  const uid = me?.id;
  const [rows, setRows] = useState<any[] | null>(null);
  const [names, setNames] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from('conversations').select('*').order('last_message_at', { ascending: false }).limit(50);
      const list = data ?? [];
      const ids = Array.from(new Set(list.map((c: any) => (c.customer_id === uid ? c.provider_id : c.customer_id)))) as string[];
      const map: Record<string, any> = {};
      if (ids.length) {
        const [pp, bz] = await Promise.all([
          supabase.rpc('public_profiles', { p_ids: ids }),
          supabase.from('providers').select('id,business_name').in('id', ids),
        ]);
        (pp.data ?? []).forEach((x: any) => { map[x.id] = { name: x.full_name, avatar: x.avatar_url }; });
        (bz.data ?? []).forEach((x: any) => { if (x.business_name) map[x.id] = { ...(map[x.id] ?? {}), name: x.business_name }; });
      }
      setNames(map);
      setRows(list);
    })();
  }, [uid]);

  return (
    <>
      <Header title="Chats" back={false} right={<Link href="/ai" className="icon-btn" aria-label="AI support">✨</Link>} />
      {rows === null ? <Loading /> : rows.length === 0 ? <Empty icon="💬" text="No conversations yet. Message a barber from their profile or booking." /> : rows.map((c) => {
        const o = names[c.customer_id === uid ? c.provider_id : c.customer_id] ?? {};
        return (
          <Link key={c.id} href={`/messages/${c.id}`} className="card row">
            <Avatar src={o.avatar} name={o.name} size={48} />
            <div className="grow"><b>{o.name ?? 'Chat'}</b><div className="muted small">{fmtWhen(c.last_message_at)}</div></div>
          </Link>
        );
      })}
    </>
  );
}
