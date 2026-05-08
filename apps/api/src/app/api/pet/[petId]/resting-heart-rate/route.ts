import { NextResponse } from 'next/server';
import { proxyBiometricDayOverview } from '@/lib/biometric-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  context: { params: Promise<{ petId: string }> },
): Promise<NextResponse> {
  const { petId } = await context.params;
  return proxyBiometricDayOverview(req, petId, 'resting-heart-rate');
}
