'use client';

// Catches any unexpected error inside a screen so users see a friendly retry
// instead of a blank page. The rest of the app (nav, session) keeps working.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="center" style={{ minHeight: '60vh' }}>
      <div style={{ fontSize: 44 }}>😕</div>
      <h2>Something went wrong</h2>
      <p className="muted small">This screen hit a problem. Your data is safe.</p>
      {error?.digest && <p className="muted tiny">Ref: {error.digest}</p>}
      <button className="btn btn-gold" style={{ maxWidth: 260 }} onClick={() => reset()}>Try again</button>
    </div>
  );
}
