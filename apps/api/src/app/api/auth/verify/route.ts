import { NextResponse } from 'next/server';
import {
  jsonError,
  jsonOk,
  jsonRateLimited,
  jsonUnauthorized,
} from '@/lib/responses';
import { clientKey, readLimiter } from '@/lib/ratelimit';
import { extractClientAuth, tractiveFetch } from '@/lib/tractive';
import type { AuthToken } from '@tot/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface VerifyResponse {
  userId: string;
  expiresAt: number;
}

export async function GET(req: Request): Promise<NextResponse> {
  const auth = extractClientAuth(req);
  if (!auth) return jsonUnauthorized();

  const limiter = readLimiter();
  if (limiter) {
    const key = clientKey(req);
    const { success, reset } = await limiter.limit(key);
    if (!success) {
      const retryAfter = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
      return jsonRateLimited(retryAfter);
    }
  }

  const upstream = await tractiveFetch('/4/auth/verify', {
    method: 'GET',
    token: auth.token,
    userId: auth.userId,
  });

  if (upstream.status === 401 || upstream.status === 403) {
    return jsonUnauthorized();
  }

  if (!upstream.ok) {
    return jsonError(502, 'upstream_error', 'Tractive verify failed');
  }

  let token: AuthToken;
  try {
    token = (await upstream.json()) as AuthToken;
  } catch {
    return jsonError(502, 'upstream_invalid', 'Invalid response from Tractive');
  }

  const response: VerifyResponse = {
    userId: token.user_id,
    expiresAt: token.expires_at,
  };
  return jsonOk(response);
}
