'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function BottomNav({ pro, uid }: { pro: boolean; uid: string }) {
  const path = usePathname() || '';
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    const refresh = async () => {
      const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false);
      setUnread(count ?? 0);
    };
    refresh();
    const ch = supabase
      .channel('nav-notifs-' + uid)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid]);

  const tabs = [
    { href: pro ? '/pro' : '/home', icon: '🏠', label: 'Home' },
    { href: '/bookings', icon: '📅', label: 'Bookings' },
    { href: '/messages', icon: '💬', label: 'Chats' },
    { href: '/notifications', icon: '🔔', label: 'Alerts' },
    { href: '/profile', icon: '👤', label: 'Profile' },
  ];

  return (
    <nav className="tabbar">
      {tabs.map((t) => {
        const on = path === t.href || path.startsWith(t.href + '/');
        return (
          <Link key={t.href} href={t.href} className={`tab ${on ? 'on' : ''}`}>
            <span className="ic">{t.icon}</span>
            {t.label}
            {t.href === '/notifications' && unread > 0 && <span className="dot">{unread > 9 ? '9+' : unread}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
