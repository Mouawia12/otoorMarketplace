import { Prisma, OrderStatus, type Coupon } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { normalizeProduct } from "./productService";
import { config } from "../config/env";
import {
  prepareCouponForOrder,
  finalizeCouponUsage,
} from "./couponService";
import {
  createShipmentAgency,
  createShipmentDirect,
  createOmniOrder,
  getActivities as getRedboxActivities,
  getLabel as getRedboxLabel,
  getStatus as getRedboxStatus,
  type RedboxShipmentPayload,
} from "./redboxService";

const orderItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive().optional(),
});

const normalizeShippingType = (value?: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (["standard", "express", "redbox", "omni"].includes(normalized)) {
    return normalized as "standard" | "express" | "redbox" | "omni";
  }
  return undefined;
};

const shippingDetailsSchema = z.preprocess((value) => {
  if (value && typeof value === "object") {
    const shipping = value as Record<string, unknown>;
    const normalizedType =
      normalizeShippingType(shipping.type) ??
      normalizeShippingType(shipping.shipping_method) ??
      normalizeShippingType(shipping.shippingMethod);
    return {
      name: shipping.name,
      phone: shipping.phone,
      city: shipping.city,
      region: shipping.region,
      address: shipping.address,
      type: normalizedType ?? shipping.type,
      redboxPointId:
        shipping.redboxPointId ??
        shipping.redbox_point_id ??
        shipping.point_id,
      redboxCityCode:
        shipping.redboxCityCode ??
        shipping.redbox_city_code ??
        shipping.customer_city_code ??
        shipping.customerCityCode ??
        shipping.city,
      customerCityCode:
        shipping.customerCityCode ??
        shipping.customer_city_code ??
        shipping.redbox_city_code ??
        shipping.city,
      customerCountry:
        shipping.customerCountry ?? shipping.customer_country ?? "SA",
      codAmount: shipping.codAmount ?? shipping.cod_amount,
      codCurrency: shipping.codCurrency ?? shipping.cod_currency,
      redboxType:
        shipping.redboxType ??
        shipping.redbox_type ??
        (shipping.type === "omni" ? "omni" : undefined),
      shipmentType:
        shipping.shipmentType ??
        shipping.shipment_type ??
        (shipping.type === "omni" ? "omni" : undefined),
    };
  }
  return value;
}, z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
  city: z.string().min(2),
  region: z.string().min(2),
  address: z.string().min(3),
  type: z.enum(["standard", "express", "redbox", "omni"]).default("standard"),
  redboxCityCode: z.string().optional(),
  redboxPointId: z.string().min(1, "RedBox point_id is required").optional(),
  customerCityCode: z.string().optional(),
  customerCountry: z.string().default("SA"),
  codAmount: z.coerce.number().nonnegative().optional(),
  codCurrency: z.string().default("SAR"),
  redboxType: z.enum(["redbox", "omni"]).default("redbox"),
  shipmentType: z.enum(["direct", "agency", "omni"]).default("direct"),
}));

const createOrderSchema = z.object({
  buyerId: z.number().int().positive(),
  paymentMethod: z.string().min(2),
  shipping: shippingDetailsSchema.optional(),
  items: z.array(orderItemSchema).min(1),
  couponCode: z.string().min(3).optional(),
});

