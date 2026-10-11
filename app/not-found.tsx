import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="center">
      <div style={{ fontSize: 44 }}>✂️</div>
      <h2>Page not found</h2>
      <p className="muted">That page does not exist or has moved.</p>
      <Link href="/" style={{ width: '100%', maxWidth: 260 }}><button className="btn btn-gold">Go home</button></Link>
    </div>
  );
}
