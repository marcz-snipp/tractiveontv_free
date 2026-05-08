import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env, isRateLimitEnabled } from './env';

let cachedLogin: Ratelimit | null = null;
let cachedRead: Ratelimit | null = null;
let cachedCommand: Ratelimit | null = null;

function buildRedis(): Redis | null {
  if (!isRateLimitEnabled) return null;
  return new Redis({
    url: env.UPSTASH_REDIS_REST_URL!,
    token: env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

export function loginLimiter(): Ratelimit | null {
  if (cachedLogin) return cachedLogin;
  const redis = buildRedis();
  if (!redis) return null;
  cachedLogin = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'tot:rl:login',
    analytics: true,
  });
  return cachedLogin;
}

export function readLimiter(): Ratelimit | null {
  if (cachedRead) return cachedRead;
  const redis = buildRedis();
  if (!redis) return null;
  cachedRead = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(120, '1 m'),
    prefix: 'tot:rl:read',
    analytics: true,
  });
  return cachedRead;
}

export function commandLimiter(): Ratelimit | null {
  if (cachedCommand) return cachedCommand;
  const redis = buildRedis();
  if (!redis) return null;
  cachedCommand = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '5 m'),
    prefix: 'tot:rl:cmd',
    analytics: true,
  });
  return cachedCommand;
}

export function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0];
    if (first) return first.trim();
  }
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}
