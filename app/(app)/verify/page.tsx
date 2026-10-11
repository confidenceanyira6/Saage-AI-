'use client';
import { useState } from 'react';
import { useMe } from '@/lib/me';
import { callFn } from '@/lib/fn';
import { niceError } from '@/lib/format';
import { Header } from '@/components/ui';

// The NIN is sent straight to the kyc-verify edge function and is never stored by Saage.
export default function VerifyPage() {
  const { me, refresh } = useMe();
  const status = me?.profile?.identity_verification as string;
  const ng = (me?.profile?.country_code ?? 'NG') === 'NG';
  const [nin, setNin] = useState('');
  const [docType, setDocType] = useState('passport');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function submit() {
    setMsg(''); setErr(''); setBusy(true);
    const body = ng ? { id_type: 'nin', id_number: nin } : { id_type: docType };
    const { data, error } = await callFn('kyc-verify', body);
    setBusy(false);
    setNin('');
    if (error) { setErr(niceError(error)); return; }
    if (data?.status === 'verified') setMsg('You are verified ✅');
    else if (data?.status === 'pending_manual_review') setMsg('Submitted. Our team will review it shortly.');
    else setErr(data?.reason === 'name_mismatch' ? 'The name on that ID does not match your Saage profile name. Update your name and try again.' : 'We could not verify that ID. Check the number and try again.');
    refresh();
  }

  return (
    <>
      <Header title="Verify identity" />
      {status === 'verified' ? (
        <div className="card center" style={{ minHeight: 200 }}><div style={{ fontSize: 48 }}>✅</div><b>Your identity is verified</b><p className="muted small">You can use home service, withdrawals and transfers.</p></div>
      ) : status === 'pending' ? (
        <div className="card center" style={{ minHeight: 200 }}><div style={{ fontSize: 48 }}>⏳</div><b>Verification under review</b><p className="muted small">We will notify you when it is done.</p></div>
      ) : (
        <div className="card">
          <p className="muted small" style={{ marginBottom: 12 }}>Verification is needed for home service, withdrawals and sending money. Your ID number is checked and never stored.</p>
          {ng ? (
            <>
              <label className="lbl">NIN (11 digits)</label>
              <input className="input" inputMode="numeric" maxLength={11} value={nin} onChange={(e) => setNin(e.target.value.replace(/\D/g, ''))} />
            </>
          ) : (
            <>
              <label className="lbl">ID type</label>
              <select className="input" value={docType} onChange={(e) => setDocType(e.target.value)}>
                <option value="passport">Passport</option>
                <option value="national_id">National ID</option>
                <option value="drivers_license">Driver&apos;s licence</option>
              </select>
            </>
          )}
          {err && <p className="err">{err}</p>}
          {msg && <p className="okmsg">{msg}</p>}
          <button className="btn btn-gold" disabled={busy || (ng && nin.length !== 11)} onClick={submit}>{busy ? 'Checking…' : 'Verify'}</button>
        </div>
      )}
    </>
  );
}
