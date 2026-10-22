import { Award, Crosshair, Footprints, Globe, Lock, Target, Zap, type LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import type { BadgeTier } from '../lib/types';

// The server names an icon; the client decides how it looks.
const ICONS: Record<string, LucideIcon> = {
  footprints: Footprints,
  target: Target,
  zap: Zap,
  crosshair: Crosshair,
  globe: Globe,
};

interface BadgeMedalProps {
  icon: string;
  tier: BadgeTier;
  earned: boolean;
  size?: number;
  /** Earned medals spin like a coin when hovered. */
  interactive?: boolean;
}

export function BadgeMedal({ icon, tier, earned, size = 56, interactive = false }: BadgeMedalProps) {
  const reduceMotion = useReducedMotion();
  const Icon = earned ? (ICONS[icon] ?? Award) : Lock;
  const spins = interactive && earned && !reduceMotion;

  return (
    <motion.span
      className={clsx('medal', `medal--${tier}`, !earned && 'medal--locked')}
      style={{ width: size, height: size }}
      whileHover={spins ? { rotateY: 360 } : undefined}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      aria-hidden="true"
    >
      <Icon size={Math.round(size * 0.42)} strokeWidth={2.25} />
    </motion.span>
  );
}
