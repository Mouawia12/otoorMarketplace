import { Prisma, PrismaClient, RoleName } from "@prisma/client";

import { prisma } from "../prisma/client";
import { hashPassword } from "../utils/password";

const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL ?? "fragreworld@gmail.com";
const ADMIN_PASSWORD_ENV = process.env.ADMIN_SEED_PASSWORD;
const ADMIN_PASSWORD =
  ADMIN_PASSWORD_ENV && ADMIN_PASSWORD_ENV.length >= 8
    ? ADMIN_PASSWORD_ENV
    : "Admin123!";

if (!ADMIN_PASSWORD_ENV) {
  console.warn(
    "⚠️  ADMIN_SEED_PASSWORD not set. Using default development password.",
  );
}

if (ADMIN_PASSWORD_ENV && ADMIN_PASSWORD_ENV.length < 8) {
  console.warn(
    "⚠️  ADMIN_SEED_PASSWORD is shorter than 8 characters. Using fallback password.",
  );
}

type SeedContext = {
  prisma: PrismaClient | Prisma.TransactionClient;
  requirePasswordReset?: boolean;
};

async function resetDatabase(client: PrismaClient | Prisma.TransactionClient) {
  console.log("🧹 Clearing existing data...");
  await client.bid.deleteMany();
  await client.auction.deleteMany();
  await client.orderItem.deleteMany();
  await client.order.deleteMany();
  await client.productReview.deleteMany();
  await client.wishlistItem.deleteMany();
  await client.productImage.deleteMany();
  await client.productTemplateImage.deleteMany();
  await client.productTemplate.deleteMany();
  await client.product.deleteMany();
  await client.address.deleteMany();
  await client.supportReply.deleteMany();
  await client.supportTicket.deleteMany();
  await client.sellerProfile.deleteMany();
  await client.userRole.deleteMany();
  await client.post.deleteMany();
  await client.footerPage.deleteMany();
  await client.role.deleteMany();
  await client.user.deleteMany();
}

async function seedRoles(client: PrismaClient | Prisma.TransactionClient) {
  const roles = [
    RoleName.SUPER_ADMIN,
    RoleName.ADMIN,
    RoleName.MODERATOR,
    RoleName.SUPPORT,
    RoleName.SELLER,
    RoleName.BUYER,
  ];

  for (const name of roles) {
    await client.role.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
}

async function seedAdmin(
  client: PrismaClient | Prisma.TransactionClient,
  requirePasswordReset: boolean,
) {
  const adminPassword = await hashPassword(ADMIN_PASSWORD);

  await client.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      passwordHash: adminPassword,
      fullName: "Platform Admin",
      verifiedSeller: false,
      requiresPasswordReset: requirePasswordReset,
      roles: {
        create: [
          { role: { connect: { name: RoleName.SUPER_ADMIN } } },
          { role: { connect: { name: RoleName.ADMIN } } },
        ],
      },
    },
    update: {
      passwordHash: adminPassword,
      requiresPasswordReset: requirePasswordReset,
    },
  });
}

export async function runSeed({
  prisma: client,
  requirePasswordReset = true,
}: SeedContext) {
  await resetDatabase(client);
  await seedRoles(client);
  await seedAdmin(client, requirePasswordReset);
}

const isCheckMode = process.argv.includes("--check");
const CHECK_SIGNAL = "SEED_CHECK_COMPLETE";

async function main() {
  try {
    if (isCheckMode) {
      console.log("🔍 Running seed check (no data persisted)...");
      await prisma.$transaction(
        async (tx) => {
          await runSeed({ prisma: tx, requirePasswordReset: true });
          throw new Error(CHECK_SIGNAL);
        },
        { maxWait: 10000, timeout: 30000 },
      );
    } else {
      await runSeed({ prisma, requirePasswordReset: true });
      console.log("✅ Database seeded with clean admin account.");
    }
  } catch (error) {
    if (error instanceof Error && error.message === CHECK_SIGNAL) {
      console.log("✅ Seed check completed successfully.");
      return;
    }
    console.error("❌ Seeding failed", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
