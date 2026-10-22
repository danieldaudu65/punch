import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';

export const notFoundHandler: RequestHandler = (req) => {
  throw AppError.notFound(`No route for ${req.method} ${req.path}`);
};

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (err instanceof ZodError) {
    const fields = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', fields);
  }

  // Malformed ObjectId in a URL, e.g. /api/quizzes/not-an-id
  if (err instanceof mongoose.Error.CastError) {
    return AppError.badRequest(`Invalid ${err.path}`);
  }

  // Unique index violation. Covers races the controller checks cannot catch.
  if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    return AppError.conflict('This record already exists');
  }

  // Errors raised by express.json() before our code runs.
  const bodyErrorType = typeof err === 'object' && err !== null ? (err as { type?: string }).type : undefined;
  if (bodyErrorType === 'entity.parse.failed') {
    return AppError.badRequest('Request body is not valid JSON');
  }
  if (bodyErrorType === 'entity.too.large') {
    return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  }

  return new AppError(500, 'INTERNAL_ERROR', 'Something went wrong on our side');
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const appError = toAppError(err);

  if (appError.status >= 500) {
    console.error(err);
  }

  res.status(appError.status).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details !== undefined && { details: appError.details }),
    },
  });
};
