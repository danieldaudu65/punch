/**
 * Levels are worked out from XP every time instead of being stored,
 * so they can never drift out of sync with a student's points.
 *
 * Three quizzes pay at most 375 XP, so Legend needs near-perfect
 * scores on all of them.
 */
export const LEVELS = [
  { level: 1, title: 'Rookie', minXp: 0 },
  { level: 2, title: 'Explorer', minXp: 50 },
  { level: 3, title: 'Achiever', minXp: 125 },
  { level: 4, title: 'Champion', minXp: 225 },
  { level: 5, title: 'Legend', minXp: 350 },
] as const;

export interface LevelInfo {
  level: number;
  title: string;
  minXp: number;
  /** XP needed to reach the next level, or null at the top level. */
  nextLevelXp: number | null;
  nextLevelTitle: string | null;
  /** 0–100, how far the student is through the current level. */
  progressPercent: number;
}

export function getLevelInfo(xp: number): LevelInfo {
  const safeXp = Math.max(0, xp);

  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (safeXp >= LEVELS[i].minXp) index = i;
  }

  const current = LEVELS[index];
  const next = LEVELS[index + 1];

  if (!next) {
    return {
      level: current.level,
      title: current.title,
      minXp: current.minXp,
      nextLevelXp: null,
      nextLevelTitle: null,
      progressPercent: 100,
    };
  }

  const span = next.minXp - current.minXp;
  return {
    level: current.level,
    title: current.title,
    minXp: current.minXp,
    nextLevelXp: next.minXp,
    nextLevelTitle: next.title,
    progressPercent: Math.floor(((safeXp - current.minXp) / span) * 100),
  };
}
