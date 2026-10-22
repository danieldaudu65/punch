import { motion, useReducedMotion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import type { LevelInfo } from '../../lib/types';

export function LevelUpBanner({ level, xp }: { level: LevelInfo; xp: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      className="level-up"
      role="status"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.7, type: 'spring', stiffness: 200, damping: 18 }}
    >
      <span className="level-up__icon" aria-hidden="true">
        <TrendingUp size={22} strokeWidth={2.5} />
      </span>
      <div>
        <p className="level-up__title">Level up: you reached {level.title}</p>
        <p className="level-up__sub">
          {level.nextLevelXp === null
            ? 'That’s the top level. Legend status.'
            : `${level.nextLevelXp - xp} more XP takes you to ${level.nextLevelTitle}.`}
        </p>
      </div>
      <span className="level-chip level-up__chip">Level {level.level}</span>
    </motion.section>
  );
}
