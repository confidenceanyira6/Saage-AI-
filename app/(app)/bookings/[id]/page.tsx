'use client';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMe } from '@/lib/me';
import { callFn } from '@/lib/fn';
import { openConversation } from '@/lib/chat';
import { fmtWhen, money, niceError } from '@/lib/format';
import { Avatar, Header, Loading, StarInput, StatusPill } from '@/components/ui';

export default function BookingDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { me } = useMe();
  const uid = me?.id as string;
  const [b, setB] = useState<any>(null);
  const [svc, setSvc] = useState<any>(null);
  const [other, setOther] = useState<any>({});
  const [wallet, setWallet] = useState<number | null>(null);
  const [review, setReview] = useState<any>(null);
  const [addr, setAddr] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [showDispute, setShowDispute] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: bk } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();
    if (!bk) { setB(false); return; }
    const isCustomer = bk.customer_id === uid;
    const otherId = isCustomer ? bk.provider_id : bk.customer_id;
    const [s, pp, bz, rv, w] = await Promise.all([
      supabase.from('provider_services').select('name,duration_minutes').eq('id', bk.service_id).maybeSingle(),
      supabase.rpc('public_profiles', { p_ids: [otherId] }),
      supabase.from('providers').select('business_name').eq('id', bk.provider_id).maybeSingle(),
      supabase.from('reviews').select('*').eq('booking_id', bk.id).maybeSingle(),
      supabase.from('wallets').select('available_balance').eq('user_id', uid).eq('currency_code', bk.currency_code).maybeSingle(),
    ]);
    const prof = ((pp as any).data ?? [])[0] ?? {};
    setOther({ name: isCustomer ? ((bz as any).data?.business_name || prof.full_name) : prof.full_name, avatar: prof.avatar_url, id: otherId });
    setSvc((s as any).data);
    setReview((rv as any).data);
    setWallet(isCustomer ? Number((w as any).data?.available_balance ?? 0) : null);
    if (bk.location_type === 'home') {
      try {
        const { data: l } = await supabase.rpc('get_booking_location', { p_booking: bk.id });
        setAddr(typeof l === 'string' ? l : l?.service_address ?? l?.address ?? '');
      } catch {}
    }
    setB(bk);
  }, [id, uid]);

  useEffect(() => { load(); }, [load]);

  async function run(fn: () => PromiseLike<any>) {
    setBusy(true); setErr('');
    try {
      const r: any = await fn();
      if (r?.error) setErr(niceError(r.error.message ?? String(r.error)));
    } catch (e: any) { setErr(niceError(e?.message)); }
    await load();
    setBusy(false);
  }

  const setStatus = (s: string) => run(() => createClient().rpc('update_booking_status', { p_booking_id: id, p_new_status: s }));

  async function payCard() {
    setBusy(true); setErr('');
    const { data, error } = await callFn('payments-init', { purpose: 'booking', booking_id: id });
    setBusy(false);
    if (error || !data?.url) { setErr(niceError(error)); return; }
    window.location.href = data.url;
  }

  async function chat() {
    try {
      const supabase = createClient();
      const cid = await openConversation(supabase, b.customer_id, b.provider_id, b.id);
      router.push(`/messages/${cid}`);
    } catch (e: any) { setErr(e?.message ?? 'Could not open chat.'); }
  }

  if (b === null) return <><Header title="Booking" /><Loading /></>;
  if (b === false) return <><Header title="Booking" /><p className="muted">Booking not found.</p></>;

  const isCustomer = b.customer_id === uid;
  const isPro = b.provider_id === uid;
  const unpaid = b.escrow_status === 'none';
  const canPay = isCustomer && ['accepted', 'confirmed'].includes(b.status) && unpaid;
  const enough = (wallet ?? 0) >= Number(b.price);

  return (
    <>
      <Header title="Booking" />

      <div className="card">
        <div className="row">
          <Avatar src={other.avatar} name={other.name} size={56} />
          <div className="grow"><b>{other.name ?? (isCustomer ? 'Barber' : 'Customer')}</b><div className="muted small">{svc?.name} &middot; {svc?.duration_minutes} mins</div></div>
          <StatusPill status={b.status} provider={isPro} />
        </div>
        <hr style={{ borderColor: 'var(--line)', opacity: 0.4, margin: '12px 0' }} />
        <div className="row between small"><span className="muted">When</span><span>{fmtWhen(b.scheduled_start)}</span></div>
        <div className="row between small" style={{ marginTop: 6 }}><span className="muted">Where</span><span>{b.location_type === 'home' ? 'At customer\'s place' : 'At the shop'}</span></div>
        {b.location_type === 'home' && addr && <div className="small" style={{ marginTop: 6 }}>📍 {addr}</div>}
        <div className="row between" style={{ marginTop: 10 }}><b>Total</b><b className="goldtxt">{money(b.price, b.currency_code)}</b></div>
        <div className="muted small" style={{ marginTop: 6 }}>
          {b.escrow_status === 'held' && '🔒 Payment held securely until you both confirm.'}
          {b.escrow_status === 'released' && '✅ Payment released to the barber.'}
          {b.escrow_status === 'refunded' && '↩️ Payment refunded to the customer.'}
          {b.escrow_status === 'disputed' && '⚠️ Payment frozen while support reviews the dispute.'}
          {unpaid && !['cancelled', 'rejected'].includes(b.status) && 'Not paid yet.'}
        </div>
      </div>

      {err && <p className="err">{err}</p>}

      {/* ---------- Customer ---------- */}
      {isCustomer && b.status === 'pending' && <p className="muted small" style={{ marginBottom: 10 }}>Waiting for your barber to accept. You will get a notification.</p>}

      {canPay && (
        <div className="card">
          <b>Pay to secure your booking</b>
          <p className="muted small" style={{ margin: '6px 0 12px' }}>Wallet balance: {money(wallet ?? 0, b.currency_code)}</p>
          <button className="btn btn-gold" disabled={busy || !enough} onClick={() => run(() => createClient().rpc('pay_booking_from_wallet', { p_booking: id }))}>Pay from wallet</button>
          {!enough && <p className="muted small" style={{ marginBottom: 8 }}>Not enough in your wallet. <a className="goldtxt" href="/wallet">Add money</a></p>}
          <button className="btn" disabled={busy} onClick={payCard}>Pay with card / bank transfer</button>
        </div>
      )}

      {isCustomer && b.status === 'in_progress' && (
        <div className="card center" style={{ minHeight: 140 }}>
          <div className="pulse" style={{ fontSize: 34 }}>✂️</div>
          <b>Your appointment is in progress</b>
          <p className="muted small">Confirm below when the service is done.</p>
        </div>
      )}

      {isCustomer && ['in_progress', 'completed'].includes(b.status) && !b.customer_confirmed_at && b.escrow_status === 'held' && (
        <>
          <button className="btn btn-gold" disabled={busy} onClick={() => run(() => createClient().rpc('confirm_service', { p_booking: id }))}>✅ Confirm service &amp; release payment</button>
          <button className="btn btn-ghost" onClick={() => setShowDispute(!showDispute)}>Something went wrong</button>
        </>
      )}

      {showDispute && (
        <div className="card">
          <textarea className="input" placeholder="Tell us what happened…" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className="btn btn-bad" disabled={busy || reason.trim().length < 5} onClick={() => run(() => createClient().rpc('open_dispute', { p_booking: id, p_reason: reason.trim() }))}>Open dispute</button>
        </div>
      )}

      {isCustomer && b.customer_confirmed_at && ['completed'].includes(b.status) && !review && (
        <div className="card">
          <b>How was your experience?</b>
          <StarInput value={rating} onChange={setRating} />
          <textarea className="input" placeholder="Leave a review (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className="btn btn-gold" disabled={busy} onClick={() => run(() => createClient().from('reviews').insert({ booking_id: id, customer_id: uid, provider_id: b.provider_id, rating, comment: comment.trim() || null }))}>Submit review</button>
        </div>
      )}
      {review && <div className="card small"><b>Your review:</b> {'★'.repeat(review.rating)} {review.comment}</div>}

      {isCustomer && ['pending', 'accepted', 'confirmed'].includes(b.status) && (
        <button className="btn btn-bad" disabled={busy} onClick={() => { if (confirm(b.escrow_status === 'held' ? 'Cancel this booking? Your payment will be refunded.' : 'Cancel this booking?')) setStatus('cancelled'); }}>Cancel booking</button>
      )}

      {/* ---------- Barber / stylist ---------- */}
      {isPro && b.status === 'pending' && (
        <div className="grid2">
          <button className="btn btn-gold" disabled={busy} onClick={() => setStatus('accepted')}>Accept</button>
          <button className="btn btn-bad" disabled={busy} onClick={() => setStatus('rejected')}>Decline</button>
        </div>
      )}
      {isPro && ['accepted', 'confirmed'].includes(b.status) && unpaid && <p className="muted small">Waiting for the customer to pay.</p>}
      {isPro && ['accepted', 'confirmed'].includes(b.status) && b.escrow_status === 'held' && (
        <button className="btn btn-gold" disabled={busy} onClick={() => setStatus('in_progress')}>Start service</button>
      )}
      {isPro && b.status === 'in_progress' && (
        <button className="btn btn-gold" disabled={busy} onClick={() => setStatus('completed')}>Mark as completed</button>
      )}
      {isPro && b.status === 'completed' && b.escrow_status === 'held' && <p className="muted small">Waiting for the customer to confirm. You are paid once they do (or automatically after the confirmation window).</p>}
      {isPro && ['pending', 'accepted', 'confirmed'].includes(b.status) && b.status !== 'pending' && (
        <button className="btn btn-bad" disabled={busy} onClick={() => { if (confirm('Cancel this booking? Any payment is refunded to the customer.')) setStatus('cancelled'); }}>Cancel booking</button>
      )}

      {!['cancelled', 'rejected'].includes(b.status) && <button className="btn" onClick={chat}>💬 Chat with {isCustomer ? 'barber' : 'customer'}</button>}
    </>
  );
}
