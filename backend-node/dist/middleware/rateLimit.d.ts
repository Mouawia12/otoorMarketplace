import { Request, Response, NextFunction } from "express";
type RateLimitOptions = {
    windowMs: number;
    max: number;
    keyGenerator?: (req: Request) => string;
};
export declare const rateLimit: ({ windowMs, max, keyGenerator }: RateLimitOptions) => (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export {};
//# sourceMappingURL=rateLimit.d.ts.map