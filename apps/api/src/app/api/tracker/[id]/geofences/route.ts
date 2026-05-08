import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  jsonBadRequest,
  jsonError,
  jsonOk,
  jsonRateLimited,
  jsonUnauthorized,
} from '@/lib/responses';
import { clientKey, readLimiter } from '@/lib/ratelimit';
import { extractClientAuth, tractiveJson } from '@/lib/tractive';
import { TractiveApiError, type Geofence } from '@tot/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const idSchema = z
  .string()
  .min(4)
  .max(32)
  .regex(/^[A-Za-z0-9]+$/, 'tracker id must be alphanumeric');

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = extractClientAuth(req);
  if (!auth) return jsonUnauthorized();

  const { id } = await context.params;
  const idParse = idSchema.safeParse(id);
  if (!idParse.success) return jsonBadRequest('Invalid tracker id');
  const trackerId = idParse.data.toUpperCase();

  const limiter = readLimiter();
  if (limiter) {
    const key = clientKey(req);
    const { success, reset } = await limiter.limit(key);
    if (!success) {
      const retryAfter = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
      return jsonRateLimited(retryAfter);
    }
  }

  try {
    const data = await tractiveJson<Geofence[]>(`/4/tracker/${trackerId}/geofences`, {
      token: auth.token,
      userId: auth.userId,
    });
    return jsonOk(data);
  } catch (error) {
    if (error instanceof TractiveApiError) {
      if (error.isUnauthorized) return jsonUnauthorized();
      if (error.isRateLimited) return jsonRateLimited();
      return jsonError(502, 'upstream_error', `Tractive responded ${error.status}`);
    }
    throw error;
  }
}
