import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const prismaMock = vi.hoisted(() => ({
  product: {
    findMany: vi.fn(),
  },
  sellerWarehouse: {
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  order: {
    update: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  vendorOrder: {
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../prisma/client", () => ({
  prisma: prismaMock,
}));

vi.mock("./torodService", () => ({
  listCourierPartners: vi.fn().mockResolvedValue({
    data: [
      { id: 11, title: "Partner A", supports_prepaid: true },
      { id: 12, title: "Partner B", supports_prepaid: true },
    ],
  }),
  createOrder: vi.fn().mockResolvedValue({ id: "TOROD-1", trackingNumber: "TRK-1" }),
  shipOrder: vi.fn().mockResolvedValue({ status: "created", trackingNumber: "TRK-1" }),
  listOrderCourierPartners: vi.fn(),
  listWarehouses: vi.fn(),
}));

import { createOrder } from "./orderService";

describe("orderService torod shipping company validation", () => {
  const buildOrderRecord = () => ({
    id: 100,
    buyerId: 1,
    totalAmount: new Prisma.Decimal(100),
    paymentMethod: "BANK_TRANSFER",
    shippingAddress: "Test Address",
    shippingName: "Test User",
    shippingPhone: "+966 555555555",
    shippingCity: "Riyadh",
    shippingRegion: "Riyadh",
    shippingMethod: "torod",
    shippingFee: new Prisma.Decimal(0),
    discountAmount: new Prisma.Decimal(0),
    couponCode: null,
    status: "PENDING",
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    platformFee: new Prisma.Decimal(0),
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
        unitPrice: new Prisma.Decimal(100),
        totalPrice: new Prisma.Decimal(100),
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
        subtotalAmount: new Prisma.Decimal(100),
        discountAmount: new Prisma.Decimal(0),
        shippingFee: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(100),
        platformFee: new Prisma.Decimal(0),
        items: [
          {
            id: 300,
            orderItemId: 1001,
            productId: 1,
            quantity: 1,
            unitPrice: new Prisma.Decimal(100),
            totalPrice: new Prisma.Decimal(100),
          },
        ],
      },
    ],
  });

  beforeEach(() => {
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

  it("allows torod orders without explicit shipping company (auto-pick)", async () => {
    prismaMock.product.findMany.mockResolvedValue([
      {
        id: 1,
        nameAr: "عطر",
        nameEn: "Perfume",
        stockQuantity: 5,
        status: "PUBLISHED",
        basePrice: new Prisma.Decimal(100),
        sizeMl: 100,
        weightKg: new Prisma.Decimal(0.5),
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

    prismaMock.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        product: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 1,
              nameAr: "عطر",
              nameEn: "Perfume",
              stockQuantity: 5,
              status: "PUBLISHED",
            },
          ]),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUnique: vi.fn(),
        },
        order: {
          create: vi.fn().mockResolvedValue({
            id: 100,
            items: [{ id: 1001, productId: 1 }],
          }),
        },
        vendorOrder: {
          create: vi.fn().mockResolvedValue({
            id: 200,
            items: [{ productId: 1, quantity: 1, unitPrice: 100 }],
          }),
        },
      };
      return callback(tx);
    });

    await expect(
      createOrder({
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
      })
    ).resolves.toBeTruthy();
  });
});
