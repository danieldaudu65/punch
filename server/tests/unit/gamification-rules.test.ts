import { describe, expect, it } from 'vitest';
import { BADGES, evaluateBadges, toPublicBadge, type BadgeStats } from '../../src/services/badges';
import { LEVELS, getLevelInfo } from '../../src/services/levels';

describe('getLevelInfo', () => {
  it('starts every student as a Rookie', () => {
    expect(getLevelInfo(0)).toMatchObject({ level: 1, title: 'Rookie', nextLevelXp: 50, progressPercent: 0 });
  });

  it('moves up exactly at each threshold', () => {
    for (const level of LEVELS) {
      expect(getLevelInfo(level.minXp).level).toBe(level.level);
      if (level.minXp > 0) expect(getLevelInfo(level.minXp - 1).level).toBe(level.level - 1);
    }
  });

  it('reports progress through the current level', () => {
    // Achiever runs from 125 to 225, so 175 is halfway.
    expect(getLevelInfo(175)).toMatchObject({ title: 'Achiever', progressPercent: 50, nextLevelTitle: 'Champion' });
  });

  it('caps at Legend with no next level', () => {
    expect(getLevelInfo(10_000)).toMatchObject({ title: 'Legend', nextLevelXp: null, progressPercent: 100 });
  });

  it('treats negative XP as zero', () => {
    expect(getLevelInfo(-20).level).toBe(1);
  });
});

const noProgress: BadgeStats = {
  completedQuizIds: [],
  publishedQuizIds: ['a', 'b', 'c'],
  perfectScoreCount: 0,
  quizzesAtOrAbove80: 0,
  hasSpeedRun: false,
};

describe('evaluateBadges', () => {
  it('awards nothing before any quiz is completed', () => {
    expect(evaluateBadges(noProgress)).toEqual([]);
  });

  it('awards First Steps for the first completed quiz', () => {
    expect(evaluateBadges({ ...noProgress, completedQuizIds: ['a'] })).toEqual(['first-steps']);
  });

  it('awards Perfect Score for any 100% attempt', () => {
    expect(evaluateBadges({ ...noProgress, perfectScoreCount: 1 })).toContain('perfect-score');
  });

  it('awards Speed Run only when the stats say so', () => {
    expect(evaluateBadges({ ...noProgress, hasSpeedRun: true })).toContain('speed-run');
    expect(evaluateBadges(noProgress)).not.toContain('speed-run');
  });

  it('needs three quizzes at 80%+ for Sharp Shooter', () => {
    expect(evaluateBadges({ ...noProgress, quizzesAtOrAbove80: 2 })).not.toContain('sharp-shooter');
    expect(evaluateBadges({ ...noProgress, quizzesAtOrAbove80: 3 })).toContain('sharp-shooter');
  });

  it('needs every published quiz for All-Rounder', () => {
    expect(evaluateBadges({ ...noProgress, completedQuizIds: ['a', 'b'] })).not.toContain('all-rounder');
    expect(evaluateBadges({ ...noProgress, completedQuizIds: ['c', 'a', 'b'] })).toContain('all-rounder');
  });

  it('never gives All-Rounder when there are no quizzes', () => {
    expect(evaluateBadges({ ...noProgress, publishedQuizIds: [] })).not.toContain('all-rounder');
  });
});

describe('toPublicBadge', () => {
  it('leaves out the rule function', () => {
    const badge = toPublicBadge('first-steps');
    expect(badge).toMatchObject({ key: 'first-steps', name: 'First Steps' });
    expect(badge).not.toHaveProperty('isEarned');
  });

  it('returns null for an unknown key', () => {
    expect(toPublicBadge('made-up')).toBeNull();
  });

  it('defines at least the two badges the brief asks for', () => {
    expect(BADGES.length).toBeGreaterThanOrEqual(2);
  });
});
