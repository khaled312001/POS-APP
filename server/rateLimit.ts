import type { Request, Response, NextFunction } from "express";

/**
 * Fixed-window in-memory rate limiter.
 *
 * Deliberately process-local: the app runs as a single Passenger process, so a
 * shared store would add a dependency without adding protection. If the
 * deployment ever grows to multiple processes this must move to Redis or the
 * database — the limit would otherwise be multiplied by the process count.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  // Amortised cleanup — cheaper than a timer that keeps the event loop alive.
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export function clientKey(req: Request): string {
  const forwarded = req.header("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.ip || req.socket.remoteAddress || "unknown";
  return ip;
}

export interface RateLimitOptions {
  /** Requests allowed per window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Namespace so two limiters never share a bucket. */
  name: string;
  /** Extra key material, e.g. the submitted email or licence key. */
  keyFn?: (req: Request) => string;
  message?: string;
}

export function rateLimit(opts: RateLimitOptions) {
  const { max, windowMs, name, keyFn, message } = opts;

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    sweep(now);

    const key = `${name}:${keyFn ? keyFn(req) : clientKey(req)}`;
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    const remaining = Math.max(0, max - bucket.count);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil((bucket.resetAt - now) / 1000)));

    if (bucket.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ error: message || "Too many requests. Please try again shortly." });
    }
    next();
  };
}

/** Clears all buckets. Test helper — not used in request handling. */
export function resetRateLimits() {
  buckets.clear();
}
