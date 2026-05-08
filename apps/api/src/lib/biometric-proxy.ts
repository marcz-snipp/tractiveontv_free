import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  jsonBadRequest,
  jsonError,
  jsonOk,
  jsonRateLimited,
  jsonUnauthorized,
} from './responses';
import { clientKey, readLimiter } from './ratelimit';
import { extractClientAuth, tractiveJson } from './tractive';
import { TRACTIVE_APS_URL, TractiveApiError, type BiometricDayOverview } from '@tot/shared';

const petIdSchema = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[a-f0-9]+$/i, 'pet id must be hex');

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

export type BiometricSegment = 'resting-heart-rate' | 'resting-respiratory-rate';

export async function proxyBiometricDayOverview(
  req: Request,
  petId: string,
  segment: BiometricSegment,
): Promise<NextResponse> {
  const auth = extractClientAuth(req);
  if (!auth) return jsonUnauthorized();

  const idParse = petIdSchema.safeParse(petId);
  if (!idParse.success) return jsonBadRequest('Invalid pet id');

  const url = new URL(req.url);
  const date = url.searchParams.get('date');
  const dateParse = dateSchema.safeParse(date);
  if (!dateParse.success) return jsonBadRequest('Missing or invalid date (YYYY-MM-DD)');

  const limiter = readLimiter();
  if (limiter) {
    const key = clientKey(req);
    const { success, reset } = await limiter.limit(key);
    if (!success) {
      const retryAfter = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
      return jsonRateLimited(retryAfter);
    }
  }

  const upstream = `${TRACTIVE_APS_URL}/api/1/pet/${idParse.data}/${segment}/day-overview?date=${dateParse.data}`;

  try {
    const data = await tractiveJson<BiometricDayOverview>(upstream, {
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
      if (error.status === 404) return jsonError(404, 'not_found', 'No data for this date');
      if (error.isRateLimited) return jsonRateLimited();
      return jsonError(502, 'upstream_error', `Tractive responded ${error.status}`);
    }
    throw error;
  }
}
