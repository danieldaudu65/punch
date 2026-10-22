import type { Transition, Variants } from 'framer-motion';

/** The one easing curve used across the app: fast start, soft landing. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const springSoft: Transition = { type: 'spring', stiffness: 220, damping: 22 };

/**
 * Page-load sequence: a parent with `revealContainer` staggers every child
 * that uses `revealItem`, so a screen arrives as one orchestrated moment.
 */
export const revealContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

export const revealItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};
