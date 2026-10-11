'use client';
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MeCtx, applyTheme, isProviderRole, type Me } from '@/lib/me';
import BottomNav from '@/components/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname() || '';
  const [me, setMe] = useState<Me | null>(null);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login'); return; }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (!profile) { setMissing(true); return; }
    let provider: any = null;
    if (isProviderRole(profile.role)) {
      const r = await supabase.from('providers').select('*').eq('id', user.id).maybeSingle();
      provider = r.data;
      if (!provider) {
        // Self-insert is allowed by RLS only when provider_type matches the profile role.
        const ins = await supabase.from('providers')
          .insert({ id: user.id, provider_type: profile.role, country_code: profile.country_code })
          .select('*').maybeSingle();
        provider = ins.data;
      }
    }
    applyTheme(profile.theme);
    setMe({ id: user.id, email: user.email ?? null, profile, provider });
  }, [router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!me) return;
    const pro = isProviderRole(me.profile?.role);
    if (pro && path === '/home') router.replace('/pro');
    if (!pro && path.startsWith('/pro')) router.replace('/home');
  }, [me, path, router]);

  if (missing) {
    return (
      <div className="center">
        <p>Your account is still being set up.</p>
        <button className="btn btn-gold" style={{ maxWidth: 240 }} onClick={() => { setMissing(false); load(); }}>Try again</button>
      </div>
    );
  }
  if (!me) return <div className="center"><div className="spin" /></div>;

  const hideNav = /^\/(book\/|messages\/|payment|ai)/.test(path);
  return (
    <MeCtx.Provider value={{ me, refresh: load }}>
      <div className="page">{children}</div>
      {!hideNav && <BottomNav pro={isProviderRole(me.profile?.role)} uid={me.id} />}
    </MeCtx.Provider>
  );
}
