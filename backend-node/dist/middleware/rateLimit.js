"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = void 0;
const buckets = new Map();
const rateLimit = ({ windowMs, max, keyGenerator }) => {
    return (req, res, next) => {
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
exports.rateLimit = rateLimit;
//# sourceMappingURL=rateLimit.js.map