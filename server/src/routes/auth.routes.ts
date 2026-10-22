import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import * as auth from '../controllers/auth.controller';
import { requireAuth } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validateBody';
import { AppError } from '../utils/AppError';
import { loginSchema, registerSchema } from '../validators/auth.schemas';

// Slows down password guessing and mass sign-ups from one IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // The test suite registers many students from one IP, so the cap is lifted there only.
  limit: env.NODE_ENV === 'test' ? 1000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new AppError(429, 'TOO_MANY_REQUESTS', 'Too many attempts. Please wait a few minutes and try again.'));
  },
});

export const authRouter = Router();

authRouter.post('/register', authLimiter, validateBody(registerSchema), auth.register);
authRouter.post('/login', authLimiter, validateBody(loginSchema), auth.login);
authRouter.post('/logout', auth.logout);
authRouter.get('/me', requireAuth, auth.getCurrentUser);
