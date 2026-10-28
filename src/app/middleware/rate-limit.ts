import type { RequestHandler } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

const MAX_BUCKETS = 10_000;

export function createRateLimiter({
  windowMs,
  max,
}: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, Bucket>();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const bucket = buckets.get(key);

    if (buckets.size > MAX_BUCKETS) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) {
          buckets.delete(bucketKey);
        }
      }
    }

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter.toString());
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    bucket.count += 1;
    next();
  };
}
