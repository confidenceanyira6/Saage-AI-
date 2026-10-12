import React from 'react';

export type IconName = 'home' | 'search' | 'calendar' | 'send' | 'heart' | 'comment' | 'bookmark' | 'plus' | 'dots';

export function Icon({ name, size = 24, filled = false }: { name: IconName; size?: number; filled?: boolean }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24', fill: filled ? 'currentColor' : 'none',
    stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'home': return <svg {...p}><path d="M3 10.5 12 3l9 7.5V21h-6v-6.5H9V21H3z" /></svg>;
    case 'search': return <svg {...p} fill="none"><circle cx="11" cy="11" r="7" /><path d="M16.5 16.5 21 21" strokeWidth={filled ? 3 : 2} /></svg>;
    case 'calendar': return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="4" /><path d="M3 10h18M8 3v4M16 3v4" stroke={filled ? 'var(--bg)' : 'currentColor'} /></svg>;
    case 'send': return <svg {...p}><path d="M22 3 9.5 13.5" /><path d="M22 3 15 21l-5.5-7.5L2 9z" /></svg>;
    case 'heart': return <svg {...p}><path d="M12 21s-8-5.2-8-11a4.8 4.8 0 0 1 8-3.4A4.8 4.8 0 0 1 20 10c0 5.8-8 11-8 11z" /></svg>;
    case 'comment': return <svg {...p}><path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.6L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z" /></svg>;
    case 'bookmark': return <svg {...p}><path d="M6 3h12v18l-6-4.5L6 21z" /></svg>;
    case 'plus': return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><path d="M12 8v8M8 12h8" /></svg>;
    case 'dots': return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>;
  }
  return null;
}
