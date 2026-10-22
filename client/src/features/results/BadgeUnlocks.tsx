import { motion, useReducedMotion } from 'framer-motion';
import { BadgeMedal } from '../../components/BadgeMedal';
import { TiltCard } from '../../components/TiltCard';
import type { Badge } from '../../lib/types';

/** Newly earned badges flip in one after another once the score has counted up. */
export function BadgeUnlocks({ badges }: { badges: Badge[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="unlocks" aria-labelledby="unlocks-title">
      <h2 id="unlocks-title" className="unlocks__title">
        {badges.length === 1 ? 'New badge unlocked' : `${badges.length} new badges unlocked`}
      </h2>
      {/* Screen readers hear the badge names; sighted users see them flip in. */}
      <p className="visually-hidden" role="status">
        You unlocked {badges.map((b) => b.name).join(', ')}.
      </p>
      <ul className="unlocks__list">
        {badges.map((badge, i) => (
          <motion.li
            key={badge.key}
            className={`unlock unlock--${badge.tier}`}
            initial={reduceMotion ? false : { opacity: 0, rotateY: -90, y: 16 }}
            animate={{ opacity: 1, rotateY: 0, y: 0 }}
            transition={{ delay: 2 + i * 0.35, type: 'spring', stiffness: 160, damping: 16 }}
          >
            <TiltCard className="unlock__tilt" max={12}>
              <div className="unlock__body">
                <BadgeMedal icon={badge.icon} tier={badge.tier} earned size={64} interactive />
                <div>
                  <p className="unlock__name">{badge.name}</p>
                  <p className="unlock__description">{badge.description}</p>
                </div>
              </div>
            </TiltCard>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
