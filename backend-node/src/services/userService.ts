import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { toPlainObject } from "../utils/serializer";

export const getUserProfile = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: { role: true },
      },
      sellerProfile: true,
    },
  });

  if (!user) {
    throw AppError.notFound("User not found");
  }

  return toPlainObject({
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    created_at: user.createdAt,
    phone: user.phone,
    avatar_url: user.avatarUrl,
    verified_seller: user.verifiedSeller,
    status: user.status,
    roles: user.roles.map((r) => r.role.name.toLowerCase()),
    seller_status: user.sellerStatus?.toLowerCase?.() ?? "pending",
    seller_profile: user.sellerProfile
      ? {
          full_name: user.sellerProfile.fullName,
          phone: user.sellerProfile.phone,
          city: user.sellerProfile.city,
          address: user.sellerProfile.address,
          national_id: user.sellerProfile.nationalId,
          iban: user.sellerProfile.iban,
          bank_name: user.sellerProfile.bankName,
          status: user.sellerProfile.status?.toLowerCase?.() ?? user.sellerProfile.status,
        }
      : null,
  });
};

export const updateUserProfile = async (
  userId: number,
  data: { full_name?: string; phone?: string; avatar_url?: string }
) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: data.full_name ?? undefined,
      phone: data.phone ?? undefined,
      avatarUrl: data.avatar_url ?? undefined,
    },
    include: {
      roles: {
        include: { role: true },
      },
    },
  });

  return toPlainObject({
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    created_at: user.createdAt,
    phone: user.phone,
    avatar_url: user.avatarUrl,
    verified_seller: user.verifiedSeller,
    status: user.status,
    roles: user.roles.map((r) => r.role.name.toLowerCase()),
  });
};
