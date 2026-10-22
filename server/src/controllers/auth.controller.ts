import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User';
import { AppError } from '../utils/AppError';
import { BCRYPT_ROUNDS, hashPassword, verifyPassword } from '../utils/password';
import { AUTH_COOKIE, authCookieOptions, signToken } from '../utils/token';
import type { LoginInput, RegisterInput } from '../validators/auth.schemas';

// Compared against when the email does not exist, so a failed login takes
// the same time either way and cannot be used to discover registered emails.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

function startSession(res: Response, userId: string) {
  res.cookie(AUTH_COOKIE, signToken(userId), authCookieOptions);
}

export async function register(req: Request, res: Response) {
  const { name, email, password } = req.body as RegisterInput;

  const taken = await UserModel.exists({ email });
  if (taken) {
    throw AppError.conflict('An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const user = await UserModel.create({ name, email, passwordHash });

  startSession(res, user.id);
  res.status(201).json({ data: { user } });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as LoginInput;

  const user = await UserModel.findOne({ email }).select('+passwordHash');
  const passwordMatches = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  // Same message for unknown email and wrong password.
  if (!user || !passwordMatches) {
    throw AppError.unauthorized('Invalid email or password');
  }

  startSession(res, user.id);
  res.json({ data: { user } });
}

export async function logout(_req: Request, res: Response) {
  const { maxAge: _maxAge, ...clearOptions } = authCookieOptions;
  res.clearCookie(AUTH_COOKIE, clearOptions);
  res.status(204).end();
}

export async function getCurrentUser(req: Request, res: Response) {
  const user = await UserModel.findById(req.userId);

  // Token is valid but the account is gone.
  if (!user) {
    throw AppError.unauthorized();
  }

  res.json({ data: { user } });
}
