import { RoleName } from "@prisma/client";
import { prisma } from "../prisma/client";
import { hashPassword } from "../utils/password";

const ADMIN_EMAIL = "fragreworld@gmail.com";

async function resetDatabase() {
  console.log("🧹 Clearing existing data...");
  await prisma.$transaction([
    prisma.bid.deleteMany(),
    prisma.auction.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.productReview.deleteMany(),
    prisma.wishlistItem.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.productTemplateImage.deleteMany(),
    prisma.productTemplate.deleteMany(),
    prisma.product.deleteMany(),
    prisma.address.deleteMany(),
    prisma.supportReply.deleteMany(),
    prisma.supportTicket.deleteMany(),
    prisma.sellerProfile.deleteMany(),
    prisma.userRole.deleteMany(),
    prisma.post.deleteMany(),
    prisma.role.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function seedRoles() {
  const roles = [
    RoleName.SUPER_ADMIN,
    RoleName.ADMIN,
    RoleName.MODERATOR,
    RoleName.SUPPORT,
    RoleName.SELLER,
    RoleName.BUYER,
  ];

  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
}

async function seedAdmin() {
  const adminPassword = await hashPassword("Admin123!");

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      passwordHash: adminPassword,
      fullName: "Platform Admin",
      verifiedSeller: false,
      roles: {
        create: [
          { role: { connect: { name: RoleName.SUPER_ADMIN } } },
          { role: { connect: { name: RoleName.ADMIN } } },
        ],
      },
    },
    update: {
      passwordHash: adminPassword,
    },
  });
}

async function main() {
  try {
    await resetDatabase();
    await seedRoles();
    await seedAdmin();
    console.log("✅ Database seeded with clean admin account.");
  } catch (error) {
    console.error("❌ Seeding failed", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
