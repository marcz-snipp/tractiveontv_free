import { NextResponse } from 'next/server';
import { isRateLimitEnabled } from '@/lib/env';

export const runtime = 'edge';

export function GET(): NextResponse {
  return NextResponse.json({
    ok: true,
    service: 'tot-api',
    rateLimit: isRateLimitEnabled,
    time: Date.now(),
  });
}
