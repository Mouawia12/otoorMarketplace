import { Prisma, OrderStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { normalizeProduct } from "./productService";
import { config } from "../config/env";

const orderItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive().optional(),
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
      type: z.enum(["standard", "express"]).optional(),
    })
    .optional(),
  items: z.array(orderItemSchema).min(1),
  discountAmount: z.coerce.number().nonnegative().default(0),
  shippingFee: z.coerce.number().nonnegative().default(0),
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
      type: "standard",
    };
  const shippingOption = shipping.type === "express" ? "express" : "standard";
  const shippingFeeValue =
    shippingOption === "express"
      ? config.shipping.express
      : config.shipping.standard;

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

    const productMap = new Map(products.map((product) => [product.id, product]));

    if (productMap.size !== data.items.length) {
      throw AppError.badRequest("One or more products are unavailable");
    }

    const subtotal = data.items.reduce((total, item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw AppError.badRequest(`Product ${item.productId} not found`);
      }
      return total + product.basePrice.toNumber() * item.quantity;
    }, 0);

    if (subtotal <= 0) {
      throw AppError.badRequest("Order subtotal must be greater than zero");
    }

    for (const item of data.items) {
      const product = productMap.get(item.productId);
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

    const normalizedItems = data.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = new Prisma.Decimal(product.basePrice.toNumber());
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        totalPrice: unitPrice.mul(item.quantity),
      };
    });

    const order = await tx.order.create({
      data: {
        buyerId: data.buyerId,
        status: OrderStatus.PENDING,
        paymentMethod: data.paymentMethod,
        shippingMethod: shippingOption,
        shippingName: shipping.name,
        shippingPhone: shipping.phone,
        shippingCity: shipping.city,
        shippingRegion: shipping.region,
        shippingAddress: shipping.address,
        subtotalAmount: new Prisma.Decimal(subtotal),
        discountAmount: new Prisma.Decimal(data.discountAmount),
        shippingFee: new Prisma.Decimal(shippingFeeValue),
        totalAmount: new Prisma.Decimal(
          subtotal - data.discountAmount + shippingFeeValue
        ),
        platformFee: new Prisma.Decimal(
          (subtotal - data.discountAmount + shippingFeeValue) *
            config.platformCommissionRate
        ),
        items: {
          create: normalizedItems,
        },
      },
      include: {
        items: true,
      },
    });

    // decrement stock
    for (const item of normalizedItems) {
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

const mapOrderToDto = (
  order: Prisma.OrderGetPayload<{
    include: typeof orderInclude;
  }>
) => {
  const items = order.items.map((item) => ({
    id: item.id,
    product_id: item.productId,
    quantity: item.quantity,
    unit_price: Number(item.unitPrice),
    total_price: Number(item.totalPrice),
    product: item.product ? normalizeProduct(item.product) : undefined,
  }));

  const [summaryItem] = items;

  return {
    id: order.id,
    buyer_id: order.buyerId,
    product_id: summaryItem?.product_id ?? null,
    quantity: summaryItem?.quantity ?? 0,
    unit_price: summaryItem?.unit_price ?? 0,
    total_amount: Number(order.totalAmount ?? summaryItem?.total_price ?? 0),
    payment_method: order.paymentMethod,
    shipping_address: order.shippingAddress,
    shipping_name: order.shippingName,
    shipping_phone: order.shippingPhone,
    shipping_city: order.shippingCity,
    shipping_region: order.shippingRegion,
    shipping_method: order.shippingMethod,
    shipping_fee: Number(order.shippingFee),
    status: statusToFriendly(order.status),
    created_at: order.createdAt.toISOString(),
    platform_fee: Number(order.platformFee ?? 0),
    product: summaryItem?.product,
    items,
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

  return orders.map((order) => {
    const dto = mapOrderToDto(order);
    const sellerItems = dto.items?.filter(
      (item) => item.product?.seller_id === sellerId
    );

    if (!sellerItems || sellerItems.length === 0) {
      return dto;
    }

    const [primary] = sellerItems;

    return {
      ...dto,
      product: primary?.product ?? dto.product,
      product_id: primary?.product_id ?? dto.product_id,
      quantity: sellerItems.reduce((total, item) => total + item.quantity, 0),
      unit_price: primary?.unit_price ?? dto.unit_price,
      items: sellerItems,
    };
  });
};

export const confirmOrderDelivery = async (orderId: number, buyerId: number) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });

  if (!order || order.buyerId !== buyerId) {
    throw AppError.notFound("Order not found");
  }

  if (order.status === OrderStatus.DELIVERED) {
    return mapOrderToDto(order);
  }

  if (order.status !== OrderStatus.SHIPPED) {
    throw AppError.badRequest("Order is not ready to be confirmed");
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.DELIVERED },
    include: orderInclude,
  });

  return mapOrderToDto(updated);
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
