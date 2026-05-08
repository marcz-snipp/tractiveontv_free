import { z } from 'zod';

const schema = z.object({
  TRACTIVE_CLIENT_ID: z.string().min(8).default('5728aa1fc9077f7c32000186'),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = schema.parse(process.env);

export const isRateLimitEnabled =
  Boolean(env.UPSTASH_REDIS_REST_URL) && Boolean(env.UPSTASH_REDIS_REST_TOKEN);
