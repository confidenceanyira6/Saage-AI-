import Link from 'next/link';
import { Avatar, Stars } from '@/components/ui';
import { money, prettyType } from '@/lib/format';

export default function ProviderCard({ p }: { p: any }) {
  const name = p.business_name || p.full_name || prettyType(p.provider_type);
  return (
    <Link href={`/barber/${p.id}`} className="ig-row">
      <span className="ring sm" style={{ width: 60, height: 60 }}>
        <span className="in"><Avatar src={p.avatar_url} name={name} size={50} /></span>
      </span>
      <div className="grow">
        <div className="nm">{name}</div>
        <div className="muted small">
          <Stars value={p.rating_avg} count={p.rating_count} />
          {p.distance_km != null ? ` · ${p.distance_km} km` : ''}
          {p.city ? ` · ${p.city}` : ''}
        </div>
        <div className="muted small">
          {prettyType(p.provider_type)}
          {p.is_vip ? ' · Premium' : ''}
          {p.home_service_enabled ? ' · Home service' : ''}
          {p.min_price != null ? ` · From ${money(p.min_price, p.currency_code)}` : ''}
        </div>
      </div>
      <span className="ig-follow">Book</span>
    </Link>
  );
}
