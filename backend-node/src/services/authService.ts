import { RoleName } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../prisma/client";
import { hashPassword, verifyPassword } from "../utils/password";
import { AppError } from "../utils/errors";
import { signAccessToken } from "../utils/jwt";

const serializeUser = (user: {
  id: number;
  email: string;
  fullName: string;
  roles: Array<{ role: { name: RoleName } }>;
}) => ({
  id: user.id,
  email: user.email,
  full_name: user.fullName,
  roles: user.roles.map((roleRelation) => roleRelation.role.name.toLowerCase()),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(3),
  phone: z.string().min(6).max(20).optional(),
  roles: z.array(z.nativeEnum(RoleName)).default([RoleName.BUYER]).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerUser = async (input: z.infer<typeof registerSchema>) => {
  const data = registerSchema.parse(input);
  const roles =
    data.roles && data.roles.length > 0 ? data.roles : [RoleName.BUYER];

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw AppError.badRequest("Email already registered");
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      phone: data.phone ?? null,
      roles: {
        create: roles.map((roleName) => ({
          role: {
            connect: { name: roleName },
          },
        })),
      },
    },
    include: {
      roles: {
        include: { role: true },
      },
    },
  });

  const token = signAccessToken({
    sub: user.id,
    roles: user.roles.map((role) => role.role.name),
  });

  return {
    token,
    user: serializeUser(user),
  };
};

export const authenticateUser = async (input: z.infer<typeof loginSchema>) => {
  const data = loginSchema.parse(input);

  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: {
      roles: {
        include: { role: true },
      },
    },
  });

  if (!user) {
    throw AppError.unauthorized("Invalid credentials");
  }

  const valid = await verifyPassword(data.password, user.passwordHash);
  if (!valid) {
    throw AppError.unauthorized("Invalid credentials");
  }

  const token = signAccessToken({
    sub: user.id,
    roles: user.roles.map((role) => role.role.name),
  });

  return {
    token,
    user: serializeUser(user),
  };
};
