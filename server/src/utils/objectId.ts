import { AppError } from './AppError';

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

/** Rejects malformed ids in the URL with a clear 400 before touching the database. */
export function parseObjectId(value: unknown, label: string): string {
  if (typeof value !== 'string' || !OBJECT_ID_PATTERN.test(value)) {
    throw AppError.badRequest(`Invalid ${label}`);
  }
  return value;
}
