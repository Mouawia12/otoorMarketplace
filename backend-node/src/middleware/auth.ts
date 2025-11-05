import type { NextFunction, Request, Response } from "express";
import { RoleName } from "@prisma/client";

import { prisma } from "../prisma/client";
import { verifyAccessToken } from "../utils/jwt";
import { AppError } from "../utils/errors";

export const authenticate =
  (options: { roles?: RoleName[] } = {}) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw AppError.unauthorized();
      }

      const [, token] = authHeader.split(" ");
      if (!token) {
        throw AppError.unauthorized();
      }

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        include: { roles: { include: { role: true } } },
      });

      if (!user) {
        throw AppError.unauthorized();
      }

      const userRoles = user.roles.map((r) => r.role.name as RoleName);
      if (
        options.roles &&
        options.roles.length > 0 &&
        !options.roles.some((role) => userRoles.includes(role))
      ) {
        throw AppError.forbidden();
      }

      req.user = {
        id: user.id,
        roles: userRoles,
      };

      return next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      return next(AppError.unauthorized());
    }
  };
