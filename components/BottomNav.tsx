'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMe } from '@/lib/me';
import { Avatar } from '@/components/ui';
import { Icon, type IconName } from '@/components/icons';

export default function BottomNav({ pro, uid }: { pro: boolean; uid: string }) {
  const path = usePathname() || '';
  const { me } = useMe();
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

  const tabs: { href: string; icon: IconName; label: string }[] = pro
    ? [
        { href: '/pro', icon: 'home', label: 'Home' },
        { href: '/bookings', icon: 'calendar', label: 'Bookings' },
        { href: '/messages', icon: 'send', label: 'Messages' },
        { href: '/notifications', icon: 'heart', label: 'Activity' },
      ]
    : [
        { href: '/home', icon: 'home', label: 'Home' },
        { href: '/barbers', icon: 'search', label: 'Search' },
        { href: '/bookings', icon: 'calendar', label: 'Bookings' },
        { href: '/messages', icon: 'send', label: 'Messages' },
      ];

  const onProfile = path === '/profile' || path.startsWith('/profile/');
  const name = me?.profile?.full_name;

  return (
    <nav className="tabbar">
      {tabs.map((t) => {
        const on = path === t.href || path.startsWith(t.href + '/');
        return (
          <Link key={t.href} href={t.href} className={`tab ${on ? 'on' : ''}`} aria-label={t.label}>
            <Icon name={t.icon} size={26} filled={on} />
            {t.href === '/notifications' && unread > 0 && <span className="dot">{unread > 9 ? '9+' : unread}</span>}
          </Link>
        );
      })}
      <Link href="/profile" className={`tab ${onProfile ? 'on' : ''}`} aria-label="Profile">
        <span className="me"><Avatar src={me?.profile?.avatar_url} name={name} size={26} /></span>
      </Link>
    </nav>
  );
}
