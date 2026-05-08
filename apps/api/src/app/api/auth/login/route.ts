import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  jsonBadRequest,
  jsonError,
  jsonOk,
  jsonRateLimited,
  jsonUnauthorized,
} from '@/lib/responses';
import { clientKey, loginLimiter } from '@/lib/ratelimit';
import { tractiveFetch } from '@/lib/tractive';
import type { AuthToken } from '@tot/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256),
});

interface LoginResponse {
  userId: string;
  accessToken: string;
  expiresAt: number;
}

export async function POST(req: Request): Promise<NextResponse> {
  const limiter = loginLimiter();
  if (limiter) {
    const key = clientKey(req);
    const { success, reset } = await limiter.limit(key);
    if (!success) {
      const retryAfter = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
      return jsonRateLimited(retryAfter);
    }
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonBadRequest('Invalid JSON body');
  }

  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonBadRequest('Invalid email or password');
  }

  const { email, password } = parsed.data;

  const upstream = await tractiveFetch('/4/auth/token', {
    method: 'POST',
    body: JSON.stringify({
      grant_type: 'tractive',
      platform_email: email,
      platform_token: password,
    }),
  });

  if (upstream.status === 401 || upstream.status === 403) {
    return jsonUnauthorized('Invalid Tractive credentials');
  }

  if (upstream.status === 429) {
    return jsonRateLimited();
  }

  if (!upstream.ok) {
    return jsonError(502, 'upstream_error', 'Tractive auth failed');
  }

  let token: AuthToken;
  try {
    token = (await upstream.json()) as AuthToken;
  } catch {
    return jsonError(502, 'upstream_invalid', 'Invalid response from Tractive');
  }

  const response: LoginResponse = {
    userId: token.user_id,
    accessToken: token.access_token,
    expiresAt: token.expires_at,
  };

  return jsonOk(response);
}
