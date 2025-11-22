import crypto from "crypto";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { Prisma, RoleName } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../prisma/client";
import { hashPassword, verifyPassword } from "../utils/password";
import { AppError } from "../utils/errors";
import { signAccessToken } from "../utils/jwt";
import { config } from "../config/env";

const userWithRolesInclude = Prisma.validator<Prisma.UserInclude>()({
  roles: { include: { role: true } },
});

type UserWithRoles = Prisma.UserGetPayload<{
  include: typeof userWithRolesInclude;
}>;

const serializeUser = (user: UserWithRoles) => ({
  id: user.id,
  email: user.email,
  full_name: user.fullName,
  avatar_url: user.avatarUrl,
  created_at: user.createdAt,
  status: user.status,
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

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(6, "Old password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export const googleLoginSchema = z.object({
  idToken: z.string().min(10, "Invalid Google token"),
  role: z
    .enum(["buyer", "seller"])
    .optional()
    .describe("requested role for new accounts (default buyer)"),
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
    include: userWithRolesInclude,
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

const getGoogleClient = () => {
  const clientId = config.google.clientId;
  if (!clientId) {
    throw AppError.badRequest("GOOGLE_CLIENT_ID is not configured");
  }

  return { client: new OAuth2Client(clientId), clientId };
};

export const authenticateWithGoogle = async (
  input: z.infer<typeof googleLoginSchema>,
) => {
  const { client, clientId } = getGoogleClient();
  const data = googleLoginSchema.parse(input);

  let payload: TokenPayload | undefined;
  try {
    const ticket = await client.verifyIdToken({
      idToken: data.idToken,
      audience: clientId,
    });

    payload = ticket.getPayload();
  } catch (error) {
    throw AppError.unauthorized("Invalid Google token");
  }

  if (!payload || !payload.email || !payload.email_verified) {
    throw AppError.unauthorized("Google account email is not verified");
  }

  const email: string = payload.email;
  const fullNameFromParts = `${payload.given_name ?? ""} ${payload.family_name ?? ""}`.trim();
  const fullName: string | undefined =
    payload.name ?? (fullNameFromParts ? fullNameFromParts : undefined);
  const picture: string | undefined = payload.picture ?? undefined;

  const user = (await prisma.user.findUnique({
    where: { email },
    include: userWithRolesInclude,
  })) as UserWithRoles | null;

  if (user && user.status === "SUSPENDED") {
    throw AppError.forbidden(
      `Your account is suspended. Please contact support at ${config.support.email}`,
    );
  }

  let ensuredUser: UserWithRoles | null = user;

  if (!ensuredUser) {
    const passwordHash = await hashPassword(
      crypto.randomBytes(32).toString("hex"),
    );

    const normalizedFullName = (fullName ?? "").trim();
    const createFullName = (
      normalizedFullName.length > 0 ? normalizedFullName : email.split("@")[0]
    ) as string;

    const requestedRole =
      data.role === "seller" ? RoleName.SELLER : RoleName.BUYER;

    ensuredUser = (await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: createFullName,
        avatarUrl: picture ?? null,
        roles: {
          create: [{ role: { connect: { name: requestedRole } } }],
        },
      },
      include: userWithRolesInclude,
    })) as UserWithRoles;
  }

  if (!ensuredUser) {
    throw AppError.unauthorized("Unable to authenticate with Google");
  }

  const finalUser = ensuredUser;

  const token = signAccessToken({
    sub: finalUser.id,
    roles: finalUser.roles.map((role) => role.role.name),
  });

  return {
    token,
    user: serializeUser(finalUser),
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

  if (user.status === "SUSPENDED") {
    throw AppError.forbidden(
      `Your account is suspended. Please contact support at ${config.support.email}`,
    );
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

export const changePassword = async (
  userId: number,
  payload: z.infer<typeof changePasswordSchema>,
) => {
  const data = changePasswordSchema.parse(payload);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw AppError.unauthorized("User not found");
  }

  const valid = await verifyPassword(data.oldPassword, user.passwordHash);
  if (!valid) {
    throw AppError.unauthorized("Current password is incorrect");
  }

  const newHash = await hashPassword(data.newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newHash,
    },
  });

  return { success: true };
};
