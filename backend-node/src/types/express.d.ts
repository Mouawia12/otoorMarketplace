import type { RoleName } from "@prisma/client";

declare global {
  namespace Express {
    interface UserContext {
      id: number;
      roles: RoleName[];
    }

    interface Request {
      user?: UserContext;
    }
  }
}

export {};
