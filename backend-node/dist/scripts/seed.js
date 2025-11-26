"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const client_2 = require("../prisma/client");
const password_1 = require("../utils/password");
const slugify_1 = require("../utils/slugify");
const env_1 = require("../config/env");
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
        condition: client_1.ProductCondition.NEW,
        stockQuantity: 25,
        status: client_1.ProductStatus.PUBLISHED,
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
        condition: client_1.ProductCondition.NEW,
        stockQuantity: 30,
        status: client_1.ProductStatus.PUBLISHED,
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
        condition: client_1.ProductCondition.USED,
        stockQuantity: 8,
        status: client_1.ProductStatus.PUBLISHED,
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
        condition: client_1.ProductCondition.NEW,
        stockQuantity: 12,
        status: client_1.ProductStatus.PUBLISHED,
        imageUrls: ["/images/placeholder-perfume.svg"],
    },
];
const roleNames = [
    client_1.RoleName.SUPER_ADMIN,
    client_1.RoleName.ADMIN,
    client_1.RoleName.MODERATOR,
    client_1.RoleName.SUPPORT,
    client_1.RoleName.SELLER,
    client_1.RoleName.BUYER,
];
async function resetDatabase() {
    console.log("🧹 Clearing existing data...");
    await client_2.prisma.$transaction([
        client_2.prisma.bid.deleteMany(),
        client_2.prisma.auction.deleteMany(),
        client_2.prisma.orderItem.deleteMany(),
        client_2.prisma.order.deleteMany(),
        client_2.prisma.productReview.deleteMany(),
        client_2.prisma.wishlistItem.deleteMany(),
        client_2.prisma.productImage.deleteMany(),
        client_2.prisma.productTemplateImage.deleteMany(),
        client_2.prisma.productTemplate.deleteMany(),
        client_2.prisma.product.deleteMany(),
        client_2.prisma.address.deleteMany(),
        client_2.prisma.supportReply.deleteMany(),
        client_2.prisma.supportTicket.deleteMany(),
        client_2.prisma.sellerProfile.deleteMany(),
        client_2.prisma.userRole.deleteMany(),
        client_2.prisma.post.deleteMany(),
        client_2.prisma.role.deleteMany(),
        client_2.prisma.user.deleteMany(),
    ]);
}
async function ensureSchema() {
    const columnCheck = await client_2.prisma.$queryRaw `SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Order' AND column_name = 'platform_fee'`;
    if (columnCheck.length === 0) {
        console.log("🛠️  Adding missing column Order.platform_fee ...");
        await client_2.prisma.$executeRawUnsafe("ALTER TABLE `Order` ADD COLUMN `platform_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER `total_amount`;");
    }
}
async function seedRoles() {
    for (const name of roleNames) {
        await client_2.prisma.role.upsert({
            where: { name },
            create: { name },
            update: {},
        });
    }
}
async function seedUsers() {
    const adminPassword = await (0, password_1.hashPassword)("Admin123!");
    const sellerPassword = await (0, password_1.hashPassword)("Seller123!");
    const buyerPassword = await (0, password_1.hashPassword)("Buyer123!");
    const admin = await client_2.prisma.user.upsert({
        where: { email: "admin@otoor.test" },
        create: {
            email: "admin@otoor.test",
            passwordHash: adminPassword,
            fullName: "System Admin",
            roles: {
                create: [
                    { role: { connect: { name: client_1.RoleName.SUPER_ADMIN } } },
                    { role: { connect: { name: client_1.RoleName.ADMIN } } },
                ],
            },
        },
        update: {},
        include: { roles: { include: { role: true } } },
    });
    const seller = await client_2.prisma.user.upsert({
        where: { email: "seller@otoor.test" },
        create: {
            email: "seller@otoor.test",
            passwordHash: sellerPassword,
            fullName: "Ahmed Al-Rashid",
            verifiedSeller: true,
            sellerStatus: client_1.SellerStatus.APPROVED,
            roles: {
                create: [{ role: { connect: { name: client_1.RoleName.SELLER } } }],
            },
        },
        update: {},
        include: { roles: { include: { role: true } } },
    });
    await client_2.prisma.sellerProfile.upsert({
        where: { userId: seller.id },
        update: {
            fullName: "Ahmed Al-Rashid",
            phone: "+966511111111",
            city: "Riyadh",
            address: "Olaya Street, Tower 2",
            nationalId: "1234567890",
            iban: "SA4420000001234567891234",
            bankName: "Al Rajhi Bank",
            status: client_1.SellerStatus.APPROVED,
        },
        create: {
            userId: seller.id,
            fullName: "Ahmed Al-Rashid",
            phone: "+966511111111",
            city: "Riyadh",
            address: "Olaya Street, Tower 2",
            nationalId: "1234567890",
            iban: "SA4420000001234567891234",
            bankName: "Al Rajhi Bank",
            status: client_1.SellerStatus.APPROVED,
        },
    });
    const buyer = await client_2.prisma.user.upsert({
        where: { email: "buyer@otoor.test" },
        create: {
            email: "buyer@otoor.test",
            passwordHash: buyerPassword,
            fullName: "Lina Al-Salem",
            sellerStatus: client_1.SellerStatus.APPROVED,
            roles: {
                create: [{ role: { connect: { name: client_1.RoleName.BUYER } } }],
            },
        },
        update: {},
        include: { roles: { include: { role: true } } },
    });
    return { admin, seller, buyer };
}
const productTemplateSeedData = [
    {
        nameAr: "مزيج العنبر الفاخر",
        nameEn: "Amber Luxe Blend",
        descriptionAr: "خليط غني من العنبر، الفانيليا ولمسات خشبية للسهرة.",
        descriptionEn: "Rich amber, vanilla, and woody blend perfect for evenings.",
        productType: "eau_de_parfum",
        brand: "House Blend",
        category: "oriental",
        basePrice: 220,
        sizeMl: 75,
        concentration: "EDP",
    },
    {
        nameAr: "نسيم البحر",
        nameEn: "Sea Breeze",
        descriptionAr: "عطر صيفي منعش بروائح البحر والحمضيات.",
        descriptionEn: "Fresh summer scent with marine and citrus notes.",
        productType: "eau_de_toilette",
        brand: "Coastal",
        category: "fresh",
        basePrice: 140,
        sizeMl: 100,
        concentration: "EDT",
    },
    {
        nameAr: "ليلة الورد",
        nameEn: "Rosey Night",
        descriptionAr: "باقة من الورود الشرقية مع لمسة من العود الأبيض.",
        descriptionEn: "Bouquet of oriental roses with a touch of white oud.",
        productType: "eau_de_parfum",
        brand: "Rose Atelier",
        category: "floral",
        basePrice: 260,
        sizeMl: 70,
        concentration: "EDP",
    },
    {
        nameAr: "غابات الشمال",
        nameEn: "Nordic Woods",
        descriptionAr: "مزيج خشبي دخاني مع أرز وأخشاب أرز الأطلس.",
        descriptionEn: "Smoky woody blend with cedar and atlas woods.",
        productType: "eau_de_parfum",
        brand: "Nordic",
        category: "woody",
        basePrice: 210,
        sizeMl: 90,
        concentration: "EDP",
    },
    {
        nameAr: "شروق الحمضيات",
        nameEn: "Citrus Sunrise",
        descriptionAr: "حمضيات مشرقة مع لمسات من النيرولي والياسمين.",
        descriptionEn: "Bright citrus with neroli and jasmine touches.",
        productType: "eau_de_parfum",
        brand: "Sunline",
        category: "citrus",
        basePrice: 180,
        sizeMl: 80,
        concentration: "EDP",
    },
    {
        nameAr: "عود ملكي",
        nameEn: "Royal Oud",
        descriptionAr: "تركيبة عربية فاخرة من العود والزعفران والمسك الأبيض.",
        descriptionEn: "Luxurious oud with saffron and white musk.",
        productType: "parfum",
        brand: "Otoor",
        category: "oriental",
        basePrice: 350,
        sizeMl: 60,
        concentration: "PARFUM",
    },
];
async function seedProductTemplates(adminId) {
    for (const template of productTemplateSeedData) {
        await client_2.prisma.productTemplate.create({
            data: {
                nameAr: template.nameAr,
                nameEn: template.nameEn,
                descriptionAr: template.descriptionAr,
                descriptionEn: template.descriptionEn,
                productType: template.productType,
                brand: template.brand,
                category: template.category,
                basePrice: new client_1.Prisma.Decimal(template.basePrice),
                sizeMl: template.sizeMl,
                concentration: template.concentration,
                createdById: adminId,
                images: {
                    create: [
                        {
                            url: "/images/placeholder-perfume.svg",
                            sortOrder: 0,
                        },
                    ],
                },
            },
        });
    }
}
async function seedProducts(sellerId) {
    for (const product of productSeedData) {
        const slugBase = (0, slugify_1.makeSlug)(product.nameEn);
        await client_2.prisma.product.create({
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
                basePrice: new client_1.Prisma.Decimal(product.basePrice),
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
async function seedAddresses(buyerId) {
    await client_2.prisma.address.create({
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
async function seedAuctions(sellerId) {
    const product = await client_2.prisma.product.findFirst({
        where: { slug: (0, slugify_1.makeSlug)("Chanel No 5") },
    });
    if (!product) {
        return;
    }
    const existing = await client_2.prisma.auction.findUnique({
        where: { productId: product.id },
    });
    if (existing) {
        return;
    }
    await client_2.prisma.auction.create({
        data: {
            productId: product.id,
            sellerId,
            startingPrice: new client_1.Prisma.Decimal(100),
            currentPrice: new client_1.Prisma.Decimal(120),
            minimumIncrement: new client_1.Prisma.Decimal(5),
            startTime: new Date(Date.now() - 1000 * 60 * 60),
            endTime: new Date(Date.now() + 1000 * 60 * 60 * 12),
            status: client_1.AuctionStatus.ACTIVE,
        },
    });
}
async function seedSampleOrder(buyerId) {
    const product = await client_2.prisma.product.findFirst({
        where: { status: client_1.ProductStatus.PUBLISHED },
    });
    if (!product) {
        return;
    }
    const unitPrice = new client_1.Prisma.Decimal(product.basePrice);
    const platformFee = unitPrice.mul(env_1.config.platformCommissionRate);
    await client_2.prisma.order.create({
        data: {
            buyerId,
            status: client_1.OrderStatus.PENDING,
            paymentMethod: "COD",
            shippingName: "Lina Al-Salem",
            shippingPhone: "+966500000000",
            shippingCity: "Riyadh",
            shippingRegion: "Riyadh",
            shippingAddress: "King Fahd Road, Tower A",
            subtotalAmount: unitPrice,
            discountAmount: new client_1.Prisma.Decimal(0),
            shippingFee: new client_1.Prisma.Decimal(0),
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
    await client_2.prisma.product.update({
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
    const { admin, seller, buyer } = await seedUsers();
    await seedProductTemplates(admin.id);
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
    await client_2.prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map