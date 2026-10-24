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

/**
 * Leave VITE_API_BASE_URL empty to call /api on the same domain (the Netlify
 * proxy in production, the Vite proxy locally). Set it to the public API URL,
 * e.g. https://my-api.onrender.com, to call the API directly instead.
 */
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

/** Full URL for an API path such as "/health". */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}/api${path.startsWith('/') ? path : `/${path}`}`;
}

// Render's free tier sleeps and takes up to a minute to wake. While it does,
// the proxy answers 502/503/504. Reads (and login) are safe to repeat.
const RETRY_STATUSES = new Set([502, 503, 504]);
const RETRY_DELAYS_MS = [1500, 3000, 5000, 8000];

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

function isSafeToRetry(method: string, path: string) {
  return method === 'GET' || path === '/auth/login';
}

function toFieldErrors(details: ApiErrorBody['error']['details']): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const detail of details ?? []) {
    // Keep the first message per field; that is the one worth fixing first.
    fieldErrors[detail.field] ??= detail.message;
  }
  return fieldErrors;
}

async function send(path: string, method: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  return fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
}

/**
 * The only place the app calls fetch. Every request sends the httpOnly
 * session cookie and returns the `data` field, or throws an ApiError.
 */
export async function api<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  const canRetry = isSafeToRetry(method, path);
  let response: Response;

  for (let attempt = 0; ; attempt++) {
    try {
      response = await send(path, method, body, signal);
      if (!canRetry || !RETRY_STATUSES.has(response.status) || attempt >= RETRY_DELAYS_MS.length) break;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      if (!canRetry || attempt >= RETRY_DELAYS_MS.length) {
        throw new ApiError(0, 'NETWORK_ERROR', 'Can’t reach the server. Check your connection and try again.');
      }
    }
    await wait(RETRY_DELAYS_MS[attempt], signal);
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

  if (payload === null || typeof payload !== 'object' || !('data' in payload)) {
    // Usually means /api reached a web page instead of the API (proxy not set up).
    throw new ApiError(
      response.status,
      'BAD_RESPONSE',
      'The server sent an unexpected reply. Please refresh and try again.',
    );
  }

  return (payload as { data: T }).data;
}
