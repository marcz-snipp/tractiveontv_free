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
import { TRACTIVE_APS_URL, TractiveApiError, type HealthOverview } from '@tot/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const petIdSchema = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[a-f0-9]+$/i, 'pet id must be hex');

export async function GET(
  req: Request,
  context: { params: Promise<{ petId: string }> },
): Promise<NextResponse> {
  const auth = extractClientAuth(req);
  if (!auth) return jsonUnauthorized();

  const { petId } = await context.params;
  const parsed = petIdSchema.safeParse(petId);
  if (!parsed.success) return jsonBadRequest('Invalid pet id');

  const limiter = readLimiter();
  if (limiter) {
    const key = clientKey(req);
    const { success, reset } = await limiter.limit(key);
    if (!success) {
      const retryAfter = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
      return jsonRateLimited(retryAfter);
    }
  }

  const upstream = `${TRACTIVE_APS_URL}/api/1/pet/${parsed.data}/health/overview`;

  try {
    const data = await tractiveJson<HealthOverview>(upstream, {
      token: auth.token,
      userId: auth.userId,
    });
    return jsonOk(data);
  } catch (error) {
    if (error instanceof TractiveApiError) {
      if (error.status === 401) return jsonUnauthorized();
      if (error.status === 403) {
        return jsonError(403, 'premium_required', 'Tractive Premium required');
      }
      if (error.status === 404) {
        return jsonError(404, 'not_found', 'Pet not found or no health data');
      }
      if (error.isRateLimited) return jsonRateLimited();
      return jsonError(502, 'upstream_error', `Tractive responded ${error.status}`);
    }
    throw error;
  }
}
