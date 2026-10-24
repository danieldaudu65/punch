import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { LayoutDashboard, LogOut, Trophy, type LucideIcon } from 'lucide-react';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Logo } from '../components/Logo';
import { SoundToggle } from '../components/SoundToggle';
import { useCurrentUser, useLogout } from '../features/auth/auth.api';
import { springSoft } from '../lib/motion';
import { playSound } from '../lib/sound';

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

export function AppShell() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const location = useLocation();
  const navigate = useNavigate();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const reduceMotion = useReducedMotion();

  // RequireAuth renders this only when a user exists.
  if (!user) return null;

  return (
    <div className="shell">
      <header className="shell__header">
        <div className="shell__bar">
          <Logo to="/dashboard" />

          <nav className="shell__nav" aria-label="Main">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className="shell__link" onClick={() => playSound('tap')}>
                {({ isActive }) => (
                  <>
                    {/* One pill, shared between links: it glides to whichever is active. */}
                    {isActive && <motion.span layoutId="nav-pill" className="shell__pill" transition={springSoft} />}
                    <span className="shell__link-label">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="shell__user">
            <span className="xp-pill" aria-label={`${user.xp} XP`}>
              <span className="xp-pill__coin" aria-hidden="true" />
              {/* Keyed by XP, so the number pops whenever it changes. */}
              <motion.span
                key={user.xp}
                initial={reduceMotion ? false : { scale: 1.35, color: '#ffe7a3' }}
                animate={{ scale: 1, color: '#ffc23c' }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                {user.xp.toLocaleString()} XP
              </motion.span>
            </span>
            <SoundToggle />
            <span className="avatar" title={user.name} aria-hidden="true">
              {user.name.trim().charAt(0).toUpperCase()}
            </span>
            <Button
              size="small"
              variant="quiet"
              onClick={() => {
                playSound('tap');
                setConfirmingLogout(true);
              }}
              aria-label="Log out"
              aria-haspopup="dialog"
            >
              <LogOut size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      <ConfirmDialog
        open={confirmingLogout}
        title="Log out?"
        message="You will need to sign in again to take quizzes and earn XP."
        confirmLabel="Log out"
        cancelLabel="Stay"
        icon={<LogOut size={22} />}
        busy={logout.isPending}
        onCancel={() => setConfirmingLogout(false)}
        onConfirm={() =>
          logout.mutate(undefined, {
            onSettled: () => {
              setConfirmingLogout(false);
              navigate('/login', { replace: true });
            },
          })
        }
      />

      <main className="shell__main">
        {/* A short fade between pages, keyed by the URL. */}
        <motion.div
          key={location.pathname}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Phones: the same links as a bottom tab bar, within thumb reach. */}
      <nav className="tabbar" aria-label="Main">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className="tabbar__link" onClick={() => playSound('tap')}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="tab-pill" className="tabbar__pill" transition={springSoft} />}
                <motion.span className="tabbar__icon" animate={isActive && !reduceMotion ? { y: -2 } : { y: 0 }}>
                  <Icon size={20} aria-hidden="true" />
                </motion.span>
                <span className="tabbar__label">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
