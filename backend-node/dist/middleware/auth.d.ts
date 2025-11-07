import type { NextFunction, Request, Response } from "express";
import { RoleName } from "@prisma/client";
export declare const authenticate: (options?: {
    roles?: RoleName[];
}) => (req: Request, _res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map