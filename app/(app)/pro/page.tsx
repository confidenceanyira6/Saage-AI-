'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMe } from '@/lib/me';
import { fmtWhen, money, niceError, prettyType } from '@/lib/format';
import { Avatar, Loading } from '@/components/ui';

export default function ProDashboard() {
  const { me } = useMe();
  const uid = me?.id as string;
  const cur: string = me?.profile?.currency_code ?? 'NGN';
  const prov = me?.provider;
  const [wallet, setWallet] = useState<any>(null);
  const [earn, setEarn] = useState<{ today: number; week: number; month: number }>({ today: 0, week: 0, month: 0 });
  const [reqs, setReqs] = useState<any[] | null>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, any>>({});
  const [setup, setSetup] = useState<{ services: number; hours: number } | null>(null);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    if (!uid) return;
    const supabase = createClient();
    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const range = async (from: Date) => {
      const { data } = await supabase.rpc('statement_summary', { p_from: from.toISOString(), p_to: new Date(now.getTime() + 60000).toISOString(), p_currency: cur });
      return Number((data ?? [])[0]?.total_credits ?? 0);
    };
    const [w, today, week, month, bk, sv, av] = await Promise.all([
      supabase.from('wallets').select('*').eq('currency_code', cur).maybeSingle(),
      range(start), range(new Date(now.getTime() - 7 * 86400000)), range(new Date(now.getTime() - 30 * 86400000)),
      supabase.from('bookings').select('*, provider_services(name)').in('status', ['pending', 'accepted', 'confirmed', 'in_progress']).order('scheduled_start', { ascending: true }).limit(50),
      supabase.from('provider_services').select('id', { count: 'exact', head: true }).eq('provider_id', uid).eq('is_active', true),
      supabase.from('provider_availability').select('id', { count: 'exact', head: true }).eq('provider_id', uid),
    ]);
    setWallet(w.data);
    setEarn({ today, week, month });
    const list = (bk.data ?? []).filter((b: any) => b.provider_id === uid);
    setReqs(list.filter((b: any) => b.status === 'pending'));
    setUpcoming(list.filter((b: any) => b.status !== 'pending'));
    setSetup({ services: sv.count ?? 0, hours: av.count ?? 0 });
    const ids = Array.from(new Set(list.map((b: any) => b.customer_id))) as string[];
    if (ids.length) {
      const { data } = await supabase.rpc('public_profiles', { p_ids: ids });
      const map: Record<string, any> = {};
      (data ?? []).forEach((x: any) => { map[x.id] = x; });
      setNames(map);
    }
  }, [uid, cur]);

  useEffect(() => { load(); }, [load]);

  async function decide(id: string, status: 'accepted' | 'rejected') {
    setBusyId(id); setErr('');
    const { error } = await createClient().rpc('update_booking_status', { p_booking_id: id, p_new_status: status });
    if (error) setErr(niceError(error.message));
    setBusyId('');
    load();
  }

  if (reqs === null || !setup) return <Loading />;
  const todo = [
    { ok: setup.services > 0, label: 'Add your services & prices', href: '/pro/services' },
    { ok: setup.hours > 0, label: 'Set your working hours', href: '/pro/schedule' },
    { ok: !!prov?.city, label: 'Set your shop location', href: '/pro/business' },
  ];
  const incomplete = todo.filter((t) => !t.ok);

  return (
    <>
      <div style={{ padding: '18px 0 10px' }}>
        <div className="row">
          <Avatar src={me?.profile?.avatar_url} name={me?.profile?.full_name} size={46} />
          <div className="grow">
            <h1 style={{ fontSize: 20 }}>{prov?.business_name || me?.profile?.full_name || 'Your business'}</h1>
            <div className="muted small">{prettyType(prov?.provider_type)} dashboard{prov?.is_vip ? ' · Premium' : ''}</div>
          </div>
        </div>
      </div>

      {incomplete.length > 0 && (
        <div className="card">
          <b>Finish setting up so customers can book you</b>
          {incomplete.map((t) => <Link key={t.href} href={t.href} className="row between small" style={{ marginTop: 10 }}><span>⬜ {t.label}</span><span className="goldtxt">Do it &rarr;</span></Link>)}
        </div>
      )}

      <div className="card" style={{ background: 'linear-gradient(135deg,var(--card2),var(--card))' }}>
        <div className="muted small">Available balance</div>
        <div style={{ fontSize: 30, fontWeight: 800 }} className="goldtxt">{money(wallet?.available_balance ?? 0, cur)}</div>
        {Number(wallet?.pending_balance ?? 0) > 0 && <div className="muted small">+ {money(wallet.pending_balance, cur)} held until customers confirm</div>}
        <Link href="/wallet?tab=out"><button className="btn btn-gold" style={{ marginTop: 12, marginBottom: 0 }}>Withdraw</button></Link>
      </div>

      <div className="grid2" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {([['Today', earn.today], ['7 days', earn.week], ['30 days', earn.month]] as [string, number][]).map(([l, v]) => (
          <div key={l} className="card" style={{ textAlign: 'center', padding: 10 }}><div className="muted tiny">{l}</div><b className="small">{money(v, cur)}</b></div>
        ))}
      </div>

      {err && <p className="err">{err}</p>}

      <h2 className="h2">Booking requests ({reqs.length})</h2>
      {reqs.length === 0 ? <p className="muted">No new requests.</p> : reqs.map((b) => (
        <div key={b.id} className="card">
          <Link href={`/bookings/${b.id}`}>
            <div className="row between"><b>{names[b.customer_id]?.full_name ?? 'Customer'}</b><b className="goldtxt">{money(b.price, b.currency_code)}</b></div>
            <div className="muted small">{b.provider_services?.name} &middot; {fmtWhen(b.scheduled_start)}{b.location_type === 'home' ? ' · Home service' : ''}</div>
          </Link>
          <div className="grid2" style={{ marginTop: 10 }}>
            <button className="btn btn-gold" style={{ marginBottom: 0 }} disabled={busyId === b.id} onClick={() => decide(b.id, 'accepted')}>Accept</button>
            <button className="btn btn-bad" style={{ marginBottom: 0 }} disabled={busyId === b.id} onClick={() => decide(b.id, 'rejected')}>Decline</button>
          </div>
        </div>
      ))}

      <h2 className="h2">Coming up</h2>
      {upcoming.length === 0 ? <p className="muted">No upcoming appointments.</p> : upcoming.map((b) => (
        <Link key={b.id} href={`/bookings/${b.id}`} className="card row between">
          <div className="grow"><b>{names[b.customer_id]?.full_name ?? 'Customer'}</b><div className="muted small">{b.provider_services?.name} &middot; {fmtWhen(b.scheduled_start)}</div></div>
          <span className="pill info">{b.status === 'in_progress' ? 'In progress' : b.escrow_status === 'held' ? 'Paid' : 'Awaiting payment'}</span>
        </Link>
      ))}
    </>
  );
}
