import type { Request, Response } from 'express';
import { z } from 'zod';
import { currentUserId } from '../middleware/requireAuth';
import { BADGES, toPublicBadge } from '../services/badges';
import { getDashboard } from '../services/dashboard.service';
import { getLeaderboard } from '../services/leaderboard.service';

const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function dashboard(req: Request, res: Response) {
  const data = await getDashboard(currentUserId(req));
  res.json({ data });
}

export async function leaderboard(req: Request, res: Response) {
  // Express 5 makes req.query read-only, so the query is parsed here.
  const { limit } = leaderboardQuerySchema.parse(req.query);
  const data = await getLeaderboard(currentUserId(req), limit);
  res.json({ data });
}

export function listBadges(_req: Request, res: Response) {
  res.json({ data: { badges: BADGES.map((b) => toPublicBadge(b.key)) } });
}
