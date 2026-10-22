import { Router } from 'express';
import * as gamification from '../controllers/gamification.controller';
import { requireAuth } from '../middleware/requireAuth';

export const gamificationRouter = Router();

// Auth is added per route, not with router.use(), because this router is
// mounted at /api: router.use() would turn every unknown /api URL into a 401.
gamificationRouter.get('/dashboard', requireAuth, gamification.dashboard);
gamificationRouter.get('/leaderboard', requireAuth, gamification.leaderboard);
gamificationRouter.get('/badges', requireAuth, gamification.listBadges);
