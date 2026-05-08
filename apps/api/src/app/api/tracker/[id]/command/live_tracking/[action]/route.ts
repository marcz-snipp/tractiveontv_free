import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  jsonBadRequest,
  jsonError,
  jsonOk,
  jsonRateLimited,
  jsonUnauthorized,
} from '@/lib/responses';
import { clientKey, commandLimiter } from '@/lib/ratelimit';
import { extractClientAuth, tractiveFetch, tractiveJson } from '@/lib/tractive';
import {
  TractiveApiError,
  commandStateId,
  type TrackerCommandState,
} from '@tot/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LIVE_COMMAND_SETTLE_INTERVAL_MS = 800;
const LIVE_COMMAND_SETTLE_TIMEOUT_MS = 5_000;

const idSchema = z
  .string()
  .min(4)
  .max(32)
  .regex(/^[A-Za-z0-9]+$/, 'tracker id must be alphanumeric');

const actionSchema = z.enum(['on', 'off']);

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string; action: string }> },
): Promise<NextResponse> {
  const auth = extractClientAuth(req);
  if (!auth) return jsonUnauthorized();

  const { id, action } = await context.params;
  const idParse = idSchema.safeParse(id);
  if (!idParse.success) return jsonBadRequest('Invalid tracker id');
  const actionParse = actionSchema.safeParse(action);
  if (!actionParse.success) return jsonBadRequest('Invalid action (on|off)');

  const trackerId = idParse.data.toUpperCase();
  const liveAction = actionParse.data;

  const limiter = commandLimiter();
  if (limiter) {
    const key = clientKey(req);
    const { success, reset } = await limiter.limit(key);
    if (!success) {
      const retryAfter = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
      return jsonRateLimited(retryAfter);
    }
  }

  try {
    const upstream = await tractiveFetch(
      `/4/tracker/${trackerId}/command/live_tracking/${liveAction}`,
      { token: auth.token, userId: auth.userId },
    );
    if (upstream.status === 401 || upstream.status === 403) return jsonUnauthorized();
    if (upstream.status === 429) return jsonRateLimited();
    if (!upstream.ok) {
      return jsonError(502, 'upstream_error', `Tractive responded ${upstream.status}`);
    }

    const readState = () =>
      tractiveJson<TrackerCommandState[]>('/4/bulk', {
        method: 'POST',
        body: JSON.stringify([
          { _type: 'tracker_command_state', _id: commandStateId(trackerId, 'live_tracking') },
        ]),
        token: auth.token,
        userId: auth.userId,
      }).then((arr) => (Array.isArray(arr) ? (arr[0] ?? null) : null));

    let state: TrackerCommandState | null = await readState();
    if (liveAction === 'on') {
      const deadline = Date.now() + LIVE_COMMAND_SETTLE_TIMEOUT_MS;
      while (state?.pending === true && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, LIVE_COMMAND_SETTLE_INTERVAL_MS));
        state = await readState();
      }
    }

    return jsonOk({
      action: liveAction,
      trackerId,
      state,
    });
  } catch (error) {
    if (error instanceof TractiveApiError) {
      if (error.isUnauthorized) return jsonUnauthorized();
      if (error.isRateLimited) return jsonRateLimited();
      return jsonError(502, 'upstream_error', `Tractive responded ${error.status}`);
    }
    throw error;
  }
}
