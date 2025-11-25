import {
  Prisma,
  RoleName,
  SellerStatus,
  ProductCondition,
  ProductStatus,
  AuctionStatus,
  OrderStatus,
} from "@prisma/client";

import { prisma } from "../prisma/client";
import { hashPassword } from "../utils/password";
import { makeSlug } from "../utils/slugify";
import { config } from "../config/env";

const productSeedData = [
  {
    nameAr: "شانيل رقم 5",
    nameEn: "Chanel No 5",
    descriptionAr: "عطر كلاسيكي فاخر مع نفحات من الياسمين والورد والفانيليا",
    descriptionEn: "Classic luxury perfume with jasmine, rose and vanilla notes",
    productType: "eau_de_parfum",
    brand: "Chanel",
    category: "floral",
    basePrice: 150.0,
    sizeMl: 100,
    concentration: "EDP",
    condition: ProductCondition.NEW,
    stockQuantity: 25,
    status: ProductStatus.PUBLISHED,
    imageUrls: [
      "/images/placeholder-perfume.svg",
    ],
  },
  {
    nameAr: "ديور سوفاج",
    nameEn: "Dior Sauvage",
    descriptionAr: "عطر خشبي حار",
    descriptionEn: "Woody spicy fragrance",
    productType: "eau_de_toilette",
    brand: "Dior",
    category: "woody",
    basePrice: 120.0,
    sizeMl: 100,
    concentration: "EDT",
    condition: ProductCondition.NEW,
    stockQuantity: 30,
    status: ProductStatus.PUBLISHED,
    imageUrls: ["/images/placeholder-perfume.svg"],
  },
  {
    nameAr: "توم فورد أود وود",
    nameEn: "Tom Ford Oud Wood",
    descriptionAr: "عطر شرقي فاخر",
    descriptionEn: "Luxurious oriental scent",
    productType: "eau_de_parfum",
    brand: "Tom Ford",
    category: "oriental",
    basePrice: 280.0,
    sizeMl: 50,
    concentration: "EDP",
    condition: ProductCondition.USED,
    stockQuantity: 8,
    status: ProductStatus.PUBLISHED,
    imageUrls: ["/images/placeholder-perfume.svg"],
  },
  {
    nameAr: "كريد أفينتوس",
    nameEn: "Creed Aventus",
    descriptionAr: "عطر فواكه منعش",
    descriptionEn: "Fresh fruity fragrance",
    productType: "eau_de_parfum",
    brand: "Creed",
    category: "fresh",
    basePrice: 350.0,
    sizeMl: 100,
    concentration: "EDP",
    condition: ProductCondition.NEW,
    stockQuantity: 12,
    status: ProductStatus.PUBLISHED,
    imageUrls: ["/images/placeholder-perfume.svg"],
  },
];

const roleNames = [
  RoleName.SUPER_ADMIN,
  RoleName.ADMIN,
  RoleName.MODERATOR,
  RoleName.SUPPORT,
  RoleName.SELLER,
  RoleName.BUYER,
];

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