export const createOrder = async (input: z.infer<typeof createOrderSchema>) => {
  const rawShipping = (input as { shipping?: Record<string, unknown> }).shipping ?? {};
  console.log("ORDER PAYLOAD:", input);
  console.log(
    "SHIPPING METHOD:",
    rawShipping.shipping_method ??
      rawShipping.shippingMethod ??
      rawShipping.type ??
      (input as { shipping_method?: unknown }).shipping_method
  );
  console.log(
    "REDBOX CITY:",
    rawShipping.redbox_city_code ??
      rawShipping.customer_city_code ??
      rawShipping.customerCityCode ??
      rawShipping.redboxCityCode
  );
  console.log(
    "REDBOX POINT:",
    rawShipping.redbox_point_id ??
      rawShipping.redboxPointId ??
      rawShipping.point_id ??
      rawShipping.pointId
  );
  console.log(
    "COD:",
    rawShipping.cod_amount ?? rawShipping.codAmount,
    rawShipping.cod_currency ?? rawShipping.codCurrency
  );

  const data = createOrderSchema.parse(input);
  if (!data.shipping) {
    throw AppError.badRequest("Shipping details are required");
  }

  const shipping = data.shipping;
  const shippingMethod = shipping.type ?? "standard";
  const normalizedShippingMethod = shippingMethod.toLowerCase();
  const requiresRedboxShipment =
    normalizedShippingMethod === "redbox" || normalizedShippingMethod === "omni";
  const redboxCityCode = shipping.redboxCityCode ?? shipping.customerCityCode;

  if (normalizedShippingMethod === "redbox") {
    if (!redboxCityCode) {
      throw AppError.badRequest("RedBox city is required");
    }
    if (!shipping.redboxPointId) {
      throw AppError.badRequest("RedBox point is required");
    }
    if (shipping.codAmount === undefined || Number.isNaN(shipping.codAmount)) {
      throw AppError.badRequest("Invalid COD data");
    }
    if (!shipping.codCurrency) {
      throw AppError.badRequest("Invalid COD data");
    }
  }

  const redboxPointId = shipping.redboxPointId;
  const shippingOption = shippingMethod === "express" ? "express" : "standard";
  const shippingFeeValue =
    shippingOption === "express"
      ? config.shipping.express
      : config.shipping.standard;

  // validate products and stock
  const products = await prisma.product.findMany({
    where: {
      id: { in: data.items.map((item) => item.productId) },
    },
    select: {
      id: true,
      stockQuantity: true,
      status: true,
      basePrice: true,
      sellerId: true,
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
    const basePriceNumber = product.basePrice.toNumber();
    const unitPrice = new Prisma.Decimal(basePriceNumber);
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice,
      totalPrice: unitPrice.mul(item.quantity),
    };
  });

  const couponLines = data.items.map((item) => {
    const product = productMap.get(item.productId)!;
    return {
      productId: item.productId,
      quantity: item.quantity,
      sellerId: product.sellerId,
      unitPrice: product.basePrice.toNumber(),
    };
  });

  let appliedCoupon: { coupon: Coupon; discountAmount: number } | null = null;
  if (data.couponCode) {
    appliedCoupon = await prisma.$transaction((tx) =>
      prepareCouponForOrder(tx, data.couponCode!, couponLines)
    );
  }

  const discountAmount = appliedCoupon?.discountAmount ?? 0;
  const totalBeforeShipping = Math.max(0, subtotal - discountAmount);
  const totalAmount = totalBeforeShipping + shippingFeeValue;
  const platformFee =
    totalAmount * config.platformCommissionRate;
  const shouldRecordCod =
    shipping.codAmount !== undefined ||
    data.paymentMethod.toLowerCase() === "cod";
  const codAmount =
    shipping.codAmount !== undefined
      ? shipping.codAmount
      : shouldRecordCod
      ? totalAmount
      : undefined;
  const codCurrency = shipping.codCurrency ?? "SAR";
  const customerCityCode =
    shipping.customerCityCode ?? shipping.redboxCityCode ?? shipping.city;
  const customerCountry = shipping.customerCountry ?? "SA";
  const redboxShipmentType = shipping.shipmentType ?? "direct";
  const redboxType =
    shipping.redboxType ??
    (shippingMethod === "omni" ? "omni" : "redbox");

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        buyerId: data.buyerId,
        status: OrderStatus.PENDING,
        paymentMethod: data.paymentMethod,
        shippingMethod,
        shippingName: shipping.name,
        shippingPhone: shipping.phone,
        shippingCity: shipping.city,
        shippingRegion: shipping.region,
        shippingAddress: shipping.address,
        customerCityCode,
        customerCountry,
        subtotalAmount: new Prisma.Decimal(subtotal),
        discountAmount: new Prisma.Decimal(discountAmount),
        shippingFee: new Prisma.Decimal(shippingFeeValue),
        totalAmount: new Prisma.Decimal(totalAmount),
        platformFee: new Prisma.Decimal(platformFee),
        couponId: appliedCoupon?.coupon.id ?? null,
        couponCode: appliedCoupon?.coupon.code ?? null,
        codAmount:
          codAmount !== undefined
            ? new Prisma.Decimal(codAmount)
            : null,
        codCurrency: codAmount !== undefined ? codCurrency : null,
        redboxPointId: redboxPointId ?? null,
        redboxStatus: requiresRedboxShipment ? "pending" : null,
        items: {
          create: normalizedItems,
        },
      },
      include: {
        items: true,
      },
    });

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

    return created;
  });

  let shipment;
  if (requiresRedboxShipment) {
    try {
      const shipmentPayload: RedboxShipmentPayload = {
        pointId: redboxPointId,
        reference: `order-${order.id}`,
        type: redboxType,
        customerCityCode,
        customerCountry,
        codAmount: codAmount ?? 0,
        codCurrency,
        metadata: {
          orderId: order.id,
          buyerId: data.buyerId,
        },
        receiver: {
          name: shipping.name,
          phone: shipping.phone,
          cityCode: customerCityCode,
          country: customerCountry,
          address: shipping.address,
        },
        items: normalizedItems.map((item) => ({
          name: `Item-${item.productId}`,
          quantity: item.quantity,
          price: Number(item.unitPrice),
        })),
      };

      if (redboxShipmentType === "agency") {
        shipment = await createShipmentAgency(shipmentPayload);
      } else if (redboxShipmentType === "omni" || redboxType === "omni") {
        shipment = await createOmniOrder(shipmentPayload);
      } else {
        shipment = await createShipmentDirect(shipmentPayload);
      }
    } catch (error) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED, redboxStatus: "failed" },
        });
        for (const item of normalizedItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                increment: item.quantity,
              },
            },
          });
        }
      });
      const friendlyMessage =
        "تعذر إنشاء الشحنة مع شركة التوصيل، حاول مرة أخرى أو اختر طريقة شحن أخرى.";
      if (error instanceof AppError) {
        throw new AppError(
          friendlyMessage,
          error.statusCode,
          error.details ?? error
        );
      }
      throw AppError.internal(friendlyMessage, error);
    }
  }

  if (appliedCoupon) {
    await prisma.$transaction((tx) =>
      finalizeCouponUsage(tx, appliedCoupon.coupon)
    );
  }

  const updatedOrder = shipment
    ? await prisma.order.update({
        where: { id: order.id },
        data: {
          redboxShipmentId: shipment.id,
          redboxTrackingNumber:
            shipment.trackingNumber ?? order.redboxTrackingNumber,
          redboxLabelUrl: shipment.labelUrl ?? order.redboxLabelUrl,
          redboxStatus: shipment.status ?? "created",
        },
        include: orderInclude,
      })
    : await prisma.order.findUniqueOrThrow({
        where: { id: order.id },
        include: orderInclude,
      });

  return mapOrderToDto(updatedOrder);
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

