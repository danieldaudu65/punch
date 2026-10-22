import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="logo" aria-label="PUNCH NextGen Quiz, home">
      <span className="logo__mark" aria-hidden="true">
        <Zap size={18} fill="currentColor" strokeWidth={2} />
      </span>
      <span>
        PUNCH <span className="logo__sub">NextGen</span>
      </span>
    </Link>
  );
}
