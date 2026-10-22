import { Types, type ClientSession } from 'mongoose';
import { AttemptModel } from '../models/Attempt';
import { QuizModel } from '../models/Quiz';
import { UserModel } from '../models/User';
import { AppError } from '../utils/AppError';
import {
  SHARP_SHOOTER_MIN_PERCENT,
  SPEED_RUN_MAX_SEC,
  SPEED_RUN_MIN_PERCENT,
  evaluateBadges,
  type BadgeKey,
  type BadgeStats,
} from './badges';

interface QuizStatsRow {
  _id: Types.ObjectId;
  bestPercentage: number;
  completed: boolean;
  perfectCount: number;
  hasSpeedRun: boolean;
}

/**
 * Collects everything the badge rules need in one aggregation.
 * Runs inside the submit transaction, so it already sees the attempt
 * that was just submitted. Queries run one after another because a
 * transaction session does not allow parallel operations.
 */
export async function collectBadgeStats(userId: string, session?: ClientSession): Promise<BadgeStats> {
  const rows = await AttemptModel.aggregate<QuizStatsRow>([
    { $match: { user: new Types.ObjectId(userId), status: 'submitted' } },
    {
      $group: {
        _id: '$quiz',
        bestPercentage: { $max: '$percentage' },
        completed: { $max: '$rewarded' },
        perfectCount: { $sum: { $cond: [{ $eq: ['$percentage', 100] }, 1, 0] } },
        hasSpeedRun: {
          $max: {
            $and: [{ $gte: ['$percentage', SPEED_RUN_MIN_PERCENT] }, { $lte: ['$durationSec', SPEED_RUN_MAX_SEC] }],
          },
        },
      },
    },
  ]).session(session ?? null);

  const publishedIds = await QuizModel.find({ isPublished: true }).distinct('_id').session(session ?? null);

  return {
    completedQuizIds: rows.filter((r) => r.completed).map((r) => String(r._id)),
    publishedQuizIds: publishedIds.map((id) => String(id)),
    perfectScoreCount: rows.reduce((sum, r) => sum + r.perfectCount, 0),
    quizzesAtOrAbove80: rows.filter((r) => r.bestPercentage >= SHARP_SHOOTER_MIN_PERCENT).length,
    hasSpeedRun: rows.some((r) => r.hasSpeedRun),
  };
}

/**
 * Gives the student any badges they now qualify for but do not have yet.
 * Returns only the newly earned keys, so the client can celebrate them.
 */
export async function awardNewBadges(userId: string, session: ClientSession): Promise<BadgeKey[]> {
  const user = await UserModel.findById(userId).select('badges').session(session);
  if (!user) throw AppError.unauthorized();

  const stats = await collectBadgeStats(userId, session);
  const owned = new Set(user.badges.map((b) => b.key));
  const newKeys = evaluateBadges(stats).filter((key) => !owned.has(key));

  if (newKeys.length === 0) return [];

  const earnedAt = new Date();
  // The filter refuses the write if any of these badges is already there,
  // so a badge can never be stored twice.
  const result = await UserModel.updateOne(
    { _id: userId, 'badges.key': { $nin: newKeys } },
    { $push: { badges: { $each: newKeys.map((key) => ({ key, earnedAt })) } } },
    { session },
  );

  return result.modifiedCount === 1 ? newKeys : [];
}
