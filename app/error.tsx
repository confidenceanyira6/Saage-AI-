'use client';

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="center">
      <div style={{ fontSize: 44 }}>😕</div>
      <h2>Something went wrong</h2>
      {error?.digest && <p className="muted tiny">Ref: {error.digest}</p>}
      <button className="btn btn-gold" style={{ maxWidth: 260 }} onClick={() => reset()}>Try again</button>
    </div>
  );
}
