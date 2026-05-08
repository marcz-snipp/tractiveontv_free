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
import { TractiveApiError, type BulkResponse } from '@tot/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bulkRefSchema = z.object({
  _type: z.string().min(1).max(64),
  _id: z.string().min(1).max(128),
});
const bulkBodySchema = z.array(bulkRefSchema).min(1).max(64);

export async function POST(req: Request): Promise<NextResponse> {
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

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonBadRequest('Invalid JSON body');
  }
  const parsed = bulkBodySchema.safeParse(payload);
  if (!parsed.success) {
    return jsonBadRequest('Invalid bulk request body');
  }

  try {
    const data = await tractiveJson<BulkResponse>('/4/bulk', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
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
