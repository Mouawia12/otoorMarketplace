import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const prismaMock = vi.hoisted(() => ({
  product: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../prisma/client", () => ({
  prisma: prismaMock,
}));

import { createOrder } from "./orderService";

describe("orderService inventory validation", () => {
  beforeEach(() => {
    prismaMock.product.findMany.mockReset();
    prismaMock.$transaction.mockReset();
  });

  it("rejects the order before creation when stock is insufficient", async () => {
    prismaMock.product.findMany.mockResolvedValue([
      {
        id: 10,
        nameAr: "عطر تجريبي",
        nameEn: "Sample Perfume",
        stockQuantity: 1,
        status: "PUBLISHED",
        basePrice: new Prisma.Decimal(100),
        sizeMl: 100,
        weightKg: new Prisma.Decimal(0.3),
        sellerId: 5,
        sellerWarehouseId: 7,
      },
    ]);

    await expect(
      createOrder({
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
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "المخزون غير كافٍ لبعض المنتجات",
      details: {
        code: "INSUFFICIENT_STOCK",
        issues: [
          expect.objectContaining({
            productId: 10,
            reason: "INSUFFICIENT_STOCK",
            requestedQuantity: 2,
            availableQuantity: 1,
          }),
        ],
      },
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
