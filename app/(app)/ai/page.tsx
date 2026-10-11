'use client';
import { useEffect, useRef, useState } from 'react';
import { callFn } from '@/lib/fn';
import { niceError } from '@/lib/format';
import { Header } from '@/components/ui';

type Msg = { role: 'user' | 'assistant'; content: string };
const SUGGEST = ['Find me a barber near me', 'How does payment protection work?', 'Show my recent bookings', 'I need help with a refund'];

export default function AiChatPage() {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: 'Hi! I am Saage customer care (an AI assistant). I can find barbers, explain payments, check your bookings or connect you to our team. How can I help?' }]);
  const [text, setText] = useState('');
  const [conv, setConv] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length, busy]);

  async function send(content: string) {
    const message = content.trim();
    if (!message || busy) return;
    setText('');
    setMsgs((m) => [...m, { role: 'user', content: message }]);
    setBusy(true);
    const { data, error } = await callFn('ai-support-chat', { message, conversation_id: conv });
    setBusy(false);
    if (data?.conversation_id) setConv(data.conversation_id);
    if (error || !data?.reply) {
      setMsgs((m) => [...m, { role: 'assistant', content: niceError(error) }]);
      return;
    }
    if (data.escalated) setEscalated(true);
    setMsgs((m) => [...m, { role: 'assistant', content: data.reply }]);
  }

  return (
    <>
      <Header title="Customer care" />
      {escalated && <div className="card small">🎫 A support ticket was opened. Our team will follow up.</div>}
      {msgs.map((m, i) => <div key={i} className={`bubble ${m.role === 'user' ? 'me' : 'them'}`}>{m.content}</div>)}
      {busy && <div className="bubble them pulse">Typing…</div>}
      {msgs.length === 1 && <div className="chips" style={{ flexWrap: 'wrap' }}>{SUGGEST.map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}</div>}
      <p className="muted tiny" style={{ marginTop: 12 }}>Never share passwords, PINs, OTP codes or card numbers in chat.</p>
      <div ref={endRef} />
      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <input className="input" placeholder="Ask Saage…" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
        <button className="btn btn-gold" disabled={busy || !text.trim()}>Send</button>
      </form>
    </>
  );
}
