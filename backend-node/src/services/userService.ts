import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { toPlainObject } from "../utils/serializer";

export const getUserProfile = async (userId: number) => {
  const user = (await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: { role: true },
      },
      sellerProfile: true,
    },
  })) as Prisma.UserGetPayload<{
    include: {
      roles: { include: { role: true } };
      sellerProfile: true;
    };
  }>;

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
    email_verified: user.emailVerified,
    status: user.status,
    roles: user.roles.map((r: any) => r.role.name.toLowerCase()),
    seller_status: user.sellerStatus?.toLowerCase?.() ?? "pending",
    seller_profile_status: user.sellerProfile?.status?.toLowerCase?.(),
    seller_profile: user.sellerProfile
      ? {
          full_name: user.sellerProfile.fullName,
          phone: user.sellerProfile.phone,
          city: user.sellerProfile.city,
          address: user.sellerProfile.address,
          torod_warehouse_id: user.sellerProfile.torodWarehouseId ?? null,
          status: user.sellerProfile.status?.toLowerCase?.() ?? user.sellerProfile.status,
        }
      : null,
    seller_profile_submitted: Boolean(user.sellerProfile),
  });
};

export const updateUserProfile = async (
  userId: number,
  data: { full_name?: string | undefined; phone?: string | undefined; avatar_url?: string | undefined }
) => {
  const updateData: Prisma.UserUpdateInput = {};
  if (data.full_name !== undefined) updateData.fullName = data.full_name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.avatar_url !== undefined) updateData.avatarUrl = data.avatar_url;

  const user = (await prisma.user.update({
    where: { id: userId },
    data: updateData,
    include: {
      roles: {
        include: { role: true },
      },
    },
  })) as Prisma.UserGetPayload<{
    include: { roles: { include: { role: true } } };
  }>;

  return toPlainObject({
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    created_at: user.createdAt,
    phone: user.phone,
    avatar_url: user.avatarUrl,
    verified_seller: user.verifiedSeller,
    email_verified: user.emailVerified,
    status: user.status,
    roles: user.roles.map((r: any) => r.role.name.toLowerCase()),
  });
};
