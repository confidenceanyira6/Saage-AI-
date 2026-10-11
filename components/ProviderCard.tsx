import Link from 'next/link';
import { Avatar, Stars } from '@/components/ui';
import { money, prettyType } from '@/lib/format';

export default function ProviderCard({ p }: { p: any }) {
  const name = p.business_name || p.full_name || prettyType(p.provider_type);
  return (
    <Link href={`/barber/${p.id}`} className="card prov">
      <Avatar src={p.avatar_url} name={name} size={64} />
      <div className="grow">
        <b>{name}</b>
        <div className="muted small">
          <Stars value={p.rating_avg} count={p.rating_count} />
          {p.distance_km != null ? ` · ${p.distance_km} km` : ''}
          {p.city ? ` · ${p.city}` : ''}
        </div>
        <div>
          <span className="tag">{prettyType(p.provider_type)}</span>
          {p.is_vip && <span className="tag gold">Premium</span>}
          {p.home_service_enabled && <span className="tag">Home service</span>}
        </div>
        {p.min_price != null && (
          <div className="small" style={{ marginTop: 6 }}>From <b className="goldtxt">{money(p.min_price, p.currency_code)}</b></div>
        )}
      </div>
    </Link>
  );
}
