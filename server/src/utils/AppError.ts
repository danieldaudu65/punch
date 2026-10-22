export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  // Specific 409s, so the client can react differently to each.
  | 'ATTEMPT_ALREADY_SUBMITTED'
  | 'ATTEMPT_EXPIRED'
  | 'ATTEMPT_NOT_SUBMITTED'
  | 'REWARD_ALREADY_CLAIMED'
  | 'PAYLOAD_TOO_LARGE'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR';

/**
 * An error we expect and know how to describe to the client.
 * Anything that is not an AppError is treated as a 500.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Please log in to continue') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have access to this resource') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string, code: ErrorCode = 'CONFLICT') {
    return new AppError(409, code, message);
  }
}
