'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMe } from '@/lib/me';
import { callFn } from '@/lib/fn';
import { BANKS } from '@/lib/countries';
import { fmtWhen, money, niceError } from '@/lib/format';
import { Header, Loading } from '@/components/ui';

type Tab = 'add' | 'send' | 'out';

export default function WalletPage() {
  const { me } = useMe();
  const cur: string = me?.profile?.currency_code ?? 'NGN';
  const [tab, setTab] = useState<Tab>('add');
  const [wallets, setWallets] = useState<any[] | null>(null);
  const [acct, setAcct] = useState('');
  const [entries, setEntries] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [needKyc, setNeedKyc] = useState(false);

  // add money
  const [amount, setAmount] = useState('');
  // send
  const [to, setTo] = useState('');
  const [toName, setToName] = useState('');
  const [sendAmt, setSendAmt] = useState('');
  const [note, setNote] = useState('');
  // withdraw
  const [bank, setBank] = useState(BANKS[0].code);
  const [accNo, setAccNo] = useState('');
  const [accName, setAccName] = useState('');
  const [outAmt, setOutAmt] = useState('');

  const load = useCallback(async () => {
    const supabase = createClient();
    const from = new Date(Date.now() - 90 * 86400000).toISOString();
    const [w, a, st] = await Promise.all([
      supabase.from('wallets').select('*'),
      supabase.from('saage_accounts').select('account_number').maybeSingle(),
      supabase.rpc('get_statement', { p_from: from, p_to: new Date(Date.now() + 60000).toISOString(), p_currency: cur, p_limit: 25, p_offset: 0 }),
    ]);
    setWallets(w.data ?? []);
    setAcct((a.data as any)?.account_number ?? '');
    setEntries(st.data ?? []);
  }, [cur]);

  useEffect(() => {
    load();
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'add' || t === 'send' || t === 'out') setTab(t);
  }, [load]);

  useEffect(() => {
    setToName('');
    if (!/^[0-9]{10}$/.test(to)) return;
    createClient().rpc('lookup_saage_account', { p_account: to }).then(({ data }: any) => {
      setToName((data ?? [])[0]?.account_name ?? 'Account not found');
    });
  }, [to]);

  const w = (wallets ?? []).find((x) => x.currency_code === cur) ?? { available_balance: 0, pending_balance: 0 };

  function reset() { setErr(''); setMsg(''); setNeedKyc(false); }

  async function addMoney() {
    reset(); setBusy(true);
    const { data, error } = await callFn('payments-init', { purpose: 'wallet_deposit', amount: Number(amount), currency: cur });
    setBusy(false);
    if (error || !data?.url) { setErr(niceError(error)); return; }
    window.location.href = data.url;
  }

  async function send() {
    reset(); setBusy(true);
    const { error } = await createClient().rpc('transfer_funds', {
      p_to_account: to, p_amount: Number(sendAmt), p_currency: cur, p_note: note.trim() || null, p_idempotency_key: crypto.randomUUID(),
    });
    setBusy(false);
    if (error) { setErr(niceError(error.message)); setNeedKyc(error.message.includes('KYC')); return; }
    setMsg(`Sent ${money(sendAmt, cur)} to ${toName}.`);
    setTo(''); setSendAmt(''); setNote('');
    load();
  }

  async function withdraw() {
    reset(); setBusy(true);
    const { data, error } = await callFn('withdraw', { amount: Number(outAmt), currency: cur, destination: { bank_code: bank, account_number: accNo.trim(), account_name: accName.trim() } });
    setBusy(false);
    if (error) { setErr(niceError(error)); setNeedKyc(error === 'KYC_REQUIRED'); return; }
    setMsg(data?.status === 'pending' ? 'Withdrawal started. It usually lands in a few minutes.' : 'Done.');
    setOutAmt('');
    load();
  }

  return (
    <>
      <Header title="Wallet" />
      {wallets === null ? <Loading /> : (
        <>
          <div className="card" style={{ background: 'linear-gradient(135deg,var(--card2),var(--card))' }}>
            <div className="muted small">Available balance</div>
            <div style={{ fontSize: 32, fontWeight: 800 }} className="goldtxt">{money(w.available_balance, cur)}</div>
            {Number(w.pending_balance) > 0 && <div className="muted small">+ {money(w.pending_balance, cur)} pending (held until confirmed)</div>}
            {acct && <div className="small" style={{ marginTop: 10 }}>Saage account no: <b>{acct}</b> <button className="chip" style={{ padding: '2px 10px' }} onClick={() => navigator.clipboard?.writeText(acct)}>Copy</button></div>}
          </div>

          <div className="seg">
            <button className={tab === 'add' ? 'on' : ''} onClick={() => { setTab('add'); reset(); }}>Add money</button>
            <button className={tab === 'send' ? 'on' : ''} onClick={() => { setTab('send'); reset(); }}>Send</button>
            <button className={tab === 'out' ? 'on' : ''} onClick={() => { setTab('out'); reset(); }}>Withdraw</button>
          </div>

          {tab === 'add' && (
            <div className="card">
              <label className="lbl">Amount ({cur})</label>
              <input className="input" type="number" inputMode="decimal" min="1" placeholder="5000" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <button className="btn btn-gold" disabled={busy || !(Number(amount) > 0)} onClick={addMoney}>{busy ? 'Opening checkout…' : 'Continue to payment'}</button>
            </div>
          )}

          {tab === 'send' && (
            <div className="card">
              <label className="lbl">Recipient Saage account number</label>
              <input className="input" inputMode="numeric" maxLength={10} placeholder="10-digit account number" value={to} onChange={(e) => setTo(e.target.value.replace(/\D/g, ''))} />
              {toName && <p className={toName === 'Account not found' ? 'err' : 'okmsg'} style={{ marginTop: -4 }}>{toName}</p>}
              <input className="input" type="number" inputMode="decimal" placeholder={`Amount (${cur})`} value={sendAmt} onChange={(e) => setSendAmt(e.target.value)} />
              <input className="input" maxLength={140} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="btn btn-gold" disabled={busy || !toName || toName === 'Account not found' || !(Number(sendAmt) > 0)} onClick={send}>{busy ? 'Sending…' : 'Send money'}</button>
            </div>
          )}

          {tab === 'out' && (
            <div className="card">
              <label className="lbl">Bank</label>
              <select className="input" value={bank} onChange={(e) => setBank(e.target.value)}>{BANKS.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}</select>
              <input className="input" inputMode="numeric" placeholder="Account number" value={accNo} onChange={(e) => setAccNo(e.target.value.replace(/\D/g, ''))} />
              <input className="input" placeholder="Account name" value={accName} onChange={(e) => setAccName(e.target.value)} />
              <input className="input" type="number" inputMode="decimal" placeholder={`Amount (${cur})`} value={outAmt} onChange={(e) => setOutAmt(e.target.value)} />
              <button className="btn btn-gold" disabled={busy || accNo.length < 6 || accName.trim().length < 2 || !(Number(outAmt) > 0)} onClick={withdraw}>{busy ? 'Processing…' : 'Withdraw to bank'}</button>
            </div>
          )}

          {err && <p className="err">{err}</p>}
          {needKyc && <Link href="/verify"><button className="btn">Verify my identity</button></Link>}
          {msg && <p className="okmsg">{msg}</p>}

          <h2 className="h2">Recent activity</h2>
          {entries.length === 0 ? <p className="muted">No activity yet.</p> : entries.map((e: any, i: number) => (
            <div key={i} className="card row between">
              <div className="grow">
                <b style={{ textTransform: 'capitalize' }}>{String(e.memo || e.entry_type || '').replace(/_/g, ' ')}</b>
                <div className="muted tiny">{fmtWhen(e.created_at)}</div>
              </div>
              <b style={{ color: e.direction === 'credit' ? 'var(--ok)' : 'var(--text)' }}>{e.direction === 'credit' ? '+' : '-'}{money(e.amount, e.currency_code || cur)}</b>
            </div>
          ))}
        </>
      )}
    </>
  );
}
