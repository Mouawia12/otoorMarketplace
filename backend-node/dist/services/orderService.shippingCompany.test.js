"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const client_1 = require("@prisma/client");
const prismaMock = vitest_1.vi.hoisted(() => ({
    product: {
        findMany: vitest_1.vi.fn(),
    },
    sellerWarehouse: {
        findMany: vitest_1.vi.fn(),
    },
    user: {
        findUnique: vitest_1.vi.fn(),
    },
    order: {
        update: vitest_1.vi.fn(),
        findUnique: vitest_1.vi.fn(),
        findUniqueOrThrow: vitest_1.vi.fn(),
    },
    vendorOrder: {
        update: vitest_1.vi.fn(),
        findUnique: vitest_1.vi.fn(),
    },
    $transaction: vitest_1.vi.fn(),
}));
vitest_1.vi.mock("../prisma/client", () => ({
    prisma: prismaMock,
}));
vitest_1.vi.mock("./torodService", () => ({
    listCourierPartners: vitest_1.vi.fn().mockResolvedValue({
        data: [
            { id: 11, title: "Partner A", supports_prepaid: true },
            { id: 12, title: "Partner B", supports_prepaid: true },
        ],
    }),
    createOrder: vitest_1.vi.fn().mockResolvedValue({ id: "TOROD-1", trackingNumber: "TRK-1" }),
    shipOrder: vitest_1.vi.fn().mockResolvedValue({ status: "created", trackingNumber: "TRK-1" }),
    listOrderCourierPartners: vitest_1.vi.fn(),
    listWarehouses: vitest_1.vi.fn(),
}));
const orderService_1 = require("./orderService");
(0, vitest_1.describe)("orderService torod shipping company validation", () => {
    const buildOrderRecord = () => ({
        id: 100,
        buyerId: 1,
        totalAmount: new client_1.Prisma.Decimal(100),
        paymentMethod: "BANK_TRANSFER",
        shippingAddress: "Test Address",
        shippingName: "Test User",
        shippingPhone: "+966 555555555",
        shippingCity: "Riyadh",
        shippingRegion: "Riyadh",
        shippingMethod: "torod",
        shippingFee: new client_1.Prisma.Decimal(0),
        discountAmount: new client_1.Prisma.Decimal(0),
        couponCode: null,
        status: "PENDING",
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        platformFee: new client_1.Prisma.Decimal(0),
        codAmount: null,
        codCurrency: null,
        customerCityCode: "100",
        customerCountry: "SA",
        redboxShipmentId: null,
        redboxTrackingNumber: null,
        redboxLabelUrl: null,
        redboxStatus: null,
        myfatoorahMethodId: null,
        myfatoorahMethodCode: null,
        myfatoorahStatus: null,
        myfatoorahPaymentUrl: null,
        items: [
            {
                id: 1001,
                productId: 1,
                quantity: 1,
                unitPrice: new client_1.Prisma.Decimal(100),
                totalPrice: new client_1.Prisma.Decimal(100),
                product: null,
            },
        ],
        vendorOrders: [
            {
                id: 200,
                sellerId: 5,
                status: "PENDING",
                shippingMethod: "torod",
                shippingCompanyId: 11,
                warehouseCode: "WH-7",
                shipperCityId: 1,
                torodOrderId: "TOROD-1",
                trackingNumber: "TRK-1",
                labelUrl: "https://example.com/label.pdf",
                torodStatus: "created",
                subtotalAmount: new client_1.Prisma.Decimal(100),
                discountAmount: new client_1.Prisma.Decimal(0),
                shippingFee: new client_1.Prisma.Decimal(0),
                totalAmount: new client_1.Prisma.Decimal(100),
                platformFee: new client_1.Prisma.Decimal(0),
                items: [
                    {
                        id: 300,
                        orderItemId: 1001,
                        productId: 1,
                        quantity: 1,
                        unitPrice: new client_1.Prisma.Decimal(100),
                        totalPrice: new client_1.Prisma.Decimal(100),
                    },
                ],
            },
        ],
    });
    (0, vitest_1.beforeEach)(() => {
        prismaMock.product.findMany.mockReset();
        prismaMock.sellerWarehouse.findMany.mockReset();
        prismaMock.user.findUnique.mockReset();
        prismaMock.order.update.mockReset();
        prismaMock.order.findUnique.mockReset();
        prismaMock.order.findUniqueOrThrow.mockReset();
        prismaMock.vendorOrder.update.mockReset();
        prismaMock.vendorOrder.findUnique.mockReset();
        prismaMock.$transaction.mockReset();
    });
    (0, vitest_1.it)("allows torod orders without explicit shipping company (auto-pick)", async () => {
        prismaMock.product.findMany.mockResolvedValue([
            {
                id: 1,
                nameAr: "عطر",
                nameEn: "Perfume",
                stockQuantity: 5,
                status: "PUBLISHED",
                basePrice: new client_1.Prisma.Decimal(100),
                sizeMl: 100,
                weightKg: new client_1.Prisma.Decimal(0.5),
                sellerId: 5,
                sellerWarehouseId: 7,
            },
        ]);
        prismaMock.sellerWarehouse.findMany.mockResolvedValue([
            { id: 7, warehouseCode: "WH-7", cityId: 1 },
        ]);
        prismaMock.user.findUnique.mockResolvedValue({
            fullName: "Buyer",
            email: "buyer@example.com",
            phone: "+966555555555",
        });
        prismaMock.vendorOrder.findUnique.mockResolvedValue({
            id: 200,
            torodOrderId: "TOROD-1",
            trackingNumber: "TRK-1",
            labelUrl: "https://example.com/label.pdf",
            torodStatus: "created",
        });
        prismaMock.order.update.mockResolvedValue(buildOrderRecord());
        prismaMock.order.findUnique.mockResolvedValue(buildOrderRecord());
        prismaMock.order.findUniqueOrThrow.mockResolvedValue(buildOrderRecord());
        prismaMock.$transaction.mockImplementation(async (callback) => {
            const tx = {
                product: {
                    findMany: vitest_1.vi.fn().mockResolvedValue([
                        {
                            id: 1,
                            nameAr: "عطر",
                            nameEn: "Perfume",
                            stockQuantity: 5,
                            status: "PUBLISHED",
                        },
                    ]),
                    updateMany: vitest_1.vi.fn().mockResolvedValue({ count: 1 }),
                    findUnique: vitest_1.vi.fn(),
                },
                order: {
                    create: vitest_1.vi.fn().mockResolvedValue({
                        id: 100,
                        items: [{ id: 1001, productId: 1 }],
                    }),
                },
                vendorOrder: {
                    create: vitest_1.vi.fn().mockResolvedValue({
                        id: 200,
                        items: [{ productId: 1, quantity: 1, unitPrice: 100 }],
                    }),
                },
            };
            return callback(tx);
        });
        await (0, vitest_1.expect)((0, orderService_1.createOrder)({
            buyerId: 1,
            paymentMethod: "BANK_TRANSFER",
            shipping: {
                name: "Test User",
                phone: "+966 555555555",
                city: "Riyadh",
                region: "Riyadh",
                address: "Test Address",
                type: "torod",
                customerCountry: "SA",
                codCurrency: "SAR",
                torodCountryId: 1,
                torodRegionId: 10,
                torodCityId: 100,
                deferTorodShipment: false,
            },
            items: [
                {
                    productId: 1,
                    quantity: 1,
                },
            ],
        })).resolves.toBeTruthy();
    });
});
//# sourceMappingURL=orderService.shippingCompany.test.js.map