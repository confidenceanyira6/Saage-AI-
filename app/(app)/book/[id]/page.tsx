'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMe } from '@/lib/me';
import { addDays, dayLabel, todayIn, weekdayOf, zonedToUtc } from '@/lib/time';
import { fmt12, money } from '@/lib/format';
import { Header, Loading } from '@/components/ui';

export default function BookPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { me } = useMe();
  const [prov, setProv] = useState<any>(null);
  const [name, setName] = useState('');
  const [services, setServices] = useState<any[]>([]);
  const [avail, setAvail] = useState<any[]>([]);
  const [off, setOff] = useState<string[]>([]);
  const [busy, setBusy] = useState<{ s: number; e: number }[]>([]);
  const [step, setStep] = useState(1);
  const [svc, setSvc] = useState<any>(null);
  const [loc, setLoc] = useState<'salon' | 'home'>('salon');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const tz = prov?.timezone || 'Africa/Lagos';

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const want = new URLSearchParams(window.location.search).get('service');
      const [pv, pf, sv, av, dof] = await Promise.all([
        supabase.from('providers').select('*').eq('id', id).maybeSingle(),
        supabase.rpc('public_profiles', { p_ids: [id] }),
        supabase.from('provider_services').select('*').eq('provider_id', id).eq('is_active', true).order('price'),
        supabase.from('provider_availability').select('*').eq('provider_id', id),
        supabase.from('provider_days_off').select('off_date').eq('provider_id', id),
      ]);
      setProv(pv.data);
      setName(pv.data?.business_name || (pf.data ?? [])[0]?.full_name || 'Barber');
      const list = sv.data ?? [];
      setServices(list);
      if (want) { const f = list.find((x: any) => x.id === want); if (f) setSvc(f); }
      setAvail(av.data ?? []);
      setOff((dof.data ?? []).map((x: any) => x.off_date));
      const from = new Date();
      const to = new Date(Date.now() + 16 * 86400000);
      const { data: b } = await supabase.rpc('provider_busy_slots', { p_provider: id, p_from: from.toISOString(), p_to: to.toISOString() });
      setBusy((b ?? []).map((x: any) => ({ s: new Date(x.start_at).getTime(), e: new Date(x.end_at).getTime() })));
      setLoaded(true);
    })();
  }, [id]);

  const days = useMemo(() => { const t = todayIn(tz); return Array.from({ length: 14 }, (_, i) => addDays(t, i)); }, [tz]);
  const dayOpen = (d: string) => avail.some((a) => a.day_of_week === weekdayOf(d)) && !off.includes(d);

  const slots = useMemo(() => {
    if (!date || !svc || !dayOpen(date)) return [] as string[];
    const out: string[] = [];
    const dur = svc.duration_minutes as number;
    for (const a of avail.filter((x) => x.day_of_week === weekdayOf(date))) {
      const [sh, sm] = String(a.start_time).split(':').map(Number);
      const [eh, em] = String(a.end_time).split(':').map(Number);
      for (let m = sh * 60 + sm; m + dur <= eh * 60 + em; m += 30) {
        const hhmm = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        const st = zonedToUtc(date, hhmm, tz).getTime();
        const en = st + dur * 60000;
        if (st < Date.now() + 30 * 60000) continue;
        if (busy.some((b) => st < b.e && en > b.s)) continue;
        out.push(hhmm);
      }
    }
    return Array.from(new Set(out)).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, svc, avail, busy, off, tz]);

  async function submit() {
    setSending(true); setErr('');
    const start = zonedToUtc(date, time, tz);
    const res = await fetch('/api/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: id, serviceId: svc.id, locationType: loc, serviceAddress: loc === 'home' ? address : undefined, scheduledStart: start.toISOString() }),
    });
    const j = await res.json().catch(() => null);
    setSending(false);
    if (!res.ok || !j?.success) { setErr(j?.error?.message ?? 'Could not create the booking.'); return; }
    router.replace(`/bookings/${j.data.id}`);
  }

  if (!loaded) return <><Header title="Book" /><Loading /></>;
  if (!prov) return <><Header title="Book" /><p className="muted">This provider is not available.</p></>;
  if (me?.id === id) return <><Header title="Book" /><p className="muted">You cannot book yourself.</p></>;

  const canNext1 = !!svc && (loc === 'salon' || address.trim().length >= 5);

  return (
    <>
      <Header title={step === 1 ? 'Choose service' : step === 2 ? 'Select time' : 'Review & confirm'} />
      <p className="muted small" style={{ marginBottom: 12 }}>{name} &middot; Step {step} of 3</p>

      {step === 1 && (
        <>
          {services.map((s) => (
            <button key={s.id} className="card row between" style={{ width: '100%', textAlign: 'left', borderColor: svc?.id === s.id ? 'var(--gold)' : undefined }} onClick={() => { setSvc(s); setTime(''); }}>
              <div className="grow"><b>{s.name}</b><div className="muted small">{s.duration_minutes} mins</div></div>
              <b className="goldtxt">{money(s.price, s.currency_code)}</b>
            </button>
          ))}
          {prov.home_service_enabled && (
            <>
              <h2 className="h2">Where?</h2>
              <div className="seg">
                <button className={loc === 'salon' ? 'on' : ''} onClick={() => setLoc('salon')}>At the shop</button>
                <button className={loc === 'home' ? 'on' : ''} onClick={() => setLoc('home')}>At my place</button>
              </div>
              {loc === 'home' && (
                <>
                  <textarea className="input" placeholder="Your full address" value={address} onChange={(e) => setAddress(e.target.value)} />
                  {prov.travel_fee > 0 && <p className="muted small">Travel fee may apply: {money(prov.travel_fee, svc?.currency_code ?? 'NGN')}</p>}
                  <p className="muted small">Home service requires a verified ID on your account.</p>
                </>
              )}
            </>
          )}
          <button className="btn btn-gold" style={{ marginTop: 12 }} disabled={!canNext1} onClick={() => setStep(2)}>Next</button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="days">
            {days.map((d) => {
              const l = dayLabel(d);
              return (
                <button key={d} className={`day ${date === d ? 'on' : ''}`} disabled={!dayOpen(d)} onClick={() => { setDate(d); setTime(''); }}>
                  <div className="tiny">{l.dow}</div><b>{l.num}</b><div className="tiny">{l.mon}</div>
                </button>
              );
            })}
          </div>
          {!date ? <p className="muted">Pick a day.</p> : slots.length === 0 ? <p className="muted">No free times that day. Try another day.</p> : (
            <div className="slots">{slots.map((t) => <button key={t} className={`slot ${time === t ? 'on' : ''}`} onClick={() => setTime(t)}>{fmt12(t)}</button>)}</div>
          )}
          <button className="btn btn-gold" style={{ marginTop: 16 }} disabled={!time} onClick={() => setStep(3)}>Next</button>
          <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
        </>
      )}

      {step === 3 && svc && (
        <>
          <div className="card">
            <b>{name}</b>
            <div className="muted small">{svc.name} &middot; {svc.duration_minutes} mins</div>
            <div className="muted small">{dayLabel(date).dow} {dayLabel(date).num} {dayLabel(date).mon}, {fmt12(time)}</div>
            <div className="muted small">{loc === 'home' ? `At your place: ${address}` : 'At the shop'}</div>
            <hr style={{ borderColor: 'var(--line)', opacity: 0.4, margin: '12px 0' }} />
            <div className="row between"><b>Total</b><b className="goldtxt">{money(svc.price, svc.currency_code)}</b></div>
          </div>
          <div className="card small muted">
            🔒 Your barber confirms first. Then you pay inside Saage and the money is held safely until you both confirm the service. If it is not confirmed within 3 days of the appointment, you are refunded automatically.
          </div>
          {err && <p className="err">{err}</p>}
          <button className="btn btn-gold" disabled={sending} onClick={submit}>{sending ? 'Sending…' : 'Send booking request'}</button>
          <button className="btn btn-ghost" onClick={() => setStep(2)}>Back</button>
        </>
      )}
    </>
  );
}
