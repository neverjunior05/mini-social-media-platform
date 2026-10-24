/**
 * In-memory sliding-window rate limiter. Good for a single Node process / demo.
 * Swap for Upstash/Redis in multi-instance deployments.
 */
type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();

export class RateLimitError extends Error {
  constructor(msg = "Slow down a little — try again in a moment") {
    super(msg);
  }
}

export const LIMITS = {
  auth: { max: 10, windowMs: 60_000 },
  post: { max: 10, windowMs: 60_000 },
  comment: { max: 20, windowMs: 60_000 },
  react: { max: 60, windowMs: 60_000 },
  follow: { max: 30, windowMs: 60_000 },
  message: { max: 60, windowMs: 60_000 },
  report: { max: 10, windowMs: 60_000 },
  search: { max: 60, windowMs: 60_000 },
  newAccountPost: { max: 3, windowMs: 60_000 },
} as const;

export function rateLimit(key: string, limit: { max: number; windowMs: number }) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < limit.windowMs);
  if (bucket.hits.length >= limit.max) {
    buckets.set(key, bucket);
    throw new RateLimitError();
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  if (buckets.size > 50_000) buckets.clear();
  return { remaining: limit.max - bucket.hits.length };
}

export function isRateLimited(key: string, limit: { max: number; windowMs: number }) {
  try {
    rateLimit(key, limit);
    return false;
  } catch {
    return true;
  }
}
