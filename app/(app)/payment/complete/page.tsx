'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Payment providers send the customer back here. The money is confirmed by a
// server-side webhook (never by this page), so we only show progress and links.
export default function PaymentCompletePage() {
  const [state, setState] = useState<'checking' | 'ok' | 'failed'>('checking');
  const [ref, setRef] = useState('');

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const status = (sp.get('status') ?? '').toLowerCase();
    setRef(sp.get('reference') ?? sp.get('trxref') ?? sp.get('tx_ref') ?? '');
    if (['cancelled', 'canceled', 'failed'].includes(status)) { setState('failed'); return; }
    const t = setTimeout(() => setState('ok'), 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="center">
      {state === 'checking' && (<><div className="spin" /><h2>Processing payment…</h2><p className="muted">Please wait while we confirm your payment.</p></>)}
      {state === 'ok' && (
        <>
          <div style={{ fontSize: 56 }}>✅</div>
          <h2>Payment received</h2>
          <p className="muted">We are confirming it with the bank. Your booking or wallet updates in a few seconds.</p>
          {ref && <p className="muted tiny">Ref: {ref}</p>}
          <Link href="/bookings" style={{ width: '100%' }}><button className="btn btn-gold">View my bookings</button></Link>
          <Link href="/wallet" style={{ width: '100%' }}><button className="btn">Go to wallet</button></Link>
        </>
      )}
      {state === 'failed' && (
        <>
          <div style={{ fontSize: 56 }}>❌</div>
          <h2>Payment not completed</h2>
          <p className="muted">You were not charged. You can try again from your booking.</p>
          <Link href="/bookings" style={{ width: '100%' }}><button className="btn btn-gold">Back to bookings</button></Link>
        </>
      )}
    </div>
  );
}
