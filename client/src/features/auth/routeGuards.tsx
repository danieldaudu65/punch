import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ScreenLoader } from '../../components/ScreenLoader';
import { useCurrentUser } from './auth.api';

interface RedirectState {
  from?: string;
}

/** Pages behind this need a logged-in student; everyone else goes to /login. */
export function RequireAuth() {
  const { data: user, isPending } = useCurrentUser();
  const location = useLocation();

  if (isPending) return <ScreenLoader label="Checking your session" />;

  if (!user) {
    // Remember where they were going, so logging in sends them back there.
    return <Navigate to="/login" replace state={{ from: location.pathname } satisfies RedirectState} />;
  }

  return <Outlet />;
}

/**
 * Login and register are only for visitors. As soon as a student is logged in
 * (including right after a successful login), this sends them on.
 */
export function GuestOnly() {
  const { data: user, isPending } = useCurrentUser();
  const location = useLocation();

  if (isPending) return <ScreenLoader label="Loading" />;

  if (user) {
    const from = (location.state as RedirectState | null)?.from;
    return <Navigate to={from ?? '/dashboard'} replace />;
  }

  return <Outlet />;
}
