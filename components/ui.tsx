'use client';
import { useRouter } from 'next/navigation';
import { publicUrl, statusInfo } from '@/lib/format';

export function Header({ title, back = true, right }: { title: string; back?: boolean; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="hdr">
      {back ? <button className="icon-btn" onClick={() => router.back()} aria-label="Back">&larr;</button> : <span style={{ width: 36 }} />}
      <h1>{title}</h1>
      <div style={{ minWidth: 36, textAlign: 'right' }}>{right}</div>
    </div>
  );
}

export function Avatar({ src, name, size = 44 }: { src?: string | null; name?: string | null; size?: number }) {
  const url = publicUrl('avatars', src);
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  if (url) return <img className="avatar" src={url} alt="" style={{ width: size, height: size }} />;
  return <div className="avatar ph" style={{ width: size, height: size, fontSize: size * 0.42 }}>{initial}</div>;
}

export function Stars({ value, count }: { value: number; count?: number }) {
  return (
    <span className="small">
      <span className="goldtxt">&#9733;</span> {Number(value || 0).toFixed(1)}
      {count != null ? <span className="muted"> ({count})</span> : null}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="row" style={{ justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" className={`star ${n <= value ? 'on' : ''}`} onClick={() => onChange(n)} aria-label={`${n} stars`}>&#9733;</button>
      ))}
    </div>
  );
}

export function StatusPill({ status, provider = false }: { status: string; provider?: boolean }) {
  const s = statusInfo(status, provider);
  return <span className={`pill ${s.tone}`}>{s.label}</span>;
}

export function Loading() {
  return <div className="center" style={{ minHeight: 200 }}><div className="spin" /></div>;
}

export function Empty({ icon = '✂️', text }: { icon?: string; text: string }) {
  return (
    <div className="center" style={{ minHeight: 220 }}>
      <div style={{ fontSize: 40 }}>{icon}</div>
      <p className="muted">{text}</p>
    </div>
  );
}
