import type { ApiErrorBody } from './types';

/**
 * An error from the API in a shape the UI can use directly:
 * a status, a machine-readable code, a message for people,
 * and per-field messages for forms.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthorized() {
    return this.status === 401;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

function toFieldErrors(details: ApiErrorBody['error']['details']): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const detail of details ?? []) {
    // Keep the first message per field; that is the one worth fixing first.
    fieldErrors[detail.field] ??= detail.message;
  }
  return fieldErrors;
}

/**
 * The only place the app calls fetch. Every request:
 * - goes to /api on the same origin (Vite proxy locally, Vercel rewrite in production),
 * - sends the httpOnly session cookie,
 * - returns the `data` field on success or throws an ApiError.
 */
export async function api<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Can’t reach the server. Check your connection and try again.');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (payload as ApiErrorBody | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN_ERROR',
      error?.message ?? 'Something went wrong. Please try again.',
      toFieldErrors(error?.details),
    );
  }

  return (payload as { data: T }).data;
}
