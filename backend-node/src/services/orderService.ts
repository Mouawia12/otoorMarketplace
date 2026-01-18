import { Prisma, OrderStatus, type Coupon } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { normalizeProduct } from "./productService";
import { config } from "../config/env";
import {
  prepareCouponForOrder,
  prepareCouponsForOrder,
  finalizeCouponUsage,
  finalizeCouponsUsage,
} from "./couponService";
import {
  createOrder as createTorodOrder,
  shipOrder as shipTorodOrder,
  trackShipment as trackTorodShipment,
  type TorodOrderPayload,
} from "./torodService";
import { executePayment, type ExecutePaymentInput } from "./myFatoorahService";

const orderItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive().optional(),
});

const listOrdersSchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  page_size: z.coerce.number().int().min(1).max(200).default(25).optional(),
  search: z.string().optional(),
  sellerId: z.coerce.number().optional(),
});

const normalizeShippingType = (value?: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "redbox" || normalized === "omni") {
    return "torod";
  }
  if (["standard", "express", "torod"].includes(normalized)) {
    return normalized as "standard" | "express" | "torod";
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
      region: shipping.region ?? shipping.city,
      address: shipping.address,
      type: normalizedType ?? shipping.type,
      customerCityCode:
        shipping.customerCityCode ??
        shipping.customer_city_code ??
        shipping.city,
      customerCountry:
        shipping.customerCountry ?? shipping.customer_country ?? "SA",
      codAmount: shipping.codAmount ?? shipping.cod_amount,
      codCurrency: shipping.codCurrency ?? shipping.cod_currency,
      torodShippingCompanyId:
        shipping.torodShippingCompanyId ??
        shipping.torod_shipping_company_id ??
        shipping.shippingCompanyId ??
        shipping.shipping_company_id,
      torodWarehouseId:
        shipping.torodWarehouseId ??
        shipping.torod_warehouse_id ??
        shipping.warehouseId ??
        shipping.warehouse_id,
      torodCountryId:
        shipping.torodCountryId ??
        shipping.torod_country_id ??
        shipping.countryId ??
        shipping.country_id,
      torodRegionId:
        shipping.torodRegionId ??
        shipping.torod_region_id ??
        shipping.regionId ??
        shipping.region_id,
      torodCityId:
        shipping.torodCityId ??
        shipping.torod_city_id ??
        shipping.cityId ??
        shipping.city_id,
      torodDistrictId:
        shipping.torodDistrictId ??
        shipping.torod_district_id ??
        shipping.districtId ??
        shipping.district_id,
      torodMetadata:
        shipping.torodMetadata ?? shipping.torod_metadata ?? shipping.metadata,
    };
  }
  return value;
}, z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
  city: z.string().min(2),
  region: z.string().min(2),
  address: z.string().min(3),
  type: z.enum(["standard", "express", "torod"]).default("standard"),
  customerCityCode: z.string().optional(),
  customerCountry: z.string().default("SA"),
  codAmount: z.coerce.number().nonnegative().optional(),
  codCurrency: z.string().default("SAR"),
  torodShippingCompanyId: z.string().optional(),
  torodWarehouseId: z.string().optional(),
  torodCountryId: z.string().optional(),
  torodRegionId: z.string().optional(),
  torodCityId: z.string().optional(),
  torodDistrictId: z.string().optional(),
  torodMetadata: z.record(z.string(), z.unknown()).optional(),
}));

const createOrderSchema = z.object({
  buyerId: z.number().int().positive(),
  paymentMethod: z.string().min(2),
  paymentMethodId: z.coerce.number().int().optional(),
  paymentMethodCode: z.string().min(1).optional(),
  shipping: shippingDetailsSchema.optional(),
  items: z.array(orderItemSchema).min(1),
  couponCode: z.string().min(3).optional(),
  couponCodes: z.array(z.string().min(3)).max(5).optional(),
});