async function ensureSchema() {
  const columnCheck = await prisma.$queryRaw<
    Array<{ column_name: string }>
  >`SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Order' AND column_name = 'platform_fee'`;

  if (columnCheck.length === 0) {
    console.log("🛠️  Adding missing column Order.platform_fee ...");
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `Order` ADD COLUMN `platform_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER `total_amount`;"
    );
  }
}

async function seedRoles() {
  for (const name of roleNames) {
    await prisma.role.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
}

async function seedUsers() {
  const adminPassword = await hashPassword("Admin123!");
  const sellerPassword = await hashPassword("Seller123!");
  const buyerPassword = await hashPassword("Buyer123!");

  const admin = await prisma.user.upsert({
    where: { email: "admin@otoor.test" },
    create: {
      email: "admin@otoor.test",
      passwordHash: adminPassword,
      fullName: "System Admin",
      roles: {
        create: [
          { role: { connect: { name: RoleName.SUPER_ADMIN } } },
          { role: { connect: { name: RoleName.ADMIN } } },
        ],
      },
    },
    update: {},
    include: { roles: { include: { role: true } } },
  });

  const seller = await prisma.user.upsert({
    where: { email: "seller@otoor.test" },
    create: {
      email: "seller@otoor.test",
      passwordHash: sellerPassword,
      fullName: "Ahmed Al-Rashid",
      verifiedSeller: true,
      roles: {
        create: [{ role: { connect: { name: RoleName.SELLER } } }],
      },
    },
    update: {},
    include: { roles: { include: { role: true } } },
  });

  const buyer = await prisma.user.upsert({
    where: { email: "buyer@otoor.test" },
    create: {
      email: "buyer@otoor.test",
      passwordHash: buyerPassword,
      fullName: "Lina Al-Salem",
      roles: {
        create: [{ role: { connect: { name: RoleName.BUYER } } }],
      },
    },
    update: {},
    include: { roles: { include: { role: true } } },
  });

  return { admin, seller, buyer };
}

async function seedProducts(sellerId: number) {
  for (const product of productSeedData) {
    const slugBase = makeSlug(product.nameEn);
    await prisma.product.create({
      data: {
        sellerId,
        nameAr: product.nameAr,
        nameEn: product.nameEn,
        slug: slugBase,
        descriptionAr: product.descriptionAr,
        descriptionEn: product.descriptionEn,
        productType: product.productType,
        brand: product.brand,
        category: product.category,
        basePrice: new Prisma.Decimal(product.basePrice),
        sizeMl: product.sizeMl,
        concentration: product.concentration,
        condition: product.condition,
        stockQuantity: product.stockQuantity,
        status: product.status,
        images: {
          create: product.imageUrls.map((url, index) => ({
            url,
            sortOrder: index,
          })),
        },
      },
    });
  }
}

async function seedAddresses(buyerId: number) {
  await prisma.address.create({
    data: {
      userId: buyerId,
      label: "Home",
      recipient: "Lina Al-Salem",
      phone: "+966500000000",
      city: "Riyadh",
      region: "Riyadh",
      street: "King Fahd Road",
      building: "Tower A",
      notes: "Ring the bell upon arrival",
      isDefault: true,
    },
  });
}

async function seedAuctions(sellerId: number) {
  const product = await prisma.product.findFirst({
    where: { slug: makeSlug("Chanel No 5") },
  });

  if (!product) {
    return;
  }

  const existing = await prisma.auction.findUnique({
    where: { productId: product.id },
  });

  if (existing) {
    return;
  }

  await prisma.auction.create({
    data: {
      productId: product.id,
      sellerId,
      startingPrice: new Prisma.Decimal(100),
      currentPrice: new Prisma.Decimal(120),
      minimumIncrement: new Prisma.Decimal(5),
      startTime: new Date(Date.now() - 1000 * 60 * 60),
      endTime: new Date(Date.now() + 1000 * 60 * 60 * 12),
      status: AuctionStatus.ACTIVE,
    },
  });
}

async function seedSampleOrder(buyerId: number) {
  const product = await prisma.product.findFirst({
    where: { status: ProductStatus.PUBLISHED },
  });

  if (!product) {
    return;
  }

  const unitPrice = new Prisma.Decimal(product.basePrice);
  const platformFee = unitPrice.mul(config.platformCommissionRate);

  await prisma.order.create({
    data: {
      buyerId,
      status: OrderStatus.PENDING,
      paymentMethod: "COD",
      shippingName: "Lina Al-Salem",
      shippingPhone: "+966500000000",
      shippingCity: "Riyadh",
      shippingRegion: "Riyadh",
      shippingAddress: "King Fahd Road, Tower A",
      subtotalAmount: unitPrice,
      discountAmount: new Prisma.Decimal(0),
      shippingFee: new Prisma.Decimal(0),
      totalAmount: unitPrice,
      platformFee,
      items: {
        create: [
          {
            productId: product.id,
            quantity: 1,
            unitPrice,
            totalPrice: unitPrice,
          },
        ],
      },
    },
  });

  await prisma.product.update({
    where: { id: product.id },
    data: {
      stockQuantity: product.stockQuantity > 0 ? product.stockQuantity - 1 : product.stockQuantity,
    },
  });
}

async function main() {
  console.log("🌱 Seeding database...");
  await resetDatabase();
  await ensureSchema();
  await seedRoles();
  const { seller, buyer } = await seedUsers();
  await seedProducts(seller.id);
  await seedAddresses(buyer.id);
  await seedAuctions(seller.id);
  await seedSampleOrder(buyer.id);
  console.log("✅ Seeding completed");
}

main()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
