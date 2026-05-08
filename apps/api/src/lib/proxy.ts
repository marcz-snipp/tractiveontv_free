import { NextResponse } from 'next/server';
import {
  jsonError,
  jsonRateLimited,
  jsonUnauthorized,
} from './responses';
import { clientKey, commandLimiter, readLimiter } from './ratelimit';
import { extractClientAuth, tractiveFetch, type TractiveRequestInit } from './tractive';
import type { Ratelimit } from '@upstash/ratelimit';

export interface ProxyOptions {
  init?: TractiveRequestInit;
  limiter?: 'read' | 'command' | null;
}

export async function proxy(
  req: Request,
  upstreamPath: string,
  opts: ProxyOptions = {},
): Promise<NextResponse> {
  const auth = extractClientAuth(req);
  if (!auth) return jsonUnauthorized();

  const limiter = pickLimiter(opts.limiter);
  if (limiter) {
    const key = clientKey(req);
    const { success, reset } = await limiter.limit(key);
    if (!success) {
      const retryAfter = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
      return jsonRateLimited(retryAfter);
    }
  }

  const upstream = await tractiveFetch(upstreamPath, {
    ...opts.init,
    token: auth.token,
    userId: auth.userId,
  });

  if (upstream.status === 401 || upstream.status === 403) return jsonUnauthorized();
  if (upstream.status === 429) {
    return jsonRateLimited(parseRetryAfter(upstream.headers.get('Retry-After')));
  }
  if (!upstream.ok) {
    return jsonError(502, 'upstream_error', `Tractive responded ${upstream.status}`);
  }

  const text = await upstream.text();
  return new NextResponse(text, {
    status: 200,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
  });
}

function pickLimiter(kind: ProxyOptions['limiter']): Ratelimit | null {
  if (kind === null) return null;
  if (kind === 'command') return commandLimiter();
  return readLimiter();
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