export const createOrder = async (input: z.infer<typeof createOrderSchema>) => {
  const data = createOrderSchema.parse(input);
  if (!data.shipping) {
    throw AppError.badRequest("Shipping details are required");
  }

  const itemMap = new Map<number, { productId: number; quantity: number }>();
  for (const item of data.items) {
    const existing = itemMap.get(item.productId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      itemMap.set(item.productId, {
        productId: item.productId,
        quantity: item.quantity,
      });
    }
  }

  const aggregatedItems = Array.from(itemMap.values());
  if (aggregatedItems.length === 0) {
    throw AppError.badRequest("Order items are required");
  }

  const shipping = data.shipping;
  const normalizedPaymentMethod = data.paymentMethod.trim().toLowerCase();
  const isCodPayment = normalizedPaymentMethod === "cod";
  const isMyFatoorahPayment = normalizedPaymentMethod === "myfatoorah";
  const paymentMethodId = data.paymentMethodId;
  const shippingMethod = normalizeShippingType(shipping.type) ?? "standard";
  const requiresTorodShipment = shippingMethod === "torod";
  const shippingOption = shippingMethod === "express" ? "express" : "standard";

  if (requiresTorodShipment) {
    if (!shipping.torodCountryId) {
      throw AppError.badRequest("Torod country is required");
    }
    if (!shipping.torodRegionId) {
      throw AppError.badRequest("Torod region is required");
    }
    if (!shipping.torodCityId) {
      throw AppError.badRequest("Torod city is required");
    }
  }
  const shippingFeeValue =
    shippingOption === "express"
      ? config.shipping.express
      : config.shipping.standard;

  // validate products and stock
  const products = await prisma.product.findMany({
    where: {
      id: { in: aggregatedItems.map((item) => item.productId) },
    },
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      stockQuantity: true,
      status: true,
      basePrice: true,
      sellerId: true,
    },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));

  if (productMap.size !== aggregatedItems.length) {
    throw AppError.badRequest("One or more products are unavailable");
  }

  const subtotal = aggregatedItems.reduce((total, item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      throw AppError.badRequest(`Product ${item.productId} not found`);
    }
    return total + product.basePrice.toNumber() * item.quantity;
  }, 0);

  if (subtotal <= 0) {
    throw AppError.badRequest("Order subtotal must be greater than zero");
  }

  for (const item of aggregatedItems) {
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

  const normalizedItems = aggregatedItems.map((item) => {
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

  const couponLines = aggregatedItems.map((item) => {
    const product = productMap.get(item.productId)!;
    return {
      productId: item.productId,
      quantity: item.quantity,
      sellerId: product.sellerId,
      unitPrice: product.basePrice.toNumber(),
    };
  });

  let appliedCoupon: { coupon: Coupon; discountAmount: number } | null = null;
  let appliedCoupons: Array<{ coupon: Coupon; discountAmount: number }> = [];
  let appliedCouponCodes: string[] = [];

  if (data.couponCodes && data.couponCodes.length > 0) {
    const prepared = await prisma.$transaction((tx) =>
      prepareCouponsForOrder(tx, data.couponCodes!, couponLines)
    );
    appliedCoupons = prepared.coupons.map((entry) => ({
      coupon: entry.coupon,
      discountAmount: entry.discountAmount,
    }));
    appliedCouponCodes = appliedCoupons.map((entry) => entry.coupon.code);
  } else if (data.couponCode) {
    appliedCoupon = await prisma.$transaction((tx) =>
      prepareCouponForOrder(tx, data.couponCode!, couponLines)
    );
    if (appliedCoupon) {
      appliedCoupons = [appliedCoupon];
      appliedCouponCodes = [appliedCoupon.coupon.code];
    }
  }

  const discountAmount = appliedCoupons.reduce(
    (total, entry) => total + entry.discountAmount,
    0
  );
  const totalBeforeShipping = Math.max(0, subtotal - discountAmount);
  const totalAmount = totalBeforeShipping + shippingFeeValue;
  const platformFee =
    totalAmount * config.platformCommissionRate;
  const shouldRecordCod = shipping.codAmount !== undefined || isCodPayment;
  const codAmount =
    shipping.codAmount !== undefined
      ? shipping.codAmount
      : shouldRecordCod
      ? totalAmount
      : undefined;
  const codCurrency = shipping.codCurrency ?? "SAR";
  const customerCityCode = shipping.customerCityCode ?? shipping.city;
  const customerCountry = shipping.customerCountry ?? "SA";
  const torodShippingCompanyId = shipping.torodShippingCompanyId;
  const torodWarehouseId = shipping.torodWarehouseId;
  const torodCountryId = shipping.torodCountryId;
  const torodRegionId = shipping.torodRegionId;
  const torodCityId = shipping.torodCityId;
  const torodDistrictId = shipping.torodDistrictId;
  const torodMetadata = shipping.torodMetadata;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        buyerId: data.buyerId,
        status: OrderStatus.PENDING,
        paymentMethod: data.paymentMethod,
        myfatoorahMethodId: isMyFatoorahPayment ? paymentMethodId ?? null : null,
        myfatoorahMethodCode: isMyFatoorahPayment
          ? data.paymentMethodCode ?? null
          : null,
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
        couponId:
          appliedCoupon && appliedCoupons.length === 1
            ? appliedCoupon.coupon.id
            : null,
        couponCode:
          appliedCouponCodes.length > 0 ? appliedCouponCodes.join(",") : null,
        codAmount:
          codAmount !== undefined
            ? new Prisma.Decimal(codAmount)
            : null,
        codCurrency: codAmount !== undefined ? codCurrency : null,
        redboxPointId: null,
        redboxStatus: requiresTorodShipment ? "pending" : null,
        items: {
          create: normalizedItems,
        },
      },
      include: {
        items: true,
      },
    });

    for (const item of normalizedItems) {
      const updateResult = await tx.product.updateMany({
        where: {
          id: item.productId,
          stockQuantity: { gte: item.quantity },
          status: "PUBLISHED",
        },
        data: {
          stockQuantity: {
            decrement: item.quantity,
          },
        },
      });
      if (updateResult.count === 0) {
        throw AppError.badRequest(`Insufficient stock for product ${item.productId}`);
      }
    }

    return created;
  });

  let shipment;
  let torodOrder;
  if (requiresTorodShipment) {
    try {
      const baseMetadata = {
        orderId: order.id,
        buyerId: data.buyerId,
      };
      const metadata =
        torodMetadata && typeof torodMetadata === "object"
          ? { ...baseMetadata, ...(torodMetadata as Record<string, unknown>) }
          : baseMetadata;

      const torodOrderPayload: TorodOrderPayload = {
        reference: `order-${order.id}`,
        customer_name: shipping.name,
        customer_phone: shipping.phone,
        customer_address: shipping.address,
        customer_city: shipping.city,
        customer_region: shipping.region,
        customer_country: customerCountry,
        country_id: torodCountryId,
        region_id: torodRegionId,
        city_id: torodCityId,
        ...(torodDistrictId ? { district_id: torodDistrictId } : {}),
        payment_method: isCodPayment ? "COD" : "PREPAID",
        cod_amount: codAmount ?? 0,
        cod_currency: codCurrency,
        metadata,
        items: normalizedItems.map((item) => ({
          name: `Item-${item.productId}`,
          quantity: item.quantity,
          price: Number(item.unitPrice),
          sku: String(item.productId),
        })),
      };

      torodOrder = await createTorodOrder(torodOrderPayload);

      const shipmentPayload: Record<string, unknown> = {};
      if (torodShippingCompanyId) {
        shipmentPayload.shipping_company_id = torodShippingCompanyId;
      }
      if (torodWarehouseId) {
        shipmentPayload.warehouse_id = torodWarehouseId;
      }

      shipment = await shipTorodOrder(
        torodOrder.id,
        Object.keys(shipmentPayload).length > 0 ? shipmentPayload : undefined
      );
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

  if (appliedCoupons.length > 0) {
    await prisma.$transaction((tx) =>
      finalizeCouponsUsage(
        tx,
        appliedCoupons.map((entry) => entry.coupon)
      )
    );
  }

  let paymentUrl: string | null = null;
  if (isMyFatoorahPayment) {
    if (!paymentMethodId) {
      throw AppError.badRequest("payment_method_id is required");
    }
    const buyer = await prisma.user.findUnique({
      where: { id: data.buyerId },
      select: { fullName: true, email: true, phone: true },
    });
    const rawInvoiceItems = normalizedItems.map((item) => {
      const product = productMap.get(item.productId);
      const name = product?.nameEn ?? product?.nameAr ?? `Item-${item.productId}`;
      return {
        name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      };
    });
    const itemsTotal = rawInvoiceItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const invoiceItems =
      Math.abs(itemsTotal - totalAmount) <= 0.01 ? rawInvoiceItems : undefined;

    try {
      const paymentInput: ExecutePaymentInput = {
        paymentMethodId,
        invoiceValue: totalAmount,
        customerName: buyer?.fullName ?? shipping.name,
        customerMobile: buyer?.phone ?? shipping.phone,
        customerReference: `order-${order.id}`,
      };
      if (buyer?.email) {
        paymentInput.customerEmail = buyer.email;
      }
      if (invoiceItems) {
        paymentInput.items = invoiceItems;
      }
      const payment = await executePayment(paymentInput);
      paymentUrl = payment.paymentUrl;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          myfatoorahInvoiceId: payment.invoiceId,
          myfatoorahPaymentId: payment.paymentId ?? null,
          myfatoorahPaymentUrl: payment.paymentUrl,
          myfatoorahStatus: "initiated",
        },
      });
    } catch (error) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED, myfatoorahStatus: "failed" },
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
        "تعذر بدء عملية الدفع عبر MyFatoorah، حاول مرة أخرى.";
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

  const shipmentId = shipment?.id ?? torodOrder?.id;
  const trackingNumber =
    shipment?.trackingNumber ?? torodOrder?.trackingNumber ?? order.redboxTrackingNumber;
  const labelUrl = shipment?.labelUrl ?? order.redboxLabelUrl;
  const shipmentStatus = shipment?.status ?? torodOrder?.status ?? "created";

  const updatedOrder = shipment || torodOrder
    ? await prisma.order.update({
        where: { id: order.id },
        data: {
          redboxShipmentId: shipmentId ?? order.redboxShipmentId,
          redboxTrackingNumber: trackingNumber ?? order.redboxTrackingNumber,
          redboxLabelUrl: labelUrl ?? order.redboxLabelUrl,
          redboxStatus: shipmentStatus ?? "created",
        },
        include: orderInclude,
      })
    : await prisma.order.findUniqueOrThrow({
        where: { id: order.id },
        include: orderInclude,
      });

  const mapped = mapOrderToDto(updatedOrder);
  if (paymentUrl) {
    mapped.payment_url = paymentUrl;
  }
  return mapped;
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
    torod_shipment_id: order.redboxShipmentId ?? null,
    torod_tracking_number: order.redboxTrackingNumber ?? null,
    torod_label_url: order.redboxLabelUrl ?? null,
    torod_status: order.redboxStatus ?? null,
    payment_method_id: order.myfatoorahMethodId ?? null,
    payment_method_code: order.myfatoorahMethodCode ?? null,
    payment_status: order.myfatoorahStatus ?? null,
    payment_url: order.myfatoorahPaymentUrl ?? null,
    product: summaryItem?.product,
    items,
  };
};

