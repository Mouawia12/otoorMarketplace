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
  });
};
