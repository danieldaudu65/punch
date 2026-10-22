import { Types } from 'mongoose';
import { AttemptModel } from '../models/Attempt';
import { QuizModel } from '../models/Quiz';
import { UserModel } from '../models/User';
import { AppError } from '../utils/AppError';
import { listMyAttempts } from './attempt.service';
import { BADGES, toPublicBadge } from './badges';
import { getRankForXp } from './leaderboard.service';
import { getLevelInfo } from './levels';

/** Everything the dashboard screen needs, in one request. */
export async function getDashboard(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) throw AppError.unauthorized();

  const [totalQuizzes, rank, totalStudents, averageRows, recentAttempts] = await Promise.all([
    QuizModel.countDocuments({ isPublished: true }),
    getRankForXp(user.xp),
    UserModel.countDocuments(),
    // Average of first-completion scores, so retakes do not inflate it.
    AttemptModel.aggregate<{ average: number }>([
      { $match: { user: new Types.ObjectId(userId), status: 'submitted', rewarded: true } },
      { $group: { _id: null, average: { $avg: '$percentage' } } },
    ]),
    listMyAttempts(userId, 5),
  ]);

  const earnedAtByKey = new Map(user.badges.map((b) => [b.key, b.earnedAt]));

  // All badges, earned first, so the client can show locked ones greyed out.
  const badges = BADGES.map((definition) => ({
    ...toPublicBadge(definition.key)!,
    earned: earnedAtByKey.has(definition.key),
    earnedAt: earnedAtByKey.get(definition.key) ?? null,
  })).sort((a, b) => Number(b.earned) - Number(a.earned));

  return {
    student: { id: user.id as string, name: user.name, email: user.email },
    stats: {
      xp: user.xp,
      level: getLevelInfo(user.xp),
      quizzesCompleted: user.quizzesCompleted,
      totalQuizzes,
      averageScore: averageRows[0] ? Math.round(averageRows[0].average) : null,
      rank,
      totalStudents,
      badgesEarned: user.badges.length,
      totalBadges: BADGES.length,
    },
    badges,
    recentAttempts,
  };
}
