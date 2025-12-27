import { Request, Response, NextFunction } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export const rateLimit = ({ windowMs, max, keyGenerator }: RateLimitOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const keyBase = keyGenerator ? keyGenerator(req) : req.ip;
    const key = keyBase || "anonymous";
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter.toString());
      return res.status(429).json({ detail: "Too many requests" });
    }

    bucket.count += 1;
    buckets.set(key, bucket);
    return next();
  };
};
