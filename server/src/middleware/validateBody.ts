import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

/**
 * Rejects the request with a 400 if the body does not match the schema.
 * On success, req.body is replaced with the parsed value, so unknown
 * fields are stripped before they reach a controller.
 */
export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    // ZodError is turned into a 400 response by the error handler.
    req.body = schema.parse(req.body ?? {});
    next();
  };
}