const parseOrderIdFromReference = (reference?: string): number | null => {
  if (!reference) return null;
  const trimmed = reference.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  const match = trimmed.match(/(\d+)/g);
  if (!match) return null;
  const last = match[match.length - 1];
  const parsed = Number(last);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeStatusValue = (value?: string) => value?.trim().toLowerCase() ?? "";

const isPaidStatus = (invoiceStatus?: string, transactionStatus?: string) => {
  const normalized = normalizeStatusValue(transactionStatus) || normalizeStatusValue(invoiceStatus);
  return ["paid", "success", "successful", "succss", "completed"].includes(normalized);
};

const isFailedStatus = (invoiceStatus?: string, transactionStatus?: string) => {
  const normalized = normalizeStatusValue(transactionStatus) || normalizeStatusValue(invoiceStatus);
  return ["failed", "error", "declined", "expired", "cancelled", "canceled"].includes(normalized);
};

export const syncMyFatoorahPayment = async (payload: {
  paymentId?: string;
  invoiceId?: string;
  invoiceStatus?: string;
  transactionStatus?: string;
  customerReference?: string;
  raw?: unknown;
}) => {
  const orderIdFromReference = parseOrderIdFromReference(payload.customerReference);
  let order = orderIdFromReference
    ? await prisma.order.findUnique({
        where: { id: orderIdFromReference },
        include: orderInclude,
      })
    : null;

  if (!order && payload.invoiceId) {
    order = await prisma.order.findFirst({
      where: { myfatoorahInvoiceId: payload.invoiceId },
      include: orderInclude,
    });
  }

  if (!order && payload.paymentId) {
    order = await prisma.order.findFirst({
      where: { myfatoorahPaymentId: payload.paymentId },
      include: orderInclude,
    });
  }

  if (!order) {
    throw AppError.notFound("Order not found");
  }

  const paid = isPaidStatus(payload.invoiceStatus, payload.transactionStatus);
  const failed = isFailedStatus(payload.invoiceStatus, payload.transactionStatus);
  const statusText = payload.invoiceStatus ?? payload.transactionStatus ?? order.myfatoorahStatus ?? "pending";

  const updateData: Prisma.OrderUpdateInput = {
    myfatoorahStatus: statusText,
    ...(payload.invoiceId ? { myfatoorahInvoiceId: payload.invoiceId } : {}),
    ...(payload.paymentId ? { myfatoorahPaymentId: payload.paymentId } : {}),
  };

  if (paid && order.status === OrderStatus.PENDING) {
    updateData.status = OrderStatus.PROCESSING;
  }
  if (failed && order.status === OrderStatus.PENDING) {
    updateData.status = OrderStatus.CANCELLED;
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: updateData,
    include: orderInclude,
  });

  return {
    order: mapOrderToDto(updated),
    payment_status: paid ? "paid" : failed ? "failed" : "pending",
    raw: payload.raw ?? null,
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

type ListOrdersOptions = {
  status?: string;
  page?: number;
  page_size?: number;
  search?: string;
  sellerId?: number;
};

const buildOrdersSearchWhere = (search?: string): Prisma.OrderWhereInput | undefined => {
  if (!search) {
    return undefined;
  }
  const term = search.trim();
  if (!term) {
    return undefined;
  }
  const maybeId = Number(term);
  const numericFilters = Number.isNaN(maybeId)
    ? []
    : [
        { id: maybeId },
        { buyerId: maybeId },
      ];

  return {
    OR: [
      { shippingName: { contains: term } },
      { shippingPhone: { contains: term } },
      { couponCode: { contains: term } },
      {
        items: {
          some: {
            product: {
              OR: [
                { nameEn: { contains: term } },
                { nameAr: { contains: term } },
                { brand: { contains: term } },
              ],
            },
          },
        },
      },
      ...numericFilters,
    ],
  };
};

const mapOrdersForSeller = (orders: Prisma.OrderGetPayload<{ include: typeof orderInclude }>[], sellerId: number) =>
  orders.map((order) => {
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

export const listOrdersWithPagination = async (options: ListOrdersOptions = {}) => {
  const { status, page = 1, page_size = 25, search, sellerId } = listOrdersSchema.parse(
    options ?? {}
  );
  const where: Prisma.OrderWhereInput = {};

  if (status) {
    where.status = friendlyToStatus(status);
  }

  if (sellerId) {
    where.items = {
      some: {
        product: { sellerId },
      },
    };
  }

  const searchWhere = buildOrdersSearchWhere(search);
  if (searchWhere) {
    Object.assign(where, searchWhere);
  }

  const countsWhere: Prisma.OrderWhereInput = {
    ...(sellerId
      ? {
          items: {
            some: {
              product: { sellerId },
            },
          },
        }
      : {}),
    ...(searchWhere ?? {}),
  };

  const [total, orders, statusCounts] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * page_size,
      take: page_size,
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: countsWhere,
      _count: { status: true },
      orderBy: { status: "asc" },
    }),
  ]);

  const mapped = sellerId ? mapOrdersForSeller(orders, sellerId) : orders.map(mapOrderToDto);
  const status_counts = statusCounts.reduce<Record<string, number>>((acc, row) => {
    const count =
      typeof row._count === "object" && row._count ? row._count.status ?? 0 : 0;
    acc[statusToFriendly(row.status)] = count;
    return acc;
  }, {});

  return {
    orders: mapped,
    total,
    page,
    page_size,
    total_pages: Math.ceil(total / page_size),
    status_counts,
  };
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

  return mapOrdersForSeller(orders, sellerId);
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

  if (!order.redboxTrackingNumber || order.shippingMethod?.toLowerCase() !== "torod") {
    throw AppError.badRequest("لا توجد شحنة طُرُد مرتبطة بهذا الطلب");
  }

  const shipment = await trackTorodShipment(order.redboxTrackingNumber);
  const labelUrl = shipment.labelUrl || order.redboxLabelUrl || "";

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      redboxLabelUrl: labelUrl || order.redboxLabelUrl,
      redboxTrackingNumber:
        shipment.trackingNumber ?? order.redboxTrackingNumber,
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

  if (!order.redboxTrackingNumber) {
    throw AppError.badRequest("No Torod tracking number for this order");
  }

  const shipmentStatus = await trackTorodShipment(order.redboxTrackingNumber);

  const raw = shipmentStatus.raw as { activities?: unknown[]; events?: unknown[]; history?: unknown[] } | undefined;
  const activities =
    (Array.isArray(raw?.activities) && raw?.activities) ||
    (Array.isArray(raw?.events) && raw?.events) ||
    (Array.isArray(raw?.history) && raw?.history) ||
    [];

  const statusValue =
    shipmentStatus.status ?? order.redboxStatus ?? statusToFriendly(order.status);
  const trackingNumber =
    shipmentStatus.trackingNumber ??
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
