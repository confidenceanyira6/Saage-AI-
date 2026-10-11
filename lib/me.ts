'use client';
import { createContext, useContext } from 'react';

export type Me = { id: string; email: string | null; profile: any; provider: any | null };

export const MeCtx = createContext<{ me: Me | null; refresh: () => Promise<void> }>({
  me: null,
  refresh: async () => {},
});

export const useMe = () => useContext(MeCtx);
export const isProviderRole = (r?: string | null) => r === 'male_barber' || r === 'female_stylist';

export function applyTheme(t?: string | null) {
  const light = t === 'light';
  try { localStorage.setItem('saage-theme', light ? 'light' : 'dark'); } catch {}
  document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
}