const assertOrderAccess = (
  order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>,
  userId: number,
  roles: string[]
) => {
  const normalizedRoles = roles.map((role) => role.toUpperCase());
  const isAdmin = normalizedRoles.some((role) =>
    ["ADMIN", "SUPER_ADMIN"].includes(role)
  );
  const isBuyer = order.buyerId === userId;
  const isSeller = order.items.some(
    (item) => item.product?.sellerId === userId
  );

  if (!isAdmin && !isBuyer && !isSeller) {
    throw AppError.forbidden();
  }
};

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
    discount_amount: Number(order.discountAmount ?? 0),
    coupon_code: order.couponCode ?? null,
    status: statusToFriendly(order.status),
    created_at: order.createdAt.toISOString(),
    platform_fee: Number(order.platformFee ?? 0),
    cod_amount: order.codAmount ? Number(order.codAmount) : null,
    cod_currency: order.codCurrency ?? null,
    customer_city_code: order.customerCityCode ?? null,
    customer_country: order.customerCountry ?? null,
    redbox_point_id: order.redboxPointId ?? null,
    redbox_shipment_id: order.redboxShipmentId ?? null,
    redbox_tracking_number: order.redboxTrackingNumber ?? null,
    redbox_label_url: order.redboxLabelUrl ?? null,
    redbox_status: order.redboxStatus ?? null,
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

export const getOrderLabel = async (
  orderId: number,
  actorId: number,
  actorRoles: string[]
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });

  if (!order) {
    throw AppError.notFound("Order not found");
  }

  assertOrderAccess(order, actorId, actorRoles);

  if (!order.redboxShipmentId) {
    throw AppError.badRequest("No RedBox shipment for this order");
  }

  const label = await getRedboxLabel(order.redboxShipmentId);
  const labelUrl =
    label.url ||
    label.labelUrl ||
    label.label_url ||
    label.link ||
    order.redboxLabelUrl ||
    "";

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      redboxLabelUrl: labelUrl || order.redboxLabelUrl,
    },
    include: orderInclude,
  });

  return {
    label_url: labelUrl || updated.redboxLabelUrl || null,
    tracking_number: updated.redboxTrackingNumber ?? null,
    order: mapOrderToDto(updated),
  };
};

export const getOrderTracking = async (
  orderId: number,
  actorId: number,
  actorRoles: string[]
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });

  if (!order) {
    throw AppError.notFound("Order not found");
  }

  assertOrderAccess(order, actorId, actorRoles);

  if (!order.redboxShipmentId) {
    throw AppError.badRequest("No RedBox shipment for this order");
  }

  const shipmentStatus = await getRedboxStatus(order.redboxShipmentId);

  let activities: unknown[] = [];
  try {
    const activityResponse = await getRedboxActivities(order.redboxShipmentId);
    activities = Array.isArray(activityResponse)
      ? activityResponse
      : (
          activityResponse as {
            activities?: unknown[];
          }
        )?.activities ?? [];
  } catch (error) {
    activities = [];
  }

  const statusValue =
    shipmentStatus.status ?? order.redboxStatus ?? statusToFriendly(order.status);
  const trackingNumber =
    shipmentStatus.trackingNumber ??
    (shipmentStatus.raw as { tracking_number?: string })?.tracking_number ??
    order.redboxTrackingNumber;

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      redboxStatus: statusValue,
      redboxTrackingNumber: trackingNumber,
    },
    include: orderInclude,
  });

  return {
    order_id: updated.id,
    shipment_id: updated.redboxShipmentId,
    tracking_number: trackingNumber,
    status: statusValue,
    activities,
    order: mapOrderToDto(updated),
  };
};
