import { Prisma, OrderStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { normalizeProduct } from "./productService";
import { config } from "../config/env";

const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

const createOrderSchema = z.object({
  buyerId: z.number().int().positive(),
  paymentMethod: z.string().min(2),
  shipping: z
    .object({
      name: z.string().min(2),
      phone: z.string().min(6),
      city: z.string().min(2),
      region: z.string().min(2),
      address: z.string().min(3),
    })
    .optional(),
  items: z.array(orderItemSchema).min(1),
  discountAmount: z.number().nonnegative().default(0),
  shippingFee: z.number().nonnegative().default(0),
});

export const createOrder = async (input: z.infer<typeof createOrderSchema>) => {
  const data = createOrderSchema.parse(input);
  const shipping =
    data.shipping ?? {
      name: "Pending",
      phone: "0000000000",
      city: "Unknown",
      region: "Unknown",
      address: "Pending",
    };

  return prisma.$transaction(async (tx) => {
    // validate products and stock
    const products = await tx.product.findMany({
      where: {
        id: { in: data.items.map((item) => item.productId) },
      },
      select: {
        id: true,
        stockQuantity: true,
        status: true,
        basePrice: true,
      },
    });

    if (products.length !== data.items.length) {
      throw AppError.badRequest("One or more products are unavailable");
    }

    const subtotal = data.items.reduce((total, item) => {
      return total + item.unitPrice * item.quantity;
    }, 0);

    if (subtotal <= 0) {
      throw AppError.badRequest("Order subtotal must be greater than zero");
    }

    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw AppError.badRequest(`Product ${item.productId} not found`);
      }
      if (product.status !== "PUBLISHED") {
        throw AppError.badRequest(`Product ${item.productId} is not available`);
      }
      if (product.stockQuantity < item.quantity) {
        throw AppError.badRequest(
          `Insufficient stock for product ${item.productId}`
        );
      }
    }

    const order = await tx.order.create({
      data: {
        buyerId: data.buyerId,
        status: OrderStatus.PENDING,
        paymentMethod: data.paymentMethod,
        shippingName: shipping.name,
        shippingPhone: shipping.phone,
        shippingCity: shipping.city,
        shippingRegion: shipping.region,
        shippingAddress: shipping.address,
        subtotalAmount: new Prisma.Decimal(subtotal),
        discountAmount: new Prisma.Decimal(data.discountAmount),
        shippingFee: new Prisma.Decimal(data.shippingFee),
        totalAmount: new Prisma.Decimal(
          subtotal - data.discountAmount + data.shippingFee
        ),
        platformFee: new Prisma.Decimal(
          (subtotal - data.discountAmount + data.shippingFee) *
            config.platformCommissionRate
        ),
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalPrice: new Prisma.Decimal(item.unitPrice * item.quantity),
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // decrement stock
    for (const item of data.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    return mapOrderToDto(
      await tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: orderInclude,
      })
    );
  });
};

const orderInclude = Prisma.validator<Prisma.OrderInclude>()({
  items: {
    include: {
      product: {
        include: {
          images: {
            orderBy: { sortOrder: "asc" as const },
          },
        },
      },
    },
  },
});

const statusToFriendly = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.PENDING:
      return "pending";
    case OrderStatus.PROCESSING:
      return "seller_confirmed";
    case OrderStatus.SHIPPED:
      return "shipped";
    case OrderStatus.DELIVERED:
      return "completed";
    case OrderStatus.CANCELLED:
      return "canceled";
    case OrderStatus.REFUNDED:
      return "refunded";
    default:
      return (status as string).toLowerCase();
  }
};

const friendlyToStatus = (status: string): OrderStatus => {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case "pending":
      return OrderStatus.PENDING;
    case "seller_confirmed":
    case "processing":
      return OrderStatus.PROCESSING;
    case "shipped":
      return OrderStatus.SHIPPED;
    case "completed":
    case "delivered":
      return OrderStatus.DELIVERED;
    case "canceled":
    case "cancelled":
      return OrderStatus.CANCELLED;
    case "refunded":
      return OrderStatus.REFUNDED;
    default:
      throw AppError.badRequest("Unsupported status value");
  }
};

const mapOrderToDto = (order: Prisma.OrderGetPayload<{
  include: typeof orderInclude;
}>) => {
  const [item] = order.items;
  const product = item?.product ? normalizeProduct(item.product) : undefined;
  return {
    id: order.id,
    buyer_id: order.buyerId,
    product_id: item?.productId ?? null,
    quantity: item?.quantity ?? 0,
    unit_price: item ? Number(item.unitPrice) : 0,
    total_amount: Number(order.totalAmount ?? item?.totalPrice ?? 0),
    payment_method: order.paymentMethod,
    shipping_address: order.shippingAddress,
    status: statusToFriendly(order.status),
    created_at: order.createdAt.toISOString(),
    platform_fee: Number(order.platformFee ?? 0),
    product,
  };
};

export const listOrdersByUser = async (userId: number) => {
  const orders = await prisma.order.findMany({
    where: { buyerId: userId },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });

  return orders.map(mapOrderToDto);
};

export const listAllOrders = async (status?: string) => {
  const where: Prisma.OrderWhereInput = {};
  if (status) {
    where.status = friendlyToStatus(status);
  }

  const orders = await prisma.order.findMany({
    where,
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });

  return orders.map(mapOrderToDto);
};

export const listOrdersForSeller = async (sellerId: number, status?: string) => {
  const where: Prisma.OrderWhereInput = {
    items: {
      some: {
        product: {
          sellerId,
        },
      },
    },
  };

  if (status) {
    where.status = friendlyToStatus(status);
  }

  const orders = await prisma.order.findMany({
    where,
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });

  return orders
    .map(mapOrderToDto)
    .map((order) => ({
      ...order,
      product:
        order.product && order.product.seller_id === sellerId
          ? order.product
          : order.product,
    }));
};

export const updateOrderStatus = async (
  orderId: number,
  status: string,
  actorRoles: string[]
) => {
  const allowedStatuses: Array<{ from: OrderStatus[]; to: OrderStatus }> = [
    { from: [OrderStatus.PENDING], to: OrderStatus.PROCESSING },
    { from: [OrderStatus.PROCESSING], to: OrderStatus.SHIPPED },
    { from: [OrderStatus.SHIPPED], to: OrderStatus.DELIVERED },
    { from: [OrderStatus.PENDING, OrderStatus.PROCESSING], to: OrderStatus.CANCELLED },
  ];

  const nextStatus = friendlyToStatus(status);
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    throw AppError.notFound("Order not found");
  }

  const canUpdate = allowedStatuses.some((rule) =>
    rule.to === nextStatus && rule.from.includes(order.status)
  );

  if (!canUpdate && nextStatus !== OrderStatus.CANCELLED) {
    throw AppError.badRequest("Invalid status transition");
  }

  const isAdmin = actorRoles.some((role) =>
    ["ADMIN", "SUPER_ADMIN"].includes(role.toUpperCase())
  );
  const isSeller = actorRoles.some((role) => role.toUpperCase() === "SELLER");

  if (!isAdmin && nextStatus === OrderStatus.CANCELLED) {
    throw AppError.forbidden();
  }

  if (!isAdmin && !isSeller && nextStatus !== OrderStatus.DELIVERED) {
    throw AppError.forbidden();
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: nextStatus },
    include: orderInclude,
  });

  return mapOrderToDto(updated);
};
