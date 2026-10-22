import { Types } from 'mongoose';
import { UserModel } from '../models/User';
import { AppError } from '../utils/AppError';
import { getLevelInfo } from './levels';

interface LeaderboardUser {
  _id: Types.ObjectId;
  name: string;
  xp: number;
  quizzesCompleted: number;
  badges: { key: string }[];
}

const LEADERBOARD_FIELDS = 'name xp quizzesCompleted badges';

/** Only public fields: no emails or other private data on the leaderboard. */
function toEntry(user: LeaderboardUser, rank: number, currentUserId: string) {
  const level = getLevelInfo(user.xp);
  return {
    id: String(user._id),
    rank,
    name: user.name,
    xp: user.xp,
    level: level.level,
    levelTitle: level.title,
    quizzesCompleted: user.quizzesCompleted,
    badgeCount: user.badges.length,
    isMe: String(user._id) === currentUserId,
  };
}

/**
 * Rank = 1 + number of students with strictly more XP.
 * Students on equal XP share a rank (1, 2, 2, 4), and the list is ordered
 * by earliest sign-up within a tie so it stays stable between requests.
 */
export async function getRankForXp(xp: number): Promise<number> {
  return (await UserModel.countDocuments({ xp: { $gt: xp } })) + 1;
}

export async function getLeaderboard(currentUserId: string, limit: number) {
  const [topUsers, me, totalStudents] = await Promise.all([
    UserModel.find()
      .sort({ xp: -1, createdAt: 1 })
      .limit(limit)
      .select(LEADERBOARD_FIELDS)
      .lean<LeaderboardUser[]>(),
    UserModel.findById(currentUserId).select(LEADERBOARD_FIELDS).lean<LeaderboardUser>(),
    UserModel.countDocuments(),
  ]);

  if (!me) throw AppError.unauthorized();

  let previousXp: number | null = null;
  let previousRank = 0;

  const top = topUsers.map((user, index) => {
    const rank = user.xp === previousXp ? previousRank : index + 1;
    previousXp = user.xp;
    previousRank = rank;
    return toEntry(user, rank, currentUserId);
  });

  // Always include the current student, even when they are outside the top list.
  const meEntry = top.find((entry) => entry.isMe) ?? toEntry(me, await getRankForXp(me.xp), currentUserId);

  return { top, me: meEntry, totalStudents };
}
