import jwt from 'jsonwebtoken';
import type { CookieOptions } from 'express';
import { env, isProduction } from '../config/env';

export const AUTH_COOKIE = 'pn_session';
const SESSION_DAYS = 7;

interface TokenPayload {
  sub: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies TokenPayload, env.JWT_SECRET, {
    expiresIn: `${SESSION_DAYS}d`,
  });
}

/** Returns the user id, or null if the token is missing, tampered with or expired. */
export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

// httpOnly keeps the token away from JavaScript, so an XSS bug cannot steal it.
// In production the cookie is SameSite=None and Secure so it still works if the
// browser calls the API on another domain (Netlify site -> Render API).
// Behind the Netlify proxy it is first-party anyway. Locally 'lax' is enough.
export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
  maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
};
