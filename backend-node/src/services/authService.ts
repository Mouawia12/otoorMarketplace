import crypto from "crypto";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { Prisma, RoleName } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../prisma/client";
import { hashPassword, verifyPassword } from "../utils/password";
import { AppError } from "../utils/errors";
import { signAccessToken } from "../utils/jwt";
import { config } from "../config/env";
import { sendMail } from "../utils/mailer";

const userWithRolesInclude = Prisma.validator<Prisma.UserInclude>()({
  roles: { include: { role: true } },
  sellerProfile: true,
});

type UserWithRoles = Prisma.UserGetPayload<{
  include: typeof userWithRolesInclude;
}>;

const mapSellerProfile = (profile: UserWithRoles['sellerProfile']) => {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    full_name: profile.fullName,
    phone: profile.phone,
    city: profile.city,
    address: profile.address,
    national_id: profile.nationalId,
    iban: profile.iban,
    bank_name: profile.bankName,
    status: profile.status?.toLowerCase?.() ?? profile.status,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
};

const serializeUser = (user: UserWithRoles) => {
  const sellerProfile = mapSellerProfile(user.sellerProfile);

  return {
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    avatar_url: user.avatarUrl,
    created_at: user.createdAt,
    status: user.status,
    roles: user.roles.map((roleRelation) => roleRelation.role.name.toLowerCase()),
    seller_status: user.sellerStatus?.toLowerCase?.() ?? "pending",
    seller_profile_status: sellerProfile?.status,
    seller_profile: sellerProfile,
    seller_profile_submitted: Boolean(sellerProfile),
    verified_seller: user.verifiedSeller,
    requires_password_reset: user.requiresPasswordReset,
  };
};

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

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const PASSWORD_RESET_EXPIRY_MINUTES = 15;

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

export const requestPasswordReset = async (
  input: z.infer<typeof forgotPasswordSchema>,
) => {
  const data = forgotPasswordSchema.parse(input);
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw AppError.notFound("الحساب غير موجود");
  }

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  const rawToken = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      token: rawToken,
      userId: user.id,
      expiresAt,
    },
  });

  const resetUrl = `${config.auth.passwordResetUrl}?token=${encodeURIComponent(rawToken)}`;
  const plainText = [
    "مرحباً،",
    "",
    "لقد طلبت إعادة تعيين كلمة المرور الخاصة بك في منصة أطور.",
    `لإعادة التعيين اضغط على الرابط التالي (صالح لمدة ${PASSWORD_RESET_EXPIRY_MINUTES} دقيقة):`,
    resetUrl,
    "",
    "إذا لم تطلب هذه العملية فيرجى تجاهل الرسالة.",
  ].join("\n");

  const html = `
    <p>مرحباً ${user.fullName ?? ""}</p>
    <p>لقد استلمنا طلباً لإعادة تعيين كلمة المرور الخاصة بك.</p>
    <p>
      <a href="${resetUrl}" style="color:#a67c52;font-weight:bold;">إعادة تعيين كلمة المرور</a>
    </p>
    <p>الرابط صالح لمدة ${PASSWORD_RESET_EXPIRY_MINUTES} دقيقة واحدة فقط.</p>
    <p>إذا لم تطلب هذه العملية يمكنك تجاهل هذه الرسالة.</p>
  `;

  await sendMail({
    to: user.email,
    subject: "إعادة تعيين كلمة المرور",
    html,
    text: plainText,
  });
};

export const resetPassword = async (
  input: z.infer<typeof resetPasswordSchema>,
) => {
  const data = resetPasswordSchema.parse(input);
  const tokenRecord = await prisma.passwordResetToken.findUnique({
    where: { token: data.token },
  });

  if (!tokenRecord) {
    throw AppError.badRequest("الرابط غير صالح أو منتهي");
  }

  if (tokenRecord.usedAt) {
    throw AppError.badRequest("تم استخدام رابط إعادة التعيين مسبقاً");
  }

  if (tokenRecord.expiresAt.getTime() < Date.now()) {
    throw AppError.badRequest("انتهت صلاحية رابط إعادة التعيين");
  }

  const passwordHash = await hashPassword(data.password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: tokenRecord.userId, id: { not: tokenRecord.id } },
    }),
  ]);
};

export const authenticateUser = async (input: z.infer<typeof loginSchema>) => {
  const data = loginSchema.parse(input);

  const user = (await prisma.user.findUnique({
    where: { email: data.email },
    include: userWithRolesInclude,
  })) as UserWithRoles | null;

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
      requiresPasswordReset: false,
    },
  });

  return { success: true };
};
