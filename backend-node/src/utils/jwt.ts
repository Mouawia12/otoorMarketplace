import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { RoleName } from "@prisma/client";

import { config } from "../config/env";

export interface JwtPayload {
  sub: number;
  roles: RoleName[];
}

export const signAccessToken = (payload: JwtPayload) => {
  const numericExpires = Number(config.jwtExpiresIn);
  const expiresIn = Number.isNaN(numericExpires) ? 86400 : numericExpires;

  const options: SignOptions = {
    expiresIn,
  };

  return jwt.sign(payload, config.jwtSecret, options);
};

export const verifyAccessToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, config.jwtSecret);

  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token payload");
  }

  const rolesRaw = Array.isArray((decoded as { roles?: unknown }).roles)
    ? ((decoded as { roles: unknown[] }).roles)
    : [];
  const roles = rolesRaw.map((role) => role as RoleName);

  const subValue = (decoded as { sub?: unknown }).sub;
  const sub = typeof subValue === "string" ? Number(subValue) : subValue;

  if (typeof sub !== "number" || Number.isNaN(sub)) {
    throw new Error("Invalid token subject");
  }

  return {
    sub,
    roles,
  };
};
