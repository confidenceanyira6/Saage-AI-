'use client';

// Last line of defence: renders even if the root layout itself fails.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#060B14', color: '#F3F5F9', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center' }}>
          <h2>Saage hit a snag</h2>
          <p style={{ opacity: 0.7 }}>Please try again in a moment.</p>
          <button onClick={() => reset()} style={{ background: '#E7B04A', color: '#1a1204', border: 0, borderRadius: 12, padding: '12px 24px', fontWeight: 700 }}>Reload</button>
        </div>
      </body>
    </html>
  );
}
