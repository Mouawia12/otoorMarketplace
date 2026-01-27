"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const client_1 = require("@prisma/client");
const prismaMock = vitest_1.vi.hoisted(() => ({
    product: {
        findMany: vitest_1.vi.fn(),
    },
    $transaction: vitest_1.vi.fn(),
}));
vitest_1.vi.mock("../prisma/client", () => ({
    prisma: prismaMock,
}));
const orderService_1 = require("./orderService");
(0, vitest_1.describe)("orderService inventory validation", () => {
    (0, vitest_1.beforeEach)(() => {
        prismaMock.product.findMany.mockReset();
        prismaMock.$transaction.mockReset();
    });
    (0, vitest_1.it)("rejects the order before creation when stock is insufficient", async () => {
        prismaMock.product.findMany.mockResolvedValue([
            {
                id: 10,
                nameAr: "عطر تجريبي",
                nameEn: "Sample Perfume",
                stockQuantity: 1,
                status: "PUBLISHED",
                basePrice: new client_1.Prisma.Decimal(100),
                sizeMl: 100,
                weightKg: new client_1.Prisma.Decimal(0.3),
                sellerId: 5,
                sellerWarehouseId: 7,
            },
        ]);
        await (0, vitest_1.expect)((0, orderService_1.createOrder)({
            buyerId: 1,
            paymentMethod: "MYFATOORAH",
            shipping: {
                name: "Test Buyer",
                phone: "+966 555555555",
                city: "Riyadh",
                region: "Riyadh",
                address: "Test Address",
                type: "standard",
                customerCountry: "SA",
                codCurrency: "SAR",
            },
            items: [
                {
                    productId: 10,
                    quantity: 2,
                },
            ],
        })).rejects.toMatchObject({
            statusCode: 400,
            message: "المخزون غير كافٍ لبعض المنتجات",
            details: {
                code: "INSUFFICIENT_STOCK",
                issues: [
                    vitest_1.expect.objectContaining({
                        productId: 10,
                        reason: "INSUFFICIENT_STOCK",
                        requestedQuantity: 2,
                        availableQuantity: 1,
                    }),
                ],
            },
        });
        (0, vitest_1.expect)(prismaMock.$transaction).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=orderService.inventory.test.js.map