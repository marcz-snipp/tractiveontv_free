import { TRACTIVE_HEADER_USER, type AuthSession } from '@tot/shared';
import { env } from './env';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message?: string,
  ) {
    super(message ?? `API error ${status}`);
    this.name = 'ApiError';
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.status === 403;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

export interface ApiOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  headers?: Record<string, string>;
  session?: AuthSession | null;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT = 15_000;

export async function apiFetch<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const url = `${env.apiBaseUrl}${path}`;
  const headers = new Headers(opts.headers);
  headers.set('Accept', 'application/json');

  if (opts.session) {
    headers.set('Authorization', `Bearer ${opts.session.accessToken}`);
    headers.set(TRACTIVE_HEADER_USER, opts.session.userId);
  }

  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    body = JSON.stringify(opts.body);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT);

  try {
    const res = await fetch(url, {
      ...opts,
      headers,
      body,
      signal: opts.signal ?? controller.signal,
    });

    if (!res.ok) {
      let parsed: unknown = null;
      try {
        parsed = await res.json();
      } catch {
        try {
          parsed = await res.text();
        } catch {
          parsed = null;
        }
      }
      throw new ApiError(res.status, parsed);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}
