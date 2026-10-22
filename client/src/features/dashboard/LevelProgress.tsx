import { motion, useReducedMotion } from 'framer-motion';
import type { LevelInfo } from '../../lib/types';

export function LevelProgress({ xp, level }: { xp: number; level: LevelInfo }) {
  const reduceMotion = useReducedMotion();
  const toNext = level.nextLevelXp === null ? null : level.nextLevelXp - xp;

  return (
    <div className="level-progress">
      <div className="level-progress__labels">
        <span className="level-progress__current">
          <span className="level-chip">Level {level.level}</span>
          {level.title}
        </span>
        <span className="level-progress__next">
          {toNext === null ? 'Top level reached' : `${toNext} XP to ${level.nextLevelTitle}`}
        </span>
      </div>
      <div
        className="level-progress__track"
        role="progressbar"
        aria-label={`Progress to level ${level.level + 1}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={level.progressPercent}
      >
        <motion.div
          className="level-progress__fill"
          initial={reduceMotion ? false : { width: '0%' }}
          animate={{ width: `${Math.max(level.progressPercent, 2)}%` }}
          transition={{ delay: 0.8, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}
