import { NextResponse } from 'next/server';
import {
  jsonError,
  jsonOk,
  jsonRateLimited,
  jsonUnauthorized,
} from '@/lib/responses';
import { clientKey, readLimiter } from '@/lib/ratelimit';
import { extractClientAuth, tractiveJson } from '@/lib/tractive';
import { TractiveApiError, type BulkRequest, type BulkResponse } from '@tot/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RefList {
  _id: string;
  _type: string;
  _version?: string;
}

interface TrackersBundle {
  trackers: BulkResponse;
  pets: BulkResponse;
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

  try {
    const [trackerRefs, petRefs] = await Promise.all([
      tractiveJson<RefList[]>(`/4/user/${auth.userId}/trackers`, {
        token: auth.token,
        userId: auth.userId,
      }),
      tractiveJson<RefList[]>(`/4/user/${auth.userId}/trackable_objects`, {
        token: auth.token,
        userId: auth.userId,
      }),
    ]);

    if (trackerRefs.length === 0 && petRefs.length === 0) {
      return jsonOk<TrackersBundle>({ trackers: [], pets: [] });
    }

    const bulkBody: BulkRequest = [
      ...trackerRefs.map((r) => ({ _type: r._type, _id: r._id })),
      ...petRefs.map((r) => ({ _type: r._type, _id: r._id })),
    ];

    const expanded = await tractiveJson<BulkResponse>('/4/bulk', {
      method: 'POST',
      body: JSON.stringify(bulkBody),
      token: auth.token,
      userId: auth.userId,
    });

    const trackers = expanded.filter((o) => o._type === 'tracker');
    const pets = expanded.filter((o) => o._type === 'pet' || o._type === 'trackable_object');

    return jsonOk<TrackersBundle>({ trackers, pets });
  } catch (error) {
    if (error instanceof TractiveApiError) {
      if (error.isUnauthorized) return jsonUnauthorized();
      if (error.isRateLimited) return jsonRateLimited();
      return jsonError(502, 'upstream_error', `Tractive responded ${error.status}`);
    }
    throw error;
  }
}
