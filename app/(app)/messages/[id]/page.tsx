'use client';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMe } from '@/lib/me';
import { Header, Loading } from '@/components/ui';

export default function ChatThreadPage() {
  const { id } = useParams() as { id: string };
  const { me } = useMe();
  const uid = me?.id as string;
  const [msgs, setMsgs] = useState<any[] | null>(null);
  const [title, setTitle] = useState('Chat');
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true }).limit(300);
    setMsgs(data ?? []);
    if ((data ?? []).some((m: any) => m.sender_id !== uid && !m.is_read)) {
      await supabase.from('messages').update({ is_read: true }).eq('conversation_id', id).neq('sender_id', uid).eq('is_read', false);
    }
  }, [id, uid]);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: c } = await supabase.from('conversations').select('*').eq('id', id).maybeSingle();
      if (c) {
        const otherId = c.customer_id === uid ? c.provider_id : c.customer_id;
        const [pp, bz] = await Promise.all([
          supabase.rpc('public_profiles', { p_ids: [otherId] }),
          supabase.from('providers').select('business_name').eq('id', otherId).maybeSingle(),
        ]);
        setTitle((bz.data as any)?.business_name || (pp.data ?? [])[0]?.full_name || 'Chat');
      }
    })();
    load();
    const ch = supabase.channel('chat-' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, () => load())
      .subscribe();
    const poll = setInterval(load, 8000); // safety net if realtime drops
    return () => { clearInterval(poll); supabase.removeChannel(ch); };
  }, [id, uid, load]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs?.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText(''); setErr('');
    const { error } = await createClient().from('messages').insert({ conversation_id: id, sender_id: uid, content });
    if (error) { setErr('Message not sent. Please try again.'); setText(content); return; }
    load();
  }

  return (
    <>
      <Header title={title} />
      {msgs === null ? <Loading /> : msgs.length === 0 ? <p className="muted" style={{ textAlign: 'center', marginTop: 40 }}>Say hello 👋</p> : msgs.map((m) => (
        <div key={m.id} className={`bubble ${m.sender_id === uid ? 'me' : 'them'}`}>{m.content}</div>
      ))}
      {err && <p className="err">{err}</p>}
      <div ref={endRef} />
      <form className="composer" onSubmit={send}>
        <input className="input" placeholder="Type a message…" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
        <button className="btn btn-gold" disabled={!text.trim()}>Send</button>
      </form>
    </>
  );
}
