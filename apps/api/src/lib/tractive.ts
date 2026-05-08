import {
  TRACTIVE_BASE_URL,
  TRACTIVE_HEADER_CLIENT,
  TRACTIVE_HEADER_USER,
  TractiveApiError,
} from '@tot/shared';
import { env } from './env';

export interface TractiveRequestInit extends Omit<RequestInit, 'headers'> {
  token?: string;
  userId?: string;
  headers?: Record<string, string>;
}

export function tractiveHeaders(opts: { token?: string; userId?: string } = {}): Headers {
  const headers = new Headers();
  headers.set(TRACTIVE_HEADER_CLIENT, env.TRACTIVE_CLIENT_ID);
  if (opts.token) headers.set('Authorization', `Bearer ${opts.token}`);
  if (opts.userId) headers.set(TRACTIVE_HEADER_USER, opts.userId);
  return headers;
}

export async function tractiveFetch(
  path: string,
  init: TractiveRequestInit = {},
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${TRACTIVE_BASE_URL}${path}`;
  const headers = tractiveHeaders({ token: init.token, userId: init.userId });
  if (init.headers) {
    for (const [k, v] of Object.entries(init.headers)) headers.set(k, v);
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const { token: _t, userId: _u, headers: _h, ...rest } = init;
  return fetch(url, { ...rest, headers });
}

export async function tractiveJson<T>(path: string, init: TractiveRequestInit = {}): Promise<T> {
  const res = await tractiveFetch(path, init);
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      try {
        body = await res.text();
      } catch {
        body = null;
      }
    }
    throw new TractiveApiError(res.status, body as never);
  }
  return (await res.json()) as T;
}

export function extractClientAuth(req: Request): { token: string; userId: string } | null {
  const auth = req.headers.get('authorization');
  const userId = req.headers.get(TRACTIVE_HEADER_USER) ?? req.headers.get('x-user-id');
  if (!auth || !userId) return null;
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  if (!match || !match[1]) return null;
  return { token: match[1], userId };
}
