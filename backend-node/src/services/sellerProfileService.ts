import { z } from "zod";
import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { toPlainObject } from "../utils/serializer";
import { RoleName, SellerStatus } from "@prisma/client";

const profileSchema = z.object({
  full_name: z.string().min(3),
  phone: z.string().min(8),
  city: z.string().min(2),
  address: z.string().min(5),
  national_id: z.string().min(8),
  iban: z.string().min(10),
  bank_name: z.string().min(2),
});

export const upsertSellerProfile = async (userId: number, input: unknown) => {
  const data = profileSchema.parse(input);

  const profile = await prisma.sellerProfile.upsert({
    where: { userId },
    update: {
      fullName: data.full_name,
      phone: data.phone,
      city: data.city,
      address: data.address,
      nationalId: data.national_id,
      iban: data.iban,
      bankName: data.bank_name,
      status: SellerStatus.PENDING,
    },
    create: {
      userId,
      fullName: data.full_name,
      phone: data.phone,
      city: data.city,
      address: data.address,
      nationalId: data.national_id,
      iban: data.iban,
      bankName: data.bank_name,
      status: SellerStatus.PENDING,
    },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      sellerStatus: SellerStatus.PENDING,
      roles: {
        connectOrCreate: {
          where: {
            userId_roleId: {
              userId,
              roleId: (await ensureSellerRole()).id,
            },
          },
          create: {
            role: { connect: { name: RoleName.SELLER } },
          },
        },
      },
    },
  });

  return mapProfile(profile);
};

export const getSellerProfile = async (userId: number) => {
  const profile = await prisma.sellerProfile.findUnique({
    where: { userId },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });
  if (!profile) {
    return null;
  }
  return mapProfile(profile);
};

export const listSellerProfiles = async (status?: SellerStatus) => {
  const profiles = await prisma.sellerProfile.findMany({
    where: status ? { status } : {},
    include: { user: { select: { id: true, fullName: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return profiles.map(mapProfile);
};

export const updateSellerProfileStatus = async (userId: number, status: SellerStatus) => {
  const profile = await prisma.sellerProfile.update({
    where: { userId },
    data: { status },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { sellerStatus: status, verifiedSeller: status === SellerStatus.APPROVED },
  });

  return mapProfile(profile);
};

const ensureSellerRole = async () => {
  // Ensure seller role exists, create if missing
  const role = await prisma.role.upsert({
    where: { name: RoleName.SELLER },
    update: {},
    create: { name: RoleName.SELLER },
  });
  return role;
};

const mapProfile = (profile: any) => {
  const plain = toPlainObject(profile);
  return {
    id: plain.id,
    user_id: plain.userId,
    full_name: plain.fullName,
    phone: plain.phone,
    city: plain.city,
    address: plain.address,
    national_id: plain.nationalId,
    iban: plain.iban,
    bank_name: plain.bankName,
    status: plain.status?.toLowerCase?.() ?? plain.status,
    created_at: plain.createdAt,
    updated_at: plain.updatedAt,
    user: plain.user
      ? {
          id: plain.user.id,
          full_name: plain.user.fullName,
          email: plain.user.email,
        }
      : undefined,
  };
};
