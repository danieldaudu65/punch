import clsx from 'clsx';
import { BadgeMedal } from '../../components/BadgeMedal';
import { formatDate } from '../../lib/format';
import type { DashboardBadge } from '../../lib/types';

export function BadgeList({ badges }: { badges: DashboardBadge[] }) {
  return (
    <ul className="badge-list">
      {badges.map((badge) => (
        <li key={badge.key} className={clsx('badge-row', !badge.earned && 'badge-row--locked')}>
          <BadgeMedal icon={badge.icon} tier={badge.tier} earned={badge.earned} size={48} interactive />
          <div className="badge-row__text">
            <p className="badge-row__name">{badge.name}</p>
            <p className="badge-row__description">{badge.description}</p>
          </div>
          <span className="badge-row__state">
            {badge.earned && badge.earnedAt ? `Earned ${formatDate(badge.earnedAt)}` : 'Locked'}
          </span>
        </li>
      ))}
    </ul>
  );
}
