/**
 * Badge rules as plain data plus pure checks. No database here:
 * the stats are collected elsewhere, which keeps every rule unit-testable.
 */

export const SPEED_RUN_MAX_SEC = 90;
export const SPEED_RUN_MIN_PERCENT = 70;
export const SHARP_SHOOTER_MIN_PERCENT = 80;
export const SHARP_SHOOTER_QUIZ_COUNT = 3;

export interface BadgeStats {
  /** Quizzes the student has completed for rewards (first completion). */
  completedQuizIds: string[];
  /** Quizzes currently published. */
  publishedQuizIds: string[];
  /** Submitted attempts that scored 100%, retakes included. */
  perfectScoreCount: number;
  /** Different quizzes where the student's best score is at least 80%. */
  quizzesAtOrAbove80: number;
  /** At least one attempt scoring 70%+ in 90 seconds or less. */
  hasSpeedRun: boolean;
}

export const BADGE_KEYS = ['first-steps', 'perfect-score', 'speed-run', 'sharp-shooter', 'all-rounder'] as const;
export type BadgeKey = (typeof BADGE_KEYS)[number];

export interface BadgeDefinition {
  key: BadgeKey;
  name: string;
  description: string;
  /** Icon name the client maps to an icon component. */
  icon: string;
  tier: 'bronze' | 'silver' | 'gold';
  isEarned: (stats: BadgeStats) => boolean;
}

export const BADGES: BadgeDefinition[] = [
  {
    key: 'first-steps',
    name: 'First Steps',
    description: 'Complete your first quiz.',
    icon: 'footprints',
    tier: 'bronze',
    isEarned: (s) => s.completedQuizIds.length >= 1,
  },
  {
    key: 'perfect-score',
    name: 'Perfect Score',
    description: 'Get every question right in a quiz.',
    icon: 'target',
    tier: 'gold',
    isEarned: (s) => s.perfectScoreCount >= 1,
  },
  {
    key: 'speed-run',
    name: 'Speed Run',
    description: `Score ${SPEED_RUN_MIN_PERCENT}% or more in under ${SPEED_RUN_MAX_SEC} seconds.`,
    icon: 'zap',
    tier: 'silver',
    isEarned: (s) => s.hasSpeedRun,
  },
  {
    key: 'sharp-shooter',
    name: 'Sharp Shooter',
    description: `Score ${SHARP_SHOOTER_MIN_PERCENT}% or more on ${SHARP_SHOOTER_QUIZ_COUNT} different quizzes.`,
    icon: 'crosshair',
    tier: 'silver',
    isEarned: (s) => s.quizzesAtOrAbove80 >= SHARP_SHOOTER_QUIZ_COUNT,
  },
  {
    key: 'all-rounder',
    name: 'All-Rounder',
    description: 'Complete every available quiz.',
    icon: 'globe',
    tier: 'gold',
    isEarned: (s) => {
      if (s.publishedQuizIds.length === 0) return false;
      const completed = new Set(s.completedQuizIds);
      return s.publishedQuizIds.every((id) => completed.has(id));
    },
  },
];

const BADGES_BY_KEY = new Map(BADGES.map((b) => [b.key, b]));

/** Every badge key the stats qualify for, whether or not it is already owned. */
export function evaluateBadges(stats: BadgeStats): BadgeKey[] {
  return BADGES.filter((badge) => badge.isEarned(stats)).map((badge) => badge.key);
}

/** The public shape of a badge, safe to send to the client. */
export function toPublicBadge(key: string) {
  const badge = BADGES_BY_KEY.get(key as BadgeKey);
  if (!badge) return null;
  const { isEarned: _rule, ...publicFields } = badge;
  return publicFields;
}
