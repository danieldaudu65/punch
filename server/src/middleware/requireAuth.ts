import type { Request, RequestHandler } from 'express';
import { AppError } from '../utils/AppError';
import { AUTH_COOKIE, verifyToken } from '../utils/token';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token: unknown = req.cookies?.[AUTH_COOKIE];
  const userId = typeof token === 'string' ? verifyToken(token) : null;

  if (!userId) {
    throw AppError.unauthorized();
  }

  req.userId = userId;
  next();
};

/** For handlers behind requireAuth. Throws instead of returning undefined. */
export function currentUserId(req: Request): string {
  if (!req.userId) throw AppError.unauthorized();
  return req.userId;
}
