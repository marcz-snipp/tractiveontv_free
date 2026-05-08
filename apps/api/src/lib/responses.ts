import { NextResponse } from 'next/server';

export function jsonError(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: code, message }, { status });
}

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function jsonRateLimited(retryAfterSeconds?: number): NextResponse {
  const headers = new Headers();
  if (retryAfterSeconds && retryAfterSeconds > 0) {
    headers.set('Retry-After', String(Math.ceil(retryAfterSeconds)));
  }
  return NextResponse.json(
    { error: 'rate_limited', message: 'Too many requests' },
    { status: 429, headers },
  );
}

export function jsonUnauthorized(message = 'Authentication required'): NextResponse {
  return jsonError(401, 'unauthorized', message);
}

export function jsonBadRequest(message: string): NextResponse {
  return jsonError(400, 'bad_request', message);
}
