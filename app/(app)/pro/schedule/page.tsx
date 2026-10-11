'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMe } from '@/lib/me';
import { fmt12 } from '@/lib/format';
import { Header, Loading } from '@/components/ui';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hhmm = (t: string) => String(t).slice(0, 5);

export default function ProSchedulePage() {
  const { me } = useMe();
  const uid = me?.id as string;
  const [rows, setRows] = useState<any[] | null>(null);
  const [off, setOff] = useState<any[]>([]);
  const [draft, setDraft] = useState<Record<number, { s: string; e: string }>>({});
  const [offDate, setOffDate] = useState('');
  const [offWhy, setOffWhy] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const supabase = createClient();
    const [a, o] = await Promise.all([
      supabase.from('provider_availability').select('*').eq('provider_id', uid).order('start_time'),
      supabase.from('provider_days_off').select('*').eq('provider_id', uid).gte('off_date', new Date().toISOString().slice(0, 10)).order('off_date'),
    ]);
    setRows(a.data ?? []);
    setOff(o.data ?? []);
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  async function addWindow(day: number) {
    setErr('');
    const d = draft[day] ?? { s: '09:00', e: '17:00' };
    if (d.e <= d.s) { setErr('End time must be after start time.'); return; }
    const { error } = await createClient().from('provider_availability').insert({ provider_id: uid, day_of_week: day, start_time: d.s, end_time: d.e });
    if (error) { setErr(error.message); return; }
    load();
  }

  async function delWindow(id: string) {
    await createClient().from('provider_availability').delete().eq('id', id);
    load();
  }

  async function addOff() {
    if (!offDate) return;
    const { error } = await createClient().from('provider_days_off').insert({ provider_id: uid, off_date: offDate, reason: offWhy.trim() || null });
    if (error) { setErr(error.message); return; }
    setOffDate(''); setOffWhy('');
    load();
  }

  async function delOff(id: string) {
    await createClient().from('provider_days_off').delete().eq('id', id);
    load();
  }

  if (rows === null) return <><Header title="Availability" /><Loading /></>;

  return (
    <>
      <Header title="Availability" />
      <p className="muted small" style={{ marginBottom: 10 }}>Customers can only book inside these hours. Times are in your local timezone ({me?.provider?.timezone ?? 'Africa/Lagos'}).</p>
      {err && <p className="err">{err}</p>}
      {DAYS.map((name, day) => {
        const list = rows.filter((r) => r.day_of_week === day);
        const d = draft[day] ?? { s: '09:00', e: '17:00' };
        return (
          <div key={day} className="card">
            <b>{name}</b>
            {list.length === 0 && <div className="muted small">Closed</div>}
            {list.map((r) => (
              <div key={r.id} className="row between small" style={{ marginTop: 6 }}>
                <span>{fmt12(hhmm(r.start_time))} &ndash; {fmt12(hhmm(r.end_time))}</span>
                <button className="chip" style={{ color: 'var(--bad)' }} onClick={() => delWindow(r.id)}>Remove</button>
              </div>
            ))}
            <div className="row" style={{ marginTop: 10 }}>
              <input className="input" style={{ margin: 0 }} type="time" value={d.s} onChange={(e) => setDraft({ ...draft, [day]: { ...d, s: e.target.value } })} />
              <input className="input" style={{ margin: 0 }} type="time" value={d.e} onChange={(e) => setDraft({ ...draft, [day]: { ...d, e: e.target.value } })} />
              <button className="chip on" onClick={() => addWindow(day)}>Add</button>
            </div>
          </div>
        );
      })}

      <h2 className="h2">Days off</h2>
      <div className="card">
        <input className="input" type="date" value={offDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setOffDate(e.target.value)} />
        <input className="input" placeholder="Reason (optional)" value={offWhy} onChange={(e) => setOffWhy(e.target.value)} />
        <button className="btn" disabled={!offDate} onClick={addOff}>Block this day</button>
        {off.map((o) => (
          <div key={o.id} className="row between small" style={{ marginTop: 6 }}>
            <span>{new Date(o.off_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}{o.reason ? ` · ${o.reason}` : ''}</span>
            <button className="chip" onClick={() => delOff(o.id)}>Remove</button>
          </div>
        ))}
      </div>
    </>
  );
}
