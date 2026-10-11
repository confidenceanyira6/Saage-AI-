'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isProviderRole, useMe } from '@/lib/me';
import { fmtWhen, money } from '@/lib/format';
import { Avatar, Empty, Header, Loading, StatusPill } from '@/components/ui';

const UP = ['pending', 'accepted', 'confirmed', 'in_progress'];
const PAST = ['completed', 'refunded', 'disputed'];
const CAN = ['cancelled', 'rejected'];

export default function BookingsPage() {
  const { me } = useMe();
  const uid = me?.id;
  const pro = isProviderRole(me?.profile?.role);
  const [tab, setTab] = useState<'up' | 'past' | 'cancelled'>('up');
  const [rows, setRows] = useState<any[] | null>(null);
  const [names, setNames] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from('bookings').select('*, provider_services(name)').order('scheduled_start', { ascending: false }).limit(100);
      const list = data ?? [];
      const ids = Array.from(new Set(list.map((b: any) => (b.customer_id === uid ? b.provider_id : b.customer_id)))) as string[];
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

  const set = tab === 'up' ? UP : tab === 'past' ? PAST : CAN;
  let shown = (rows ?? []).filter((b) => set.includes(b.status));
  if (tab === 'up') shown = [...shown].sort((a, b) => +new Date(a.scheduled_start) - +new Date(b.scheduled_start));

  return (
    <>
      <Header title="My bookings" back={false} />
      <div className="seg">
        <button className={tab === 'up' ? 'on' : ''} onClick={() => setTab('up')}>Upcoming</button>
        <button className={tab === 'past' ? 'on' : ''} onClick={() => setTab('past')}>Past</button>
        <button className={tab === 'cancelled' ? 'on' : ''} onClick={() => setTab('cancelled')}>Cancelled</button>
      </div>
      {rows === null ? <Loading /> : shown.length === 0 ? (
        <>
          <Empty icon="📅" text="Nothing here yet." />
          {!pro && tab === 'up' && <Link href="/home"><button className="btn btn-gold">Find a barber</button></Link>}
        </>
      ) : shown.map((b) => {
        const iAmCustomer = b.customer_id === uid;
        const other = names[iAmCustomer ? b.provider_id : b.customer_id] ?? {};
        return (
          <Link key={b.id} href={`/bookings/${b.id}`} className="card row">
            <Avatar src={other.avatar} name={other.name} size={52} />
            <div className="grow">
              <b>{other.name ?? (iAmCustomer ? 'Barber' : 'Customer')}</b>
              <div className="muted small">{b.provider_services?.name}</div>
              <div className="muted small">{fmtWhen(b.scheduled_start)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <b className="goldtxt">{money(b.price, b.currency_code)}</b>
              <div style={{ marginTop: 4 }}><StatusPill status={b.status} provider={!iAmCustomer} /></div>
            </div>
          </Link>
        );
      })}
    </>
  );
}
