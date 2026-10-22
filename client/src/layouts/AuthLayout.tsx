import { Outlet } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { FloatingCoins } from '../components/FloatingCoins';
import { Logo } from '../components/Logo';
import { Medallion } from '../components/Medallion';
import { SoundToggle } from '../components/SoundToggle';
import { useMediaQuery } from '../hooks/useMediaQuery';

/**
 * Shared by login and register. The coin stays mounted while the student
 * switches between the two forms, so its entrance plays only once.
 */
export function AuthLayout() {
  const isNarrow = useMediaQuery('(max-width: 900px)');
  const reduceMotion = useReducedMotion();

  return (
    <div className="auth">
      <header className="auth__top">
        <Logo to="/login" />
        <SoundToggle />
      </header>

      <main className="auth__main">
        <section className="auth__hero" aria-labelledby="auth-headline">
          <div className="auth__coin-stage">
            {!isNarrow && <FloatingCoins />}
            <Medallion size={isNarrow ? 108 : 280} />
          </div>
          {/* The headline lands just as the coin finishes spinning in. */}
          <motion.h1
            id="auth-headline"
            className="auth__headline"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            Every right answer is worth 10&nbsp;XP.
          </motion.h1>
          <p className="auth__lede">
            Quick quizzes on Naija, tech and money. Earn badges, level up and see where you rank.
          </p>
        </section>

        <Outlet />
      </main>
    </div>
  );
}
