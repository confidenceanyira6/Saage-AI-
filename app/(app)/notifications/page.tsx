'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMe } from '@/lib/me';
import { fmtWhen } from '@/lib/format';
import { Empty, Header, Loading } from '@/components/ui';

export default function NotificationsPage() {
  const { me } = useMe();
  const router = useRouter();
  const [rows, setRows] = useState<any[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await createClient().from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
    setRows(data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function open(n: any) {
    if (!n.is_read) await createClient().from('notifications').update({ is_read: true }).eq('id', n.id);
    if (n.data?.booking_id) router.push(`/bookings/${n.data.booking_id}`);
    else load();
  }

  async function markAll() {
    await createClient().from('notifications').update({ is_read: true }).eq('user_id', me!.id).eq('is_read', false);
    load();
  }

  return (
    <>
      <Header title="Notifications" back={false} right={rows?.some((r) => !r.is_read) ? <button className="chip" onClick={markAll}>Read all</button> : undefined} />
      {rows === null ? <Loading /> : rows.length === 0 ? <Empty icon="🔔" text="You are all caught up." /> : rows.map((n) => (
        <button key={n.id} className="card" style={{ width: '100%', textAlign: 'left', borderColor: n.is_read ? undefined : 'var(--gold)' }} onClick={() => open(n)}>
          <div className="row between"><b>{n.title}</b><span className="muted tiny">{fmtWhen(n.created_at)}</span></div>
          {n.body && <div className="muted small" style={{ marginTop: 4 }}>{n.body}</div>}
        </button>
      ))}
    </>
  );
}
